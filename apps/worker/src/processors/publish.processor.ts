/**
 * Публикация листинга на маркетплейс.
 * TODO: Ozon/WB API, создание OzonListingIds/WbListingIds.
 */
import type { Job } from 'bullmq';
import { logger } from '@seller/shared';
import type { PublishListingJobData } from '../queues.js';

export async function processPublishListing(job: Job<PublishListingJobData>) {
  const { listingId, companyId } = job.data;
  // Stub
  logger.info(
    `[publish-listing] listingId=${listingId} companyId=${companyId}`
  );
  return { status: 'stub' };
}
