/**
 * Синхронизация остатков — push master → площадка или import.
 * При реализации: использовать shouldSkipStockUpdateOnImport из @seller/shared для защиты от ping-pong.
 * TODO: origin tracking (hash comparison), API вызовы.
 */
import type { Job } from 'bullmq';
import { logger } from '@seller/shared';
import type { SyncStockJobData } from '../queues.js';

export async function processSyncStock(job: Job<SyncStockJobData>) {
  const { listingId, companyId } = job.data;
  // Stub
  logger.info(`[sync-stock] listingId=${listingId} companyId=${companyId}`);
  return { status: 'stub' };
}
