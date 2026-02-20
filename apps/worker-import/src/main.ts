/**
 * worker-import — Nest standalone, обрабатывает очередь import-catalog через BullMQ.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: process.env.APP_ENV === 'stage' ? '.env.stage' : '.env' });

import { NestFactory } from '@nestjs/core';
import { createLogger } from '@seller/shared';
import { WorkerImportModule } from './worker-import.module.js';

const log = createLogger('WorkerImport');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerImportModule, {
    logger: false,
  });
  log.i('Started, queue=import-catalog');
  await app.init();
}

bootstrap().catch((err) => {
  log.e('Bootstrap failed:', err);
  process.exit(1);
});
