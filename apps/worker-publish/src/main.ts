/**
 * worker-publish — Nest standalone, обрабатывает очередь publish-listing через BullMQ.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: process.env.APP_ENV === 'stage' ? '.env.stage' : '.env' });

import { NestFactory } from '@nestjs/core';
import { createLogger } from '@seller/shared';
import { WorkerPublishModule } from './worker-publish.module.js';

const log = createLogger('WorkerPublish');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerPublishModule, {
    logger: false,
  });
  log.i('Started, queue=publish-listing');
  await app.init();
}

bootstrap().catch((err) => {
  log.e('Bootstrap failed:', err);
  process.exit(1);
});
