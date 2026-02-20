/**
 * worker-email — Nest standalone, обрабатывает очередь email через BullMQ.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: process.env.APP_ENV === 'stage' ? '.env.stage' : '.env' });

import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { createLogger } from '@seller/shared';
import {
  createBullQueueMetrics,
  startMetricsServer,
} from '@seller/worker-metrics';
import { QUEUE_NAMES } from '@seller/domain';
import { WorkerEmailModule } from './worker-email.module.js';

const log = createLogger('WorkerEmail');

const METRICS_PORT = parseInt(process.env.METRICS_PORT ?? '9090', 10);

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerEmailModule, {
    logger: false,
  });
  await app.init();

  const queue = app.get(getQueueToken(QUEUE_NAMES.EMAIL));
  const register = createBullQueueMetrics(queue, 'email');
  startMetricsServer(METRICS_PORT, register);

  log.i('Started, queue=email, metrics=/metrics');
}

bootstrap().catch((err) => {
  log.e('Bootstrap failed:', err);
  process.exit(1);
});
