/**
 * worker-publish — Nest standalone, обрабатывает очередь publish-listing через BullMQ.
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
import { WorkerPublishModule } from './worker-publish.module.js';

const log = createLogger('WorkerPublish');

const METRICS_PORT = parseInt(process.env.METRICS_PORT ?? '9090', 10);

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerPublishModule, {
    logger: false,
  });
  await app.init();

  const queue = app.get(getQueueToken(QUEUE_NAMES.PUBLISH_LISTING));
  const register = createBullQueueMetrics(queue, 'publish');
  startMetricsServer(METRICS_PORT, register);

  log.i('Started, queue=publish-listing, metrics=/metrics');
}

bootstrap().catch((err) => {
  log.e('Bootstrap failed:', err);
  process.exit(1);
});
