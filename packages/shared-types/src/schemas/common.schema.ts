import { z } from 'zod';

/** Числовые ID маркетплейсов (nmId, chrtId, productId, sku) — DTO строка. BigInt → string в API. */
export const MarketplaceNumericIdSchema = z.string().trim().regex(/^\d+$/);

/** Строковые ID (offerId, vendorCode, barcode) */
export const MarketplaceStringIdSchema = z.string().trim().min(1);

/** Cuid для ID сущностей */
export const CuidSchema = z.string().min(1);

/** Пагинация — query params */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof PaginationSchema>;
