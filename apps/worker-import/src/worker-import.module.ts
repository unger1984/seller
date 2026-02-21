/**
 * Модуль worker-import: BullMQ + ImportProcessor.
 * Импортирует ImportModule (WbImportService, OzonImportService) и IntegrationsModule (фабрики API).
 */
import { createRequire } from 'node:module';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createLogger } from '@seller/shared';
import { QUEUE_NAMES } from '@seller/domain';
import { SellerTypeOrmModule, MarketAccount } from '@seller/typeorm';
import { ImportModule } from './modules/import/import.module';
import { ImportProcessor } from './modules/import/import.processor';
import { WORKER_REDIS_TOKEN } from './shared/tokens';

const log = createLogger('WorkerImportModule');
const require = createRequire(import.meta.url);
const Redis = require('ioredis');

function getRedisConnection(): InstanceType<typeof Redis> {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const conn = new Redis(url, { maxRetriesPerRequest: null });
  conn.on('error', (err: Error) =>
    log.e('Redis error', { error: err.message })
  );
  return conn;
}

@Module({
  imports: [
    ImportModule,
    SellerTypeOrmModule.forRootAsync({
      useFactory: () => ({
        databaseUrl:
          process.env.DATABASE_URL ??
          'postgresql://seller:seller@localhost:5432/seller',
      }),
    }),
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
    TypeOrmModule.forFeature([MarketAccount]),
  ],
  providers: [
    {
      provide: WORKER_REDIS_TOKEN,
      useFactory: (): InstanceType<typeof Redis> => {
        const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
        const conn = new Redis(url, { maxRetriesPerRequest: null });
        conn.on('error', (err: Error) =>
          log.e('Redis error', { error: err.message })
        );
        return conn;
      },
    },
    ImportProcessor,
  ],
  exports: [WORKER_REDIS_TOKEN],
})
export class WorkerImportModule {}
