-- AlterTable
-- DEFAULT true для уже существующих пользователей; новые записи через Prisma получают isActive=false
ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN "users"."is_active" IS 'Активен ли аккаунт (доступ после регистрации — до активации)';
