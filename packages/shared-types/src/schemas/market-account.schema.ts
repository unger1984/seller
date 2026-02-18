import { z } from 'zod';

/** Маркетплейсы */
export const MarketplaceSchema = z.enum(['OZON', 'WILDBERRIES']);
export type Marketplace = z.infer<typeof MarketplaceSchema>;

/** Credentials для Ozon — Client-Id + Api-Key в headers */
export const OzonCredentialsSchema = z.object({
  clientId: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
});
export type OzonCredentials = z.infer<typeof OzonCredentialsSchema>;

/** Credentials для Wildberries — Bearer token */
export const WbCredentialsSchema = z.object({
  apiKey: z.string().trim().min(1),
});
export type WbCredentials = z.infer<typeof WbCredentialsSchema>;

/** Создание аккаунта — discriminated union по marketplace */
export const CreateMarketAccountSchema = z.discriminatedUnion('marketplace', [
  z.object({
    marketplace: z.literal('OZON'),
    name: z.string().trim().min(1),
    credentials: OzonCredentialsSchema,
  }),
  z.object({
    marketplace: z.literal('WILDBERRIES'),
    name: z.string().trim().min(1),
    credentials: WbCredentialsSchema,
  }),
]);
export type CreateMarketAccountInput = z.infer<
  typeof CreateMarketAccountSchema
>;

/** Обновление credentials аккаунта */
export const UpdateMarketAccountCredentialsSchema = z.discriminatedUnion(
  'marketplace',
  [
    z.object({
      marketplace: z.literal('OZON'),
      credentials: OzonCredentialsSchema,
    }),
    z.object({
      marketplace: z.literal('WILDBERRIES'),
      credentials: WbCredentialsSchema,
    }),
  ]
);
export type UpdateMarketAccountCredentialsInput = z.infer<
  typeof UpdateMarketAccountCredentialsSchema
>;
