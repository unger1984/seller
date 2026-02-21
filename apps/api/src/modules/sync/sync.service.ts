/** Сервис синхронизации — постановка jobs, история (stub) */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createLogger } from '@seller/shared';
import { MarketAccount } from '@seller/typeorm';
import { SyncQueueService } from './sync-queue.service.js';
import type { ImportCatalogInput } from '@seller/shared-types';
import { IMPORT_ACTIVE_PREFIX, type ImportActivePayload } from '@seller/domain';
import type { RedisClient } from '../../shared/redis/redis.module.js';
import { REDIS_TOKEN } from '../../shared/redis/redis.module.js';

export type ImportStatusItem = {
  active: boolean;
  jobId?: string;
};

export type ImportStatusResponse = Record<string, ImportStatusItem>;

@Injectable()
export class SyncService {
  private readonly log = createLogger(SyncService.name);

  constructor(
    @InjectRepository(MarketAccount)
    private readonly accountRepo: Repository<MarketAccount>,
    private readonly queue: SyncQueueService,
    @Inject(REDIS_TOKEN) private readonly redis: RedisClient
  ) {}

  /** Запустить импорт каталога */
  async importCatalog(companyId: string, data: ImportCatalogInput) {
    this.log.i('Import catalog: validating account', {
      companyId,
      marketAccountId: data.marketAccountId,
    });
    const account = await this.accountRepo.findOne({
      where: { id: data.marketAccountId, companyId },
    });
    if (!account) {
      this.log.w('Import catalog: account not found', {
        companyId,
        marketAccountId: data.marketAccountId,
      });
      throw new NotFoundException('Аккаунт маркетплейса не найден');
    }
    const result = await this.queue.addImportCatalog({
      marketAccountId: data.marketAccountId,
      companyId,
    });
    this.log.i('Import catalog: job enqueued', {
      jobId: result.jobId,
      marketAccountId: data.marketAccountId,
      companyId,
    });
    return result;
  }

  /** Статус импорта по маркетам компании */
  async getImportStatus(companyId: string): Promise<ImportStatusResponse> {
    const accounts = await this.accountRepo.find({
      where: { companyId },
      select: ['id'],
    });
    const result: ImportStatusResponse = {};
    for (const acc of accounts) {
      const key = `${IMPORT_ACTIVE_PREFIX}${acc.id}`;
      const raw = await this.redis.get(key);
      if (raw) {
        try {
          const payload = JSON.parse(raw) as ImportActivePayload;
          result[acc.id] = { active: true, jobId: payload.jobId };
        } catch {
          result[acc.id] = { active: true };
        }
      } else {
        result[acc.id] = { active: false };
      }
    }
    return result;
  }

  /** История jobs — stub, BullMQ не хранит историю по умолчанию */
  async listJobs(
    _companyId: string,
    _query: { page?: number; limit?: number }
  ) {
    return { items: [], total: 0, page: 1, limit: 20 };
  }

  /** Детали job — stub */
  async getJob(_companyId: string, _jobId: string) {
    throw new NotFoundException('Задача не найдена');
  }
}
