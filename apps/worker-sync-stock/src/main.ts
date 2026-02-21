/**
 * worker-sync-stock — Nest standalone, обрабатывает очередь sync-stock через BullMQ.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: process.env.APP_ENV === 'stage' ? '.env.stage' : '.env' });

import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { createLogger } from '@seller/shared';
import { QUEUE_NAMES } from '@seller/domain';
import { WorkerSyncStockModule } from './worker-sync-stock.module.js';

const log = createLogger('WorkerSyncStock');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    WorkerSyncStockModule,
    {
      logger: false,
    }
  );
  await app.init();

  app.get(getQueueToken(QUEUE_NAMES.SYNC_STOCK));

  log.i('Started, queue=sync-stock');
}

bootstrap().catch((err) => {
  log.e('Bootstrap failed:', err);
  process.exit(1);
});
