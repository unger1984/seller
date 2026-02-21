/**
 * Воркер импорта каталога — оркестрация job, валидация, делегирование в сервисы.
 * Job: import-catalog. Делегирует OzonImportService / WbImportService по marketplace.
 */
import { Inject, Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { Redis as RedisType } from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marketplace, MarketAccount } from '@seller/typeorm';
import { createLogger } from '@seller/shared';
import { credentialsDecrypt } from '@seller/shared';
import {
  type ImportCatalogJobData,
  IMPORT_ACTIVE_PREFIX,
  SYNC_IMPORT_DONE_CHANNEL,
} from '@seller/domain';
import { OzonImportService } from './ozon-import.service';
import { WbImportService } from './wb-import.service';
import { WORKER_REDIS_TOKEN } from '../../shared/tokens';

@Injectable()
@Processor('import-catalog', {
  concurrency: parseInt(process.env.IMPORT_CONCURRENCY ?? '2', 10),
})
export class ImportProcessor extends WorkerHost {
  private readonly log = createLogger(ImportProcessor.name);

  constructor(
    @InjectRepository(MarketAccount)
    private readonly accountRepo: Repository<MarketAccount>,
    private readonly ozonImport: OzonImportService,
    private readonly wbImport: WbImportService,
    @Inject(WORKER_REDIS_TOKEN) private readonly redis: RedisType
  ) {
    super();
  }

  async process(
    job: Job<ImportCatalogJobData>
  ): Promise<{ status: string; created: number; updated: number }> {
    const { marketAccountId, companyId } = job.data;
    this.log.i('Job получен', { jobId: job.id, marketAccountId, companyId });

    const clearImportActive = async () => {
      const key = `${IMPORT_ACTIVE_PREFIX}${marketAccountId}`;
      await this.redis.del(key);
    };

    const timeoutMs = parseInt(
      process.env.IMPORT_JOB_TIMEOUT_MS ?? '60000',
      10
    );
    const runWithTimeout = <T>(promise: Promise<T>) =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Таймаут импорта (${timeoutMs / 1000} с)`)),
            timeoutMs
          )
        ),
      ]);

    try {
      const account = await this.accountRepo.findOne({
        where: { id: marketAccountId, companyId },
      });
      if (!account) {
        throw new Error('Аккаунт маркетплейса не найден');
      }

      const encKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
      if (!encKey) {
        throw new Error('CREDENTIALS_ENCRYPTION_KEY не задан');
      }

      const credentialsJson = credentialsDecrypt(
        account.credentialsEncrypted,
        encKey
      );
      const credentials = JSON.parse(credentialsJson) as
        | { clientId: string; apiKey: string }
        | { apiKey: string };

      let created = 0;
      let updated = 0;

      if (account.marketplace === Marketplace.OZON) {
        const result = await runWithTimeout(
          this.ozonImport.run(
            companyId,
            marketAccountId,
            credentials as { clientId: string; apiKey: string }
          )
        );
        created = result.created;
        updated = result.updated;
      } else if (account.marketplace === Marketplace.WILDBERRIES) {
        const result = await runWithTimeout(
          this.wbImport.run(
            companyId,
            marketAccountId,
            credentials as { apiKey: string }
          )
        );
        created = result.created;
        updated = result.updated;
      } else {
        throw new Error(`Неподдерживаемый маркетплейс: ${account.marketplace}`);
      }

      const result = { status: 'ok' as const, created, updated };
      await this.publishImportDone(job.id, companyId, marketAccountId, result);
      this.log.i('Job завершён успешно', {
        jobId: job.id,
        marketAccountId,
        created,
        updated,
      });
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.log.e('Job завершён с ошибкой', {
        jobId: job.id,
        marketAccountId,
        error: errorMsg,
      });
      await this.publishImportDone(job.id, companyId, marketAccountId, {
        status: 'failed',
        error: errorMsg,
      });
      throw err;
    } finally {
      await clearImportActive();
    }
  }

  private async publishImportDone(
    jobId: string | undefined,
    companyId: string,
    marketAccountId: string,
    payload:
      | { status: 'ok'; created: number; updated: number }
      | { status: 'failed'; error: string }
  ): Promise<void> {
    await this.redis.publish(
      SYNC_IMPORT_DONE_CHANNEL,
      JSON.stringify({
        companyId,
        marketAccountId,
        jobId: String(jobId ?? ''),
        ...payload,
      })
    );
  }
}
