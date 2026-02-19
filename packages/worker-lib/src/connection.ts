/**
 * Redis connection для BullMQ Worker.
 * maxRetriesPerRequest: null — требование BullMQ.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Redis = require('ioredis');

export function createRedisConnection(): ReturnType<typeof Redis> {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Redis(url, { maxRetriesPerRequest: null });
}
