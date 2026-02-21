/**
 * worker-import — Nest standalone, обрабатывает очередь import-catalog через BullMQ.
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
import { WorkerImportModule } from './worker-import.module.js';

const log = createLogger('WorkerImport');

const METRICS_PORT = parseInt(process.env.METRICS_PORT ?? '9090', 10);

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(WorkerImportModule, {
      logger: false,
    });
    await app.init();

    const queue = app.get(getQueueToken(QUEUE_NAMES.IMPORT_CATALOG));
    const register = createBullQueueMetrics(queue, 'import');
    startMetricsServer(METRICS_PORT, register);

    log.i('Started, queue=import-catalog, metrics=/metrics');
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
