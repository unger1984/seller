import { z } from 'zod';

/** Схема для входа пользователя. Длина пароля не валидируется — только при создании. */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/** Схема регистрации — без name (поле удалено из User) */
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

/** Схема повторной отправки письма верификации */
export const ResendVerificationSchema = z.object({
  email: z.string().email(),
});
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;

/** Схема запроса сброса пароля */
export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/** Схема verify-email */
export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

/** Схема reset-password */
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Пароли не совпадают',
    path: ['passwordConfirm'],
  });
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

/** Схема смены активной компании */
export const ActiveCompanySchema = z.object({
  companyId: z.string().min(1),
});
export type ActiveCompanyInput = z.infer<typeof ActiveCompanySchema>;
