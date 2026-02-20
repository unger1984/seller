-- CreateIndex
CREATE UNIQUE INDEX "market_accounts_company_id_marketplace_key" ON "market_accounts"("company_id", "marketplace");
