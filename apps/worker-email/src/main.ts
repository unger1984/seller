/**
 * worker-email — Nest standalone, обрабатывает очередь email через BullMQ.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: process.env.APP_ENV === 'stage' ? '.env.stage' : '.env' });

import { NestFactory } from '@nestjs/core';
import { createLogger } from '@seller/shared';
import { WorkerEmailModule } from './worker-email.module.js';

const log = createLogger('WorkerEmail');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerEmailModule, {
    logger: false,
  });
  log.i('Started, queue=email');
  await app.init();
}

bootstrap().catch((err) => {
  log.e('Bootstrap failed:', err);
  process.exit(1);
});
