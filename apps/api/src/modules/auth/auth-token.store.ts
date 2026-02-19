/**
 * Хранение токенов verify-email и reset-password в Redis.
 * Ключи ev:* и pr:*, TTL 24h.
 */
import { Inject, Injectable } from '@nestjs/common';
import { REDIS_TOKEN, type RedisClient } from '../../shared/redis/redis.module.js';

const TTL = 86400; // 24h
const EV_PREFIX = 'ev:';
const PR_PREFIX = 'pr:';

@Injectable()
export class AuthTokenStore {
  constructor(@Inject(REDIS_TOKEN) private readonly redis: RedisClient) {}

  async setEmailVerificationToken(userId: string, tokenHash: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(`${EV_PREFIX}${tokenHash}`, userId, 'EX', TTL);
    pipeline.set(`${EV_PREFIX}user:${userId}`, tokenHash, 'EX', TTL);
    await pipeline.exec();
  }

  async getUserIdByEmailVerificationToken(
    tokenHash: string
  ): Promise<string | null> {
    const userId = await this.redis.get(`${EV_PREFIX}${tokenHash}`);
    if (!userId) return null;
    await this.redis.del(`${EV_PREFIX}${tokenHash}`, `${EV_PREFIX}user:${userId}`);
    return userId;
  }

  async invalidateEmailVerificationForUser(userId: string): Promise<void> {
    const oldHash = await this.redis.get(`${EV_PREFIX}user:${userId}`);
    if (oldHash) {
      await this.redis.del(`${EV_PREFIX}${oldHash}`, `${EV_PREFIX}user:${userId}`);
    }
  }

  async setPasswordResetToken(userId: string, tokenHash: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(`${PR_PREFIX}${tokenHash}`, userId, 'EX', TTL);
    pipeline.set(`${PR_PREFIX}user:${userId}`, tokenHash, 'EX', TTL);
    await pipeline.exec();
  }

  async getUserIdByPasswordResetToken(tokenHash: string): Promise<string | null> {
    const userId = await this.redis.get(`${PR_PREFIX}${tokenHash}`);
    if (!userId) return null;
    await this.redis.del(`${PR_PREFIX}${tokenHash}`, `${PR_PREFIX}user:${userId}`);
    return userId;
  }

  async invalidatePasswordResetForUser(userId: string): Promise<void> {
    const oldHash = await this.redis.get(`${PR_PREFIX}user:${userId}`);
    if (oldHash) {
      await this.redis.del(`${PR_PREFIX}${oldHash}`, `${PR_PREFIX}user:${userId}`);
    }
  }
}
