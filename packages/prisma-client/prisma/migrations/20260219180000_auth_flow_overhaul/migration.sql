-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "name";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");
