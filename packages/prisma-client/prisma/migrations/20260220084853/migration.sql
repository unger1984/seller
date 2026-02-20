-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_active_company_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_last_active_company_id_fkey" FOREIGN KEY ("last_active_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
