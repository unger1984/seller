/**
 * Модуль worker-import: BullMQ + ImportProcessor.
 */
import { createRequire } from 'node:module';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@seller/domain';
import { ImportProcessor } from './import.processor.js';

const require = createRequire(import.meta.url);
const Redis = require('ioredis');

function getRedisConnection(): InstanceType<typeof Redis> {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Redis(url, { maxRetriesPerRequest: null });
}

@Module({
  imports: [
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.IMPORT_CATALOG,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    }),
  ],
  providers: [ImportProcessor],
})
export class WorkerImportModule {}
