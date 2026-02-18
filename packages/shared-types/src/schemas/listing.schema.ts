import { z } from 'zod';
import { PaginationSchema } from './common.schema';

/** SyncPolicy */
export const SyncPolicySchema = z.enum([
  'LINKED',
  'EXCLUSIVE_WB',
  'EXCLUSIVE_OZON',
  'MANUAL',
]);
export type SyncPolicy = z.infer<typeof SyncPolicySchema>;

/** StockSyncPolicy */
export const StockSyncPolicySchema = z.enum([
  'MASTER_ONLY',
  'WB_IS_SOURCE',
  'OZON_IS_SOURCE',
  'LAST_WRITE_WINS',
]);
export type StockSyncPolicy = z.infer<typeof StockSyncPolicySchema>;

/** PriceSyncPolicy */
export const PriceSyncPolicySchema = z.enum([
  'MASTER_ONLY',
  'WB_IS_SOURCE',
  'OZON_IS_SOURCE',
  'LAST_WRITE_WINS',
]);
export type PriceSyncPolicy = z.infer<typeof PriceSyncPolicySchema>;

/** Создание Listing — привязка Variant ↔ MarketAccount */
export const CreateListingSchema = z.object({
  variantId: z.string().min(1),
  marketAccountId: z.string().min(1),
  syncPolicy: SyncPolicySchema,
  stockSyncPolicy: StockSyncPolicySchema,
  priceSyncPolicy: PriceSyncPolicySchema,
});
export type CreateListingInput = z.infer<typeof CreateListingSchema>;

/** Обновление policy Listing */
export const UpdateListingPolicySchema = z.object({
  syncPolicy: SyncPolicySchema.optional(),
  stockSyncPolicy: StockSyncPolicySchema.optional(),
  priceSyncPolicy: PriceSyncPolicySchema.optional(),
});
export type UpdateListingPolicyInput = z.infer<
  typeof UpdateListingPolicySchema
>;

/** Query для списка listings */
export const ListingListQuerySchema = PaginationSchema.extend({
  marketAccountId: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ERROR', 'ARCHIVED']).optional(),
});
export type ListingListQuery = z.infer<typeof ListingListQuerySchema>;
