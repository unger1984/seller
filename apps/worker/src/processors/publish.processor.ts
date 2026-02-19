/**
 * Публикация листинга на маркетплейс.
 * TODO: Ozon/WB API, создание OzonListingIds/WbListingIds.
 */
import type { Job } from 'bullmq';
import { createLogger } from '@seller/shared';
import type { PublishListingJobData } from '../queues.js';

const log = createLogger('PublishProcessor');

export async function processPublishListing(job: Job<PublishListingJobData>) {
  const { listingId, companyId } = job.data;
  // Stub
  log.i(`listingId=${listingId} companyId=${companyId}`, {
    listingId,
    companyId,
  });
  return { status: 'stub' };
}
