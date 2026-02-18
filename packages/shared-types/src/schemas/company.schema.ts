import { z } from 'zod';

/** Схема создания компании */
export const CreateCompanySchema = z.object({
  name: z.string().min(1),
});
export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
