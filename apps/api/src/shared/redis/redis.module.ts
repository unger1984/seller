/** Общий Redis connection для API (BullMQ, AuthTokenStore, rate limit) */
import { Global, Module } from '@nestjs/common';
import { createRequire } from 'node:module';
import { ConfigService } from '../config/config.service.js';

const require = createRequire(import.meta.url);
const Redis = require('ioredis');

export type RedisClient = InstanceType<typeof Redis>;
export const REDIS_TOKEN = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService): RedisClient => {
        const redis = new Redis(config.cfg.redis.url);
        return redis;
      },
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
