/**
 * BullMQ worker — обработка очередей sync.
 */
import { createRequire } from 'node:module';
import { Worker } from 'bullmq';

const require = createRequire(import.meta.url);
const Redis = require('ioredis');
import { logger } from '@seller/shared';
import { QUEUE_NAMES, JOB_NAMES } from './queues.js';
import { processImportCatalog } from './processors/import.processor.js';
import { processPublishListing } from './processors/publish.processor.js';
import { processSyncStock } from './processors/sync-stock.processor.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new Redis(REDIS_URL, {
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

let cleaningUp = false;

async function cleanup() {
  if (cleaningUp) return;
  cleaningUp = true;
  await worker.close();
  await connection.quit();
}

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down worker');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down worker');
  await cleanup();
  process.exit(0);
});

logger.info('Worker started, listening for jobs');
