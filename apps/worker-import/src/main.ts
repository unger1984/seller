/**
 * BullMQ worker — импорт каталога с маркетплейса.
 */
import { QUEUE_NAMES } from '@seller/domain';
import { runWorker, processImportCatalog } from '@seller/worker-lib';

runWorker(
  QUEUE_NAMES.IMPORT_CATALOG,
  (job) => processImportCatalog(job as never),
  2,
  'WorkerImport'
);
