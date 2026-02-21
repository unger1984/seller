/**
 * Публикация листинга на маркетплейс.
 * TODO: Ozon/WB API, создание OzonListingIds/WbListingIds.
 */
import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { createLogger } from '@seller/shared';
import type { PublishListingJobData } from '@seller/domain';

@Injectable()
@Processor('publish-listing', {
  concurrency: parseInt(process.env.PUBLISH_CONCURRENCY ?? '5', 10),
})
export class PublishProcessor extends WorkerHost {
  private readonly log = createLogger(PublishProcessor.name);

  async process(job: Job<PublishListingJobData>): Promise<{ status: string }> {
    const { listingId, companyId } = job.data;
    this.log.i(`listingId=${listingId} companyId=${companyId}`, {
      listingId,
      companyId,
    });
    return { status: 'stub' };
  }
}
