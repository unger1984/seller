/**
 * Модуль worker-import: BullMQ + ImportProcessor.
 */
import { createRequire } from 'node:module';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createLogger } from '@seller/shared';
import { QUEUE_NAMES } from '@seller/domain';
import {
  SellerTypeOrmModule,
  MarketAccount,
  Product,
  ProductOzon,
  ProductWb,
} from '@seller/typeorm';
import { ImportProcessor } from './import.processor.js';
import { OzonImportService } from './services/ozon-import.service.js';
import { WbImportService } from './services/wb-import.service.js';
import { WORKER_REDIS_TOKEN } from './tokens.js';

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
    TypeOrmModule.forFeature([MarketAccount, Product, ProductOzon, ProductWb]),
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
    OzonImportService,
    WbImportService,
    ImportProcessor,
  ],
  exports: [WORKER_REDIS_TOKEN],
})
export class WorkerImportModule {}
