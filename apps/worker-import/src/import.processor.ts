/**
 * Импорт каталога с маркетплейса.
 * TODO: Ozon/WB API client, создание MatchCandidate.
 */
import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { createLogger } from '@seller/shared';
import type { ImportCatalogJobData } from '@seller/domain';

const log = createLogger('ImportProcessor');

@Injectable()
@Processor('import-catalog', {
  concurrency: parseInt(process.env.IMPORT_CONCURRENCY ?? '2', 10),
})
export class ImportProcessor extends WorkerHost {
  async process(job: Job<ImportCatalogJobData>): Promise<{ status: string }> {
    const { marketAccountId, companyId } = job.data;
    log.i(`marketAccountId=${marketAccountId} companyId=${companyId}`, {
      marketAccountId,
      companyId,
    });
    return { status: 'stub' };
  }
}
