/**
 * Базовый guard для rate limit по email.
 * Дочерние классы задают keyPrefix и ttlSeconds.
 */
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import {
  REDIS_TOKEN,
  type RedisClient,
} from '../../../shared/redis/redis.module.js';

@Injectable()
export abstract class ThrottleByEmailGuard implements CanActivate {
  protected abstract readonly keyPrefix: string;
  protected readonly ttlSeconds = 60; // 1 минута

  constructor(@Inject(REDIS_TOKEN) protected readonly redis: RedisClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const body = req.body as Record<string, unknown>;
    const email = body?.email as string | undefined;
    if (!email?.trim()) {
      return true;
    }
    const key = `rate:${this.keyPrefix}:${email.trim().toLowerCase()}`;
    const exists = await this.redis.set(key, '1', 'EX', this.ttlSeconds, 'NX');
    if (exists !== 'OK') {
      const ttl = await this.redis.ttl(key);
      const retryAfterSeconds = ttl > 0 ? ttl : this.ttlSeconds;
      throw new HttpException(
        {
          message: 'Подождите перед повторной отправкой.',
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    return true;
  }
}
