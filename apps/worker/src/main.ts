/**
 * BullMQ worker — обработка очередей sync.
 */
import IORedis from 'ioredis';
import { Worker } from 'bullmq';
import { logger } from '@seller/shared';
import { QUEUE_NAMES, JOB_NAMES } from './queues';
import { processImportCatalog } from './processors/import.processor';
import { processPublishListing } from './processors/publish.processor';
import { processSyncStock } from './processors/sync-stock.processor';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  QUEUE_NAMES.SYNC,
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.IMPORT_CATALOG:
        return processImportCatalog(job as never);
      case JOB_NAMES.PUBLISH_LISTING:
        return processPublishListing(job as never);
      case JOB_NAMES.SYNC_STOCK:
        return processSyncStock(job as never);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection, concurrency: 5 }
);

worker.on('completed', (job) => {
  logger.info(`[worker] ${job.name} ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`[worker] ${job?.name} ${job?.id} failed:`, err);
});

logger.info('Worker started, listening for jobs');
