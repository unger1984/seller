/**
 * Модуль worker-email: BullMQ + EmailModule.
 */
import { createRequire } from 'node:module';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@seller/domain';
import { EmailModule } from '@seller/email-module';
import { createRedisProvider } from './redis.provider.js';
import { EmailProcessor } from './email.processor.js';

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
      name: QUEUE_NAMES.EMAIL,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    }),
    EmailModule.forRoot(),
  ],
  providers: [createRedisProvider(), EmailProcessor],
})
export class WorkerEmailModule {}
