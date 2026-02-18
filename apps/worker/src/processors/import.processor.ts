/**
 * Импорт каталога с маркетплейса.
 * TODO: Ozon/WB API client, создание MatchCandidate.
 */
import type { Job } from 'bullmq';
import { logger } from '@seller/shared';
import type { ImportCatalogJobData } from '../queues';

export async function processImportCatalog(job: Job<ImportCatalogJobData>) {
  const { marketAccountId, companyId } = job.data;
  // Stub: логируем, реальная реализация — вызов API маркетплейса
  logger.info(
    `[import-catalog] marketAccountId=${marketAccountId} companyId=${companyId}`
  );
  return { status: 'stub' };
}
