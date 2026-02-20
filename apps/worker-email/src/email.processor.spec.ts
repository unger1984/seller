/**
 * Тесты EmailProcessor — идемпотентность, отправка, обработка ошибок.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import {
  JOB_NAMES,
  EMAIL_PENDING_PREFIX,
  type VerifyEmailJobData,
  type ResetPasswordJobData,
} from '@seller/domain';
import { EmailProcessor } from './email.processor.js';
import type { EmailService } from '@seller/email-module';
import type { RedisClient } from './redis.provider.js';

function mockJob<T>(name: string, data: T): Job<T> {
  return {
    id: `job-${Date.now()}`,
    name,
    data,
  } as Job<T>;
}

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let emailService: EmailService;
  let redis: RedisClient;

  beforeEach(() => {
    emailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as EmailService;

    redis = {
      get: vi.fn(),
      del: vi.fn().mockResolvedValue(1),
    } as unknown as RedisClient;

    processor = new EmailProcessor(emailService, redis);
    vi.mocked(redis).get.mockResolvedValue(null);
  });

  describe('handleVerify (verify-email)', () => {
    const userId = 'user-123';
    const to = 'test@example.com';
    const verifyUrl = 'https://app/verify?token=abc';

    it('не отправляет, если ключ отсутствует (идемпотентность)', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      const job = mockJob<VerifyEmailJobData>(JOB_NAMES.VERIFY_EMAIL, {
        userId,
        to,
      });

      await processor.process(job);

      expect(redis.get).toHaveBeenCalledWith(
        `${EMAIL_PENDING_PREFIX.VERIFY}${userId}`
      );
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('отправляет и удаляет ключ, если URL есть', async () => {
      vi.mocked(redis.get).mockResolvedValue(verifyUrl);
      const job = mockJob<VerifyEmailJobData>(JOB_NAMES.VERIFY_EMAIL, {
        userId,
        to,
      });

      await processor.process(job);

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        to,
        verifyUrl
      );
      expect(redis.del).toHaveBeenCalledWith(
        `${EMAIL_PENDING_PREFIX.VERIFY}${userId}`
      );
    });
  });

  describe('handleReset (reset-password)', () => {
    const requestId = 'req-456';
    const to = 'user@gmail.com';
    const resetUrl = 'https://app/reset-password?token=xyz';

    it('не отправляет, если ключ отсутствует (идемпотентность)', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      const job = mockJob<ResetPasswordJobData>(JOB_NAMES.RESET_PASSWORD, {
        requestId,
        to,
      });

      await processor.process(job);

      expect(redis.get).toHaveBeenCalledWith(
        `${EMAIL_PENDING_PREFIX.RESET}${requestId}`
      );
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('отправляет и удаляет ключ, если URL есть', async () => {
      vi.mocked(redis.get).mockResolvedValue(resetUrl);
      const job = mockJob<ResetPasswordJobData>(JOB_NAMES.RESET_PASSWORD, {
        requestId,
        to,
      });

      await processor.process(job);

      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        to,
        resetUrl
      );
      expect(redis.del).toHaveBeenCalledWith(
        `${EMAIL_PENDING_PREFIX.RESET}${requestId}`
      );
    });

    it('не удаляет ключ при ошибке отправки (retry сможет повторить)', async () => {
      vi.mocked(redis.get).mockResolvedValue(resetUrl);
      vi.mocked(emailService.sendPasswordResetEmail).mockRejectedValue(
        new Error('SMTP failed')
      );
      const job = mockJob<ResetPasswordJobData>(JOB_NAMES.RESET_PASSWORD, {
        requestId,
        to,
      });

      await expect(processor.process(job)).rejects.toThrow('SMTP failed');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('unknown job', () => {
    it('игнорирует неизвестный job name', async () => {
      const job = mockJob('unknown-job', {});
      await processor.process(job);
      expect(redis.get).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });
});
