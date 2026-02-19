/**
 * BullMQ worker — публикация листинга на маркетплейс.
 */
import { QUEUE_NAMES } from '@seller/domain';
import { runWorker, processPublishListing } from '@seller/worker-lib';

runWorker(
  QUEUE_NAMES.PUBLISH_LISTING,
  (job) => processPublishListing(job as never),
  5,
  'WorkerPublish'
);
