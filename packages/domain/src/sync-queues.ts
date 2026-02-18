/**
 * Имена очередей и типы jobs — shared контракт API ↔ Worker.
 */
export const QUEUE_NAMES = {
  SYNC: 'sync',
} as const;

export const JOB_NAMES = {
  IMPORT_CATALOG: 'import-catalog',
  PUBLISH_LISTING: 'publish-listing',
  SYNC_STOCK: 'sync-stock',
} as const;

export type ImportCatalogJobData = {
  marketAccountId: string;
  companyId: string;
};

export type PublishListingJobData = {
  listingId: string;
  companyId: string;
};

export type SyncStockJobData = {
  listingId: string;
  companyId: string;
};
