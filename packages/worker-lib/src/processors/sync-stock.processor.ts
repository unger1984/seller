/**
 * Синхронизация остатков — push master → площадка или import.
 * При реализации: использовать shouldSkipStockUpdateOnImport из @seller/shared для защиты от ping-pong.
 * TODO: origin tracking (hash comparison), API вызовы.
 */
import type { Job } from 'bullmq';
import { createLogger } from '@seller/shared';
import type { SyncStockJobData } from '@seller/domain';

const log = createLogger('SyncStockProcessor');

export async function processSyncStock(
  job: Job<SyncStockJobData>
): Promise<{ status: string }> {
  const { listingId, companyId } = job.data;
  // Stub
  log.i(`listingId=${listingId} companyId=${companyId}`, {
    listingId,
    companyId,
  });
  return { status: 'stub' };
}
