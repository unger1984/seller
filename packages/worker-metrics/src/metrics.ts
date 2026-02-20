/**
 * BullMQ metrics для Prometheus: waiting, active, failed, completed, duration.
 * Labels — только queue (низкая кардинальность).
 */
import { createRequire } from 'node:module';
import http from 'node:http';
import type { Queue } from 'bullmq';
import { QueueEvents } from 'bullmq';
import { Registry, Gauge, Counter, collectDefaultMetrics } from 'prom-client';

const require = createRequire(import.meta.url);
const Redis = require('ioredis');

const POLL_INTERVAL_MS = 15_000;
const QUEUE_LABEL = 'queue';

/**
 * Создаёт метрики для BullMQ очереди и запускает опрос getJobCounts + подписку на events.
 * @param queue — экземпляр Queue из @nestjs/bullmq
 * @param queueLabel — короткое имя для label (import, publish, sync_stock, email)
 * @returns Registry с зарегистрированными метриками
 */
export function createBullQueueMetrics(
  queue: Queue,
  queueLabel: string
): Registry {
  const register = new Registry();

  const waitingGauge = new Gauge({
    name: 'bull_queue_waiting_jobs',
    help: 'Number of jobs waiting in the queue',
    labelNames: [QUEUE_LABEL],
    registers: [register],
  });

  const activeGauge = new Gauge({
    name: 'bull_queue_active_jobs',
    help: 'Number of jobs currently being processed',
    labelNames: [QUEUE_LABEL],
    registers: [register],
  });

  const delayedGauge = new Gauge({
    name: 'bull_queue_delayed_jobs',
    help: 'Number of delayed jobs',
    labelNames: [QUEUE_LABEL],
    registers: [register],
  });

  const completedCounter = new Counter({
    name: 'bull_queue_completed_total',
    help: 'Total number of completed jobs',
    labelNames: [QUEUE_LABEL],
    registers: [register],
  });

  const failedCounter = new Counter({
    name: 'bull_queue_failed_total',
    help: 'Total number of failed jobs',
    labelNames: [QUEUE_LABEL],
    registers: [register],
  });

  async function updateCounts(): Promise<void> {
    try {
      const counts = await queue.getJobCounts();
      waitingGauge.set({ [QUEUE_LABEL]: queueLabel }, counts.waiting);
      activeGauge.set({ [QUEUE_LABEL]: queueLabel }, counts.active);
      delayedGauge.set({ [QUEUE_LABEL]: queueLabel }, counts.delayed);
    } catch {
      // Redis может быть временно недоступен
    }
  }

  const pollTimer = setInterval(updateCounts, POLL_INTERVAL_MS);
  updateCounts();

  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queueEvents = new QueueEvents(queue.name, { connection });

  queueEvents.on('completed', ({ jobId }) => {
    completedCounter.inc({ [QUEUE_LABEL]: queueLabel });
    // Duration — из job нельзя вытащить здесь без доп. запроса; пока не реализовано
  });

  queueEvents.on('failed', () => {
    failedCounter.inc({ [QUEUE_LABEL]: queueLabel });
  });

  process.on('SIGTERM', () => {
    clearInterval(pollTimer);
    void queueEvents.close();
    void connection.quit();
  });
  process.on('SIGINT', () => {
    clearInterval(pollTimer);
    void queueEvents.close();
    void connection.quit();
  });

  return register;
}

/**
 * Запускает HTTP-сервер на порту для отдачи /metrics.
 * Prometheus будет скрапить этот endpoint.
 */
export function startMetricsServer(port: number, register: Registry): void {
  collectDefaultMetrics({ register, prefix: 'node_' });

  const server = http.createServer(async (req, res) => {
    const path = req.url?.split('?')[0];
    if (path === '/metrics' && req.method === 'GET') {
      try {
        const metrics = await register.metrics();
        res.setHeader('Content-Type', register.contentType);
        res.end(metrics);
      } catch (err) {
        res.writeHead(500);
        res.end(
          `# metrics error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      return;
    }
    if (path === '/health' && req.method === 'GET') {
      res.writeHead(200);
      res.end('OK');
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    // Логирование через createLogger — но это создаст зависимость от shared
    // Оставляем тихо, порт виден в describe pod
  });
}
