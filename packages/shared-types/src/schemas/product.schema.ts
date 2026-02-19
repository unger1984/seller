import { z } from 'zod';
import {
  MarketplaceStringIdSchema,
  PaginationSchema,
} from './common.schema.js';

/** Создание Product — master-карточка */
export const CreateProductSchema = z.object({
  name: z.string().trim().min(1),
  brand: z.string().trim().optional(),
  description: z.string().trim().optional(),
  attributes: z.record(z.unknown()).optional(),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

/** Обновление Product — частичное */
export const UpdateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  brand: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  attributes: z.record(z.unknown()).optional().nullable(),
});
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

/** Query для списка products */
export const ProductListQuerySchema = PaginationSchema.extend({
  search: z.string().trim().optional(),
  brand: z.string().trim().optional(),
});
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

/** Создание Variant — SKU продукта */
export const CreateVariantSchema = z.object({
  vendorCode: MarketplaceStringIdSchema,
  masterPrice: z.number().nonnegative().finite(),
  masterStock: z.number().int().min(0).default(0),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
});
export type CreateVariantInput = z.infer<typeof CreateVariantSchema>;

/** Обновление Variant */
export const UpdateVariantSchema = z.object({
  vendorCode: MarketplaceStringIdSchema.optional(),
  masterPrice: z.number().nonnegative().finite().optional(),
  masterStock: z.number().int().min(0).optional(),
  size: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
});
export type UpdateVariantInput = z.infer<typeof UpdateVariantSchema>;

/** Добавление штрихкода к variant — MarketplaceStringIdSchema для barcode */
export const AddBarcodeSchema = z.object({
  barcode: MarketplaceStringIdSchema,
});
export type AddBarcodeInput = z.infer<typeof AddBarcodeSchema>;
