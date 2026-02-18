import { z } from 'zod';
import { PaginationSchema } from './common.schema.js';

/** ExternalRefType — OZON_* только для Ozon, WB_* только для WB */
export const ExternalRefTypeSchema = z.enum([
  'OZON_PRODUCT_ID',
  'OZON_OFFER_ID',
  'WB_NM_ID',
  'WB_CHRT_ID',
]);

/** MatchMethod */
export const MatchMethodSchema = z.enum([
  'BARCODE',
  'VENDOR_CODE',
  'NAME_BRAND',
  'MANUAL',
]);

/** MatchStatus */
export const MatchStatusSchema = z.enum([
  'PENDING',
  'AUTO_MATCHED',
  'MANUAL',
  'CONFLICT',
]);

/** Query для списка match candidates */
export const MatchCandidateListQuerySchema = PaginationSchema.extend({
  status: z.enum(['PENDING', 'CONFLICT']).optional(),
});
