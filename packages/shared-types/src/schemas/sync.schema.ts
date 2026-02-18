import { z } from 'zod';

/** Запуск импорта каталога */
export const ImportCatalogSchema = z.object({
  marketAccountId: z.string().min(1),
});
export type ImportCatalogInput = z.infer<typeof ImportCatalogSchema>;
