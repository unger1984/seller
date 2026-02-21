/**
 * Сервис для постановки jobs в BullMQ.
 * Общие имена с worker через строки — shared контракт.
 */
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createLogger } from '@seller/shared';
import {
  QUEUE_NAMES,
  JOB_NAMES,
  IMPORT_ACTIVE_PREFIX,
  IMPORT_ACTIVE_TTL_SEC,
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
  private readonly log = createLogger(SyncQueueService.name);
  private readonly queueImport: Queue;
  private readonly queuePublish: Queue;
  private readonly queueSyncStock: Queue;

  constructor(@Inject(REDIS_TOKEN) private readonly redis: RedisClient) {
    this.queueImport = new Queue(QUEUE_NAMES.IMPORT_CATALOG, {
      connection: this.redis,
    });
    this.queuePublish = new Queue(QUEUE_NAMES.PUBLISH_LISTING, {
      connection: this.redis,
    });
    this.queueSyncStock = new Queue(QUEUE_NAMES.SYNC_STOCK, {
      connection: this.redis,
    });
  }

  async addImportCatalog(data: ImportCatalogJobData) {
    this.log.i('Adding job to queue', {
      queue: QUEUE_NAMES.IMPORT_CATALOG,
      marketAccountId: data.marketAccountId,
      companyId: data.companyId,
    });
    const job = await this.queueImport.add(JOB_NAMES.IMPORT_CATALOG, data);
    const key = `${IMPORT_ACTIVE_PREFIX}${data.marketAccountId}`;
    const payload = JSON.stringify({
      jobId: String(job.id),
      companyId: data.companyId,
      startedAt: new Date().toISOString(),
    });
    await this.redis.setex(key, IMPORT_ACTIVE_TTL_SEC, payload);
    this.log.i('Job added to queue', {
      queue: QUEUE_NAMES.IMPORT_CATALOG,
      jobId: job.id,
    });
    return { jobId: job.id };
  }

  async addPublishListing(data: PublishListingJobData) {
    const job = await this.queuePublish.add(JOB_NAMES.PUBLISH_LISTING, data);
    return { jobId: job.id };
  }

  async addSyncStock(data: SyncStockJobData) {
    const job = await this.queueSyncStock.add(JOB_NAMES.SYNC_STOCK, data);
    return { jobId: job.id };
  }

  async onModuleDestroy() {
    await Promise.all([
      this.queueImport.close(),
      this.queuePublish.close(),
      this.queueSyncStock.close(),
    ]);
  }
}
