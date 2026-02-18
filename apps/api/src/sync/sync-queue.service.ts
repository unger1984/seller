/**
 * Сервис для постановки jobs в BullMQ.
 * Общие имена с worker через строки — shared контракт.
 */
import { createRequire } from 'node:module';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

const require = createRequire(import.meta.url);
const Redis = require('ioredis');
import {
  QUEUE_NAMES,
  JOB_NAMES,
  type ImportCatalogJobData,
  type PublishListingJobData,
  type SyncStockJobData,
} from '@seller/domain';

@Injectable()
export class SyncQueueService implements OnModuleDestroy {
  private readonly queue: Queue;
  private readonly redis: InstanceType<typeof Redis>;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(url);
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
    await this.redis.quit();
  }
}
