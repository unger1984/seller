/**
 * Хранение токенов verify-email и reset-password в Redis.
 * Ключи ev:* и pr:*, TTL 24h.
 * Pending URLs для worker: ev:pending:verify:{userId}, pr:pending:reset:{requestId}, TTL 300.
 */
import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PENDING_PREFIX } from '@seller/domain';
import {
  REDIS_TOKEN,
  type RedisClient,
} from '../../shared/redis/redis.module.js';

const TTL = 86400; // 24h
const PENDING_TTL = 300; // 5 min — worker должен забрать до истечения
const EV_PREFIX = 'ev:';
const PR_PREFIX = 'pr:';

@Injectable()
export class AuthTokenStore {
  constructor(@Inject(REDIS_TOKEN) private readonly redis: RedisClient) {}

  async setEmailVerificationToken(
    userId: string,
    tokenHash: string
  ): Promise<void> {
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
    await this.redis.del(
      `${EV_PREFIX}${tokenHash}`,
      `${EV_PREFIX}user:${userId}`
    );
    return userId;
  }

  async invalidateEmailVerificationForUser(userId: string): Promise<void> {
    const oldHash = await this.redis.get(`${EV_PREFIX}user:${userId}`);
    if (oldHash) {
      await this.redis.del(
        `${EV_PREFIX}${oldHash}`,
        `${EV_PREFIX}user:${userId}`
      );
    }
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(`${PR_PREFIX}${tokenHash}`, userId, 'EX', TTL);
    pipeline.set(`${PR_PREFIX}user:${userId}`, tokenHash, 'EX', TTL);
    await pipeline.exec();
  }

  async getUserIdByPasswordResetToken(
    tokenHash: string
  ): Promise<string | null> {
    const userId = await this.redis.get(`${PR_PREFIX}${tokenHash}`);
    if (!userId) return null;
    await this.redis.del(
      `${PR_PREFIX}${tokenHash}`,
      `${PR_PREFIX}user:${userId}`
    );
    return userId;
  }

  async invalidatePasswordResetForUser(userId: string): Promise<void> {
    const oldHash = await this.redis.get(`${PR_PREFIX}user:${userId}`);
    if (oldHash) {
      await this.redis.del(
        `${PR_PREFIX}${oldHash}`,
        `${PR_PREFIX}user:${userId}`
      );
    }
  }

  /** URL для worker: верификация. TTL 5 min. */
  async setPendingVerifyUrl(userId: string, verifyUrl: string): Promise<void> {
    await this.redis.set(
      `${EMAIL_PENDING_PREFIX.VERIFY}${userId}`,
      verifyUrl,
      'EX',
      PENDING_TTL
    );
  }

  /** URL для worker: сброс пароля. TTL 5 min. */
  async setPendingResetUrl(requestId: string, resetUrl: string): Promise<void> {
    await this.redis.set(
      `${EMAIL_PENDING_PREFIX.RESET}${requestId}`,
      resetUrl,
      'EX',
      PENDING_TTL
    );
  }
}
