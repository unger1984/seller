/**
 * BullMQ worker — синхронизация остатков листинга.
 */
import { QUEUE_NAMES } from '@seller/domain';
import { runWorker, processSyncStock } from '@seller/worker-lib';

runWorker(
  QUEUE_NAMES.SYNC_STOCK,
  (job) => processSyncStock(job as never),
  5,
  'WorkerSyncStock'
);
