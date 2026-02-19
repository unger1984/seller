/**
 * Redis для worker — BullMQ и GET/DEL pending URLs.
 * maxRetriesPerRequest: null — требование BullMQ.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Redis = require('ioredis');

export type RedisClient = InstanceType<typeof Redis>;
export const REDIS_TOKEN = Symbol('REDIS');

export function createRedisProvider() {
  return {
    provide: REDIS_TOKEN,
    useFactory: (): RedisClient => {
      const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
      return new Redis(url, { maxRetriesPerRequest: null });
    },
  };
}
