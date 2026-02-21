/**
 * Синхронизация остатков — push master → площадка или import.
 * При реализации: использовать shouldSkipStockUpdateOnImport из @seller/shared для защиты от ping-pong.
 * TODO: origin tracking (hash comparison), API вызовы.
 */
import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { createLogger } from '@seller/shared';
import type { SyncStockJobData } from '@seller/domain';

@Injectable()
@Processor('sync-stock', {
  concurrency: parseInt(process.env.SYNC_STOCK_CONCURRENCY ?? '5', 10),
})
export class SyncStockProcessor extends WorkerHost {
  private readonly log = createLogger(SyncStockProcessor.name);

  async process(job: Job<SyncStockJobData>): Promise<{ status: string }> {
    const { listingId, companyId } = job.data;
    this.log.i(`listingId=${listingId} companyId=${companyId}`, {
      listingId,
      companyId,
    });
    return { status: 'stub' };
  }
}
