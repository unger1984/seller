/**
 * worker-import — Nest standalone, обрабатывает очередь import-catalog через BullMQ.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: process.env.APP_ENV === 'stage' ? '.env.stage' : '.env' });

import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { createLogger } from '@seller/shared';
import { QUEUE_NAMES } from '@seller/domain';
import { WorkerImportModule } from './worker-import.module.js';

const log = createLogger('WorkerImport');

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(WorkerImportModule, {
      logger: false,
    });
    await app.init();

    app.get(getQueueToken(QUEUE_NAMES.IMPORT_CATALOG));

    log.i('Started, queue=import-catalog');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log.e('Bootstrap failed', { error: msg, stack });
    throw err;
  }
}

bootstrap().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  log.e('Bootstrap failed', { error: msg, stack });
  setTimeout(() => process.exit(1), 100);
});
