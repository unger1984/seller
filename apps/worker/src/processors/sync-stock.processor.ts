/**
 * Синхронизация остатков — push master → площадка или import.
 * При реализации: использовать shouldSkipStockUpdateOnImport из @seller/shared для защиты от ping-pong.
 * TODO: origin tracking (hash comparison), API вызовы.
 */
import type { Job } from 'bullmq';
import { createLogger } from '@seller/shared';
import type { SyncStockJobData } from '../queues.js';

const log = createLogger('SyncStockProcessor');

export async function processSyncStock(job: Job<SyncStockJobData>) {
  const { listingId, companyId } = job.data;
  // Stub
  log.i(`listingId=${listingId} companyId=${companyId}`, {
    listingId,
    companyId,
  });
  return { status: 'stub' };
}
