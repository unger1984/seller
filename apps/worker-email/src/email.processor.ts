/**
 * Обработчик email jobs — верификация, сброс пароля.
 * URL забирает из Redis (ev:pending:verify:{userId}, pr:pending:reset:{requestId}).
 */
import { Inject, Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  JOB_NAMES,
  EMAIL_PENDING_PREFIX,
  type VerifyEmailJobData,
  type ResetPasswordJobData,
} from '@seller/domain';
import { EmailService } from '@seller/email-module';
import { createLogger } from '@seller/shared';
import type { RedisClient } from './redis.provider.js';
import { REDIS_TOKEN } from './redis.provider.js';

const log = createLogger('EmailProcessor');

@Injectable()
@Processor('email', {
  concurrency: parseInt(process.env.EMAIL_CONCURRENCY ?? '5', 10),
})
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
    @Inject(REDIS_TOKEN) private readonly redis: RedisClient
  ) {
    super();
  }

  async process(
    job: Job<VerifyEmailJobData | ResetPasswordJobData>
  ): Promise<void> {
    const start = Date.now();
    if (job.name === JOB_NAMES.VERIFY_EMAIL) {
      await this.handleVerify(job as Job<VerifyEmailJobData>, start);
    } else if (job.name === JOB_NAMES.RESET_PASSWORD) {
      await this.handleReset(job as Job<ResetPasswordJobData>, start);
    } else {
      log.w('Unknown job name', { name: job.name, jobId: job.id });
    }
  }

  private async handleVerify(
    job: Job<VerifyEmailJobData>,
    start: number
  ): Promise<void> {
    const { userId, to } = job.data;
    const key = `${EMAIL_PENDING_PREFIX.VERIFY}${userId}`;
    const verifyUrl = await this.redis.get(key);
    if (!verifyUrl) {
      log.i('Verify: URL уже отправлен или истёк (идемпотентность)', {
        jobId: job.id,
        userId,
      });
      return;
    }
    await this.emailService.sendVerificationEmail(to, verifyUrl);
    await this.redis.del(key);
    log.i(`Verify email completed`, {
      jobId: job.id,
      userId,
      duration: Date.now() - start,
    });
  }

  private async handleReset(
    job: Job<ResetPasswordJobData>,
    start: number
  ): Promise<void> {
    const { requestId, to } = job.data;
    const key = `${EMAIL_PENDING_PREFIX.RESET}${requestId}`;
    const resetUrl = await this.redis.get(key);
    if (!resetUrl) {
      log.i('Reset: URL уже отправлен или истёк (идемпотентность)', {
        jobId: job.id,
        requestId,
        key,
      });
      return;
    }
    log.i('Reset: отправка письма', { requestId, to });
    try {
      await this.emailService.sendPasswordResetEmail(to, resetUrl);
      await this.redis.del(key);
      log.i('Reset password email completed', {
        jobId: job.id,
        requestId,
        duration: Date.now() - start,
      });
    } catch (err) {
      log.e('Reset: ошибка отправки', { requestId, to, err });
      throw err;
    }
  }
}
