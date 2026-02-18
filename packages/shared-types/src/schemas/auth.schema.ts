import { z } from 'zod';

/** Схема для входа пользователя. Длина пароля не валидируется — только при создании. */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/** Схема регистрации */
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

/** Схема смены активной компании */
export const ActiveCompanySchema = z.object({
  companyId: z.string().min(1),
});
export type ActiveCompanyInput = z.infer<typeof ActiveCompanySchema>;
