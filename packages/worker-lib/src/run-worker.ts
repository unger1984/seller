/**
 * Bootstrap BullMQ Worker: создание, события, graceful shutdown.
 */
import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { createLogger } from '@seller/shared';
import { createRedisConnection } from './connection.js';

export type Processor = (job: Job) => Promise<unknown>;

export function runWorker(
  queueName: string,
  processor: Processor,
  concurrency: number,
  logLabel: string
): void {
  const log = createLogger(logLabel);
  const connection = createRedisConnection();

  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
  });

  worker.on('completed', (job) => {
    log.i(`${job.name} ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    log.e(`${job?.name} ${job?.id} failed:`, err);
  });

  let cleaningUp = false;

  async function cleanup() {
    if (cleaningUp) return;
    cleaningUp = true;
    await worker.close();
    await connection.quit();
  }

  process.on('SIGINT', async () => {
    log.i('SIGINT received, shutting down');
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log.i('SIGTERM received, shutting down');
    await cleanup();
    process.exit(0);
  });

  log.i(`Started, queue=${queueName} concurrency=${concurrency}`);
}
