/**
 * Сервис постановки email jobs в BullMQ.
 * Job data — только userId/requestId и to; URL забирается worker из Redis.
 */
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_NAMES,
  type VerifyEmailJobData,
  type ResetPasswordJobData,
} from '@seller/domain';
import {
  REDIS_TOKEN,
  type RedisClient,
} from '../../shared/redis/redis.module.js';

const DEFAULT_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 30_000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(@Inject(REDIS_TOKEN) private readonly redis: RedisClient) {
    this.queue = new Queue(QUEUE_NAMES.EMAIL, {
      connection: this.redis,
      defaultJobOptions: DEFAULT_JOB_OPTS,
    });
  }

  async addVerifyEmail(userId: string, to: string): Promise<{ jobId: string }> {
    const data: VerifyEmailJobData = { userId, to };
    const job = await this.queue.add(JOB_NAMES.VERIFY_EMAIL, data, {
      jobId: `verify:${userId}`,
    });
    return { jobId: job.id! };
  }

  async addResetPassword(
    requestId: string,
    to: string
  ): Promise<{ jobId: string }> {
    const data: ResetPasswordJobData = { requestId, to };
    const job = await this.queue.add(JOB_NAMES.RESET_PASSWORD, data, {
      jobId: `reset:${requestId}`,
    });
    return { jobId: job.id! };
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
