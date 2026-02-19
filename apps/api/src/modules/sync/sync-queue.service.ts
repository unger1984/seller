/**
 * Сервис для постановки jobs в BullMQ.
 * Общие имена с worker через строки — shared контракт.
 */
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_NAMES,
  type ImportCatalogJobData,
  type PublishListingJobData,
  type SyncStockJobData,
} from '@seller/domain';
import {
  REDIS_TOKEN,
  type RedisClient,
} from '../../shared/redis/redis.module.js';

@Injectable()
export class SyncQueueService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(@Inject(REDIS_TOKEN) private readonly redis: RedisClient) {
    this.queue = new Queue(QUEUE_NAMES.SYNC, {
      connection: this.redis,
    });
  }

  async addImportCatalog(data: ImportCatalogJobData) {
    const job = await this.queue.add(JOB_NAMES.IMPORT_CATALOG, data);
    return { jobId: job.id };
  }

  async addPublishListing(data: PublishListingJobData) {
    const job = await this.queue.add(JOB_NAMES.PUBLISH_LISTING, data);
    return { jobId: job.id };
  }

  async addSyncStock(data: SyncStockJobData) {
    const job = await this.queue.add(JOB_NAMES.SYNC_STOCK, data);
    return { jobId: job.id };
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
