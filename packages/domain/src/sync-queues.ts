/**
 * Имена очередей и типы jobs — shared контракт API ↔ Worker.
 */
export const QUEUE_NAMES = {
  IMPORT_CATALOG: 'import-catalog',
  PUBLISH_LISTING: 'publish-listing',
  SYNC_STOCK: 'sync-stock',
  EMAIL: 'email',
} as const;

export const JOB_NAMES = {
  IMPORT_CATALOG: 'import-catalog',
  PUBLISH_LISTING: 'publish-listing',
  SYNC_STOCK: 'sync-stock',
  VERIFY_EMAIL: 'verify-email',
  RESET_PASSWORD: 'reset-password',
} as const;

/** Redis ключ активного импорта: import:active:{marketAccountId} */
export const IMPORT_ACTIVE_PREFIX = 'import:active:';
export const IMPORT_ACTIVE_TTL_SEC = 86400; // 24h

export type ImportActivePayload = {
  jobId: string;
  companyId: string;
  startedAt: string; // ISO
};

/** Канал Redis pub/sub для события завершения импорта */
export const SYNC_IMPORT_DONE_CHANNEL = 'sync:import:done';

/** Префиксы Redis для pending URL (worker consumes) */
export const EMAIL_PENDING_PREFIX = {
  VERIFY: 'ev:pending:verify:',
  RESET: 'pr:pending:reset:',
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

export type VerifyEmailJobData = {
  userId: string;
  to: string;
};

export type ResetPasswordJobData = {
  requestId: string;
  to: string;
};
