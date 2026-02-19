/**
 * Импорт каталога с маркетплейса.
 * TODO: Ozon/WB API client, создание MatchCandidate.
 */
import type { Job } from 'bullmq';
import { createLogger } from '@seller/shared';
import type { ImportCatalogJobData } from '@seller/domain';

const log = createLogger('ImportProcessor');

export async function processImportCatalog(
  job: Job<ImportCatalogJobData>
): Promise<{ status: string }> {
  const { marketAccountId, companyId } = job.data;
  // Stub: логируем, реальная реализация — вызов API маркетплейса
  log.i(`marketAccountId=${marketAccountId} companyId=${companyId}`, {
    marketAccountId,
    companyId,
  });
  return { status: 'stub' };
}
