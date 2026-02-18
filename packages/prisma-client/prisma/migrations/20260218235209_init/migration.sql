-- CreateEnum
CREATE TYPE "Marketplace" AS ENUM ('OZON', 'WILDBERRIES');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ERROR', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SyncPolicy" AS ENUM ('LINKED', 'EXCLUSIVE_WB', 'EXCLUSIVE_OZON', 'MANUAL');

-- CreateEnum
CREATE TYPE "StockSyncPolicy" AS ENUM ('MASTER_ONLY', 'WB_IS_SOURCE', 'OZON_IS_SOURCE', 'LAST_WRITE_WINS');

-- CreateEnum
CREATE TYPE "PriceSyncPolicy" AS ENUM ('MASTER_ONLY', 'WB_IS_SOURCE', 'OZON_IS_SOURCE', 'LAST_WRITE_WINS');

-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('BARCODE', 'VENDOR_CODE', 'NAME_BRAND', 'MANUAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'AUTO_MATCHED', 'MANUAL', 'CONFLICT');

-- CreateEnum
CREATE TYPE "SyncOrigin" AS ENUM ('MASTER', 'OZON', 'WILDBERRIES');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ExternalRefType" AS ENUM ('OZON_PRODUCT_ID', 'OZON_OFFER_ID', 'WB_NM_ID', 'WB_CHRT_ID');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_accounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "name" TEXT NOT NULL,
    "credentials_encrypted" TEXT NOT NULL,
    "credentials_version" INTEGER NOT NULL DEFAULT 1,
    "credentials_hash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "attributes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "vendor_code" TEXT NOT NULL,
    "master_price" DECIMAL(12,2) NOT NULL,
    "master_stock" INTEGER NOT NULL DEFAULT 0,
    "size" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_barcodes" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,

    CONSTRAINT "variant_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "market_account_id" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL,
    "sync_policy" "SyncPolicy" NOT NULL,
    "stock_sync_policy" "StockSyncPolicy" NOT NULL,
    "price_sync_policy" "PriceSyncPolicy" NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "snapshot" JSONB,
    "snapshot_hash" TEXT,
    "snapshot_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_stock_origin" "SyncOrigin",
    "last_stock_hash" TEXT,
    "last_stock_at" TIMESTAMP(3),
    "last_price_origin" "SyncOrigin",
    "last_price_hash" TEXT,
    "last_price_at" TIMESTAMP(3),

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ozon_listing_ids" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "market_account_id" TEXT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "sku" BIGINT,
    "offer_id" TEXT NOT NULL,

    CONSTRAINT "ozon_listing_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wb_listing_ids" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "market_account_id" TEXT NOT NULL,
    "nm_id" BIGINT NOT NULL,
    "imt_id" BIGINT,
    "chrt_id" BIGINT NOT NULL,

    CONSTRAINT "wb_listing_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_candidates" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT,
    "market_account_id" TEXT NOT NULL,
    "external_ref_type" "ExternalRefType" NOT NULL,
    "external_ref" TEXT NOT NULL,
    "external_snapshot" JSONB,
    "external_snapshot_hash" TEXT,
    "external_updated_at" TIMESTAMP(3),
    "match_method" "MatchMethod" NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "match_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "result" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "company_members_user_id_idx" ON "company_members"("user_id");

-- CreateIndex
CREATE INDEX "company_members_company_id_idx" ON "company_members"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_members_user_id_company_id_key" ON "company_members"("user_id", "company_id");

-- CreateIndex
CREATE INDEX "market_accounts_company_id_idx" ON "market_accounts"("company_id");

-- CreateIndex
CREATE INDEX "market_accounts_company_id_marketplace_idx" ON "market_accounts"("company_id", "marketplace");

-- CreateIndex
CREATE INDEX "products_company_id_idx" ON "products"("company_id");

-- CreateIndex
CREATE INDEX "variants_product_id_idx" ON "variants"("product_id");

-- CreateIndex
CREATE INDEX "variants_company_id_idx" ON "variants"("company_id");

-- CreateIndex
CREATE INDEX "variants_company_id_product_id_idx" ON "variants"("company_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "variants_company_id_vendor_code_key" ON "variants"("company_id", "vendor_code");

-- CreateIndex
CREATE INDEX "variant_barcodes_company_id_barcode_idx" ON "variant_barcodes"("company_id", "barcode");

-- CreateIndex
CREATE INDEX "variant_barcodes_barcode_idx" ON "variant_barcodes"("barcode");

-- CreateIndex
CREATE INDEX "variant_barcodes_company_id_idx" ON "variant_barcodes"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "variant_barcodes_variant_id_barcode_key" ON "variant_barcodes"("variant_id", "barcode");

-- CreateIndex
CREATE INDEX "listings_market_account_id_idx" ON "listings"("market_account_id");

-- CreateIndex
CREATE INDEX "listings_company_id_idx" ON "listings"("company_id");

-- CreateIndex
CREATE INDEX "listings_company_id_variant_id_idx" ON "listings"("company_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "listings_variant_id_market_account_id_key" ON "listings"("variant_id", "market_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "ozon_listing_ids_listing_id_key" ON "ozon_listing_ids"("listing_id");

-- CreateIndex
CREATE INDEX "ozon_listing_ids_market_account_id_idx" ON "ozon_listing_ids"("market_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "ozon_listing_ids_market_account_id_product_id_key" ON "ozon_listing_ids"("market_account_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ozon_listing_ids_market_account_id_offer_id_key" ON "ozon_listing_ids"("market_account_id", "offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "wb_listing_ids_listing_id_key" ON "wb_listing_ids"("listing_id");

-- CreateIndex
CREATE INDEX "wb_listing_ids_market_account_id_idx" ON "wb_listing_ids"("market_account_id");

-- CreateIndex
CREATE INDEX "wb_listing_ids_market_account_id_nm_id_idx" ON "wb_listing_ids"("market_account_id", "nm_id");

-- CreateIndex
CREATE UNIQUE INDEX "wb_listing_ids_market_account_id_chrt_id_key" ON "wb_listing_ids"("market_account_id", "chrt_id");

-- CreateIndex
CREATE INDEX "match_candidates_variant_id_idx" ON "match_candidates"("variant_id");

-- CreateIndex
CREATE INDEX "match_candidates_market_account_id_idx" ON "match_candidates"("market_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_candidates_market_account_id_external_ref_type_extern_key" ON "match_candidates"("market_account_id", "external_ref_type", "external_ref");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_company_id_key_key" ON "idempotency_keys"("company_id", "key");

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_accounts" ADD CONSTRAINT "market_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_barcodes" ADD CONSTRAINT "variant_barcodes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_market_account_id_fkey" FOREIGN KEY ("market_account_id") REFERENCES "market_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ozon_listing_ids" ADD CONSTRAINT "ozon_listing_ids_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ozon_listing_ids" ADD CONSTRAINT "ozon_listing_ids_market_account_id_fkey" FOREIGN KEY ("market_account_id") REFERENCES "market_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wb_listing_ids" ADD CONSTRAINT "wb_listing_ids_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wb_listing_ids" ADD CONSTRAINT "wb_listing_ids_market_account_id_fkey" FOREIGN KEY ("market_account_id") REFERENCES "market_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_market_account_id_fkey" FOREIGN KEY ("market_account_id") REFERENCES "market_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- COMMENT ON (русские комментарии для БД)

COMMENT ON TYPE "Marketplace" IS 'OZON, WILDBERRIES — маркетплейсы';
COMMENT ON TYPE "ListingStatus" IS 'DRAFT, PUBLISHED, ERROR, ARCHIVED — статус листинга';
COMMENT ON TYPE "SyncPolicy" IS 'LINKED, EXCLUSIVE_WB, EXCLUSIVE_OZON, MANUAL — политика синхронизации';
COMMENT ON TYPE "StockSyncPolicy" IS 'MASTER_ONLY, WB_IS_SOURCE, OZON_IS_SOURCE, LAST_WRITE_WINS';
COMMENT ON TYPE "PriceSyncPolicy" IS 'MASTER_ONLY, WB_IS_SOURCE, OZON_IS_SOURCE, LAST_WRITE_WINS';
COMMENT ON TYPE "MatchMethod" IS 'BARCODE, VENDOR_CODE, NAME_BRAND, MANUAL — способ сопоставления';
COMMENT ON TYPE "MatchStatus" IS 'PENDING, AUTO_MATCHED, MANUAL, CONFLICT — статус матчинга';
COMMENT ON TYPE "SyncOrigin" IS 'MASTER, OZON, WILDBERRIES — источник данных (origin tracking)';
COMMENT ON TYPE "CompanyRole" IS 'OWNER, ADMIN, MEMBER, VIEWER — роли в компании';
COMMENT ON TYPE "ExternalRefType" IS 'OZON_PRODUCT_ID, OZON_OFFER_ID, WB_NM_ID, WB_CHRT_ID — тип внешнего ID';

COMMENT ON TABLE "companies" IS 'Компании (тенанты)';
COMMENT ON COLUMN "companies"."id" IS 'CUID';
COMMENT ON COLUMN "companies"."name" IS 'Название компании';
COMMENT ON COLUMN "companies"."created_at" IS 'Дата создания';

COMMENT ON TABLE "users" IS 'Пользователи';
COMMENT ON COLUMN "users"."id" IS 'CUID';
COMMENT ON COLUMN "users"."email" IS 'Email (уникальный)';
COMMENT ON COLUMN "users"."password_hash" IS 'Хеш пароля';
COMMENT ON COLUMN "users"."name" IS 'Отображаемое имя';
COMMENT ON COLUMN "users"."created_at" IS 'Дата создания';

COMMENT ON TABLE "company_members" IS 'Членство пользователей в компаниях (many-to-many)';
COMMENT ON COLUMN "company_members"."user_id" IS 'ID пользователя';
COMMENT ON COLUMN "company_members"."company_id" IS 'ID компании';
COMMENT ON COLUMN "company_members"."role" IS 'Роль: OWNER, ADMIN, MEMBER, VIEWER';
COMMENT ON COLUMN "company_members"."created_at" IS 'Дата добавления';

COMMENT ON TABLE "market_accounts" IS 'Подключённые аккаунты маркетплейсов (Ozon, WB)';
COMMENT ON COLUMN "market_accounts"."company_id" IS 'ID компании (тенант)';
COMMENT ON COLUMN "market_accounts"."marketplace" IS 'OZON или WILDBERRIES';
COMMENT ON COLUMN "market_accounts"."name" IS 'Метка: Ozon основной, WB бренд X';
COMMENT ON COLUMN "market_accounts"."credentials_encrypted" IS 'version:nonce:ciphertext (base64/hex)';
COMMENT ON COLUMN "market_accounts"."credentials_version" IS 'Версия формата ключа для миграций';
COMMENT ON COLUMN "market_accounts"."credentials_hash" IS 'Хеш для дедупа (опционально)';
COMMENT ON COLUMN "market_accounts"."is_active" IS 'Активен ли аккаунт';
COMMENT ON COLUMN "market_accounts"."created_at" IS 'Дата создания';

COMMENT ON TABLE "products" IS 'Master-карточки товаров';
COMMENT ON COLUMN "products"."company_id" IS 'ID компании (тенант)';
COMMENT ON COLUMN "products"."name" IS 'Название товара';
COMMENT ON COLUMN "products"."brand" IS 'Бренд';
COMMENT ON COLUMN "products"."description" IS 'Описание';
COMMENT ON COLUMN "products"."attributes" IS 'Доп. атрибуты (JSON)';
COMMENT ON COLUMN "products"."created_at" IS 'Дата создания';
COMMENT ON COLUMN "products"."updated_at" IS 'Дата обновления';

COMMENT ON TABLE "variants" IS 'Варианты товаров (SKU)';
COMMENT ON COLUMN "variants"."product_id" IS 'ID продукта';
COMMENT ON COLUMN "variants"."company_id" IS 'Инвариант: === product.companyId';
COMMENT ON COLUMN "variants"."vendor_code" IS 'Артикул продавца (уникален в рамках компании)';
COMMENT ON COLUMN "variants"."master_price" IS 'Базовая цена';
COMMENT ON COLUMN "variants"."master_stock" IS 'Базовый остаток';
COMMENT ON COLUMN "variants"."size" IS 'Размер';
COMMENT ON COLUMN "variants"."color" IS 'Цвет';
COMMENT ON COLUMN "variants"."created_at" IS 'Дата создания';
COMMENT ON COLUMN "variants"."updated_at" IS 'Дата обновления';

COMMENT ON TABLE "variant_barcodes" IS 'Штрихкоды вариантов (index по company+barcode, не unique — ADR 0010)';
COMMENT ON COLUMN "variant_barcodes"."variant_id" IS 'ID варианта';
COMMENT ON COLUMN "variant_barcodes"."company_id" IS 'Инвариант: === variant.companyId';
COMMENT ON COLUMN "variant_barcodes"."barcode" IS 'Штрихкод';

COMMENT ON TABLE "listings" IS 'Привязка Variant ↔ MarketAccount (листинг на площадке)';
COMMENT ON COLUMN "listings"."company_id" IS 'Инвариант: === variant.companyId === marketAccount.companyId';
COMMENT ON COLUMN "listings"."variant_id" IS 'ID варианта';
COMMENT ON COLUMN "listings"."market_account_id" IS 'ID аккаунта маркетплейса';
COMMENT ON COLUMN "listings"."status" IS 'DRAFT, PUBLISHED, ERROR, ARCHIVED';
COMMENT ON COLUMN "listings"."sync_policy" IS 'Политика синхронизации';
COMMENT ON COLUMN "listings"."stock_sync_policy" IS 'Политика синхронизации остатков';
COMMENT ON COLUMN "listings"."price_sync_policy" IS 'Политика синхронизации цен';
COMMENT ON COLUMN "listings"."last_sync_at" IS 'Время последней синхронизации';
COMMENT ON COLUMN "listings"."last_sync_error" IS 'Текст последней ошибки';
COMMENT ON COLUMN "listings"."snapshot" IS 'Снимок данных с площадки (не master — ADR 0014)';
COMMENT ON COLUMN "listings"."snapshot_hash" IS 'sha256(stableStringify) — для проверки изменений';
COMMENT ON COLUMN "listings"."snapshot_updated_at" IS 'Обновляется только при смене hash';
COMMENT ON COLUMN "listings"."last_stock_origin" IS 'Origin tracking — защита от ping-pong';
COMMENT ON COLUMN "listings"."last_stock_hash" IS 'Hash остатка для origin tracking';
COMMENT ON COLUMN "listings"."last_stock_at" IS 'Время последнего обновления остатка';
COMMENT ON COLUMN "listings"."last_price_origin" IS 'Origin tracking для цен';
COMMENT ON COLUMN "listings"."last_price_hash" IS 'Hash цены для origin tracking';
COMMENT ON COLUMN "listings"."last_price_at" IS 'Время последнего обновления цены';

COMMENT ON TABLE "ozon_listing_ids" IS 'Внешние ID Ozon (product_id, sku, offerId)';
COMMENT ON COLUMN "ozon_listing_ids"."listing_id" IS 'ID листинга (1:1)';
COMMENT ON COLUMN "ozon_listing_ids"."market_account_id" IS 'ID аккаунта';
COMMENT ON COLUMN "ozon_listing_ids"."product_id" IS 'Ozon product_id (BigInt)';
COMMENT ON COLUMN "ozon_listing_ids"."sku" IS 'Ozon SKU (BigInt)';
COMMENT ON COLUMN "ozon_listing_ids"."offer_id" IS 'Артикул продавца (строка)';

COMMENT ON TABLE "wb_listing_ids" IS 'Внешние ID Wildberries (nmId, imtId, chrtId)';
COMMENT ON COLUMN "wb_listing_ids"."listing_id" IS 'ID листинга (1:1)';
COMMENT ON COLUMN "wb_listing_ids"."market_account_id" IS 'ID аккаунта';
COMMENT ON COLUMN "wb_listing_ids"."nm_id" IS 'Номенклатурный ID (BigInt)';
COMMENT ON COLUMN "wb_listing_ids"."imt_id" IS 'ID карточки (BigInt)';
COMMENT ON COLUMN "wb_listing_ids"."chrt_id" IS 'ID характеристики/SKU (BigInt)';

COMMENT ON TABLE "match_candidates" IS 'Кандидаты сопоставления (variantId nullable до подтверждения)';
COMMENT ON COLUMN "match_candidates"."variant_id" IS 'ID варианта (null до confirm)';
COMMENT ON COLUMN "match_candidates"."market_account_id" IS 'ID аккаунта';
COMMENT ON COLUMN "match_candidates"."external_ref_type" IS 'OZON_*/WB_* — тип внешнего ID';
COMMENT ON COLUMN "match_candidates"."external_ref" IS 'Нормализованный externalRef';
COMMENT ON COLUMN "match_candidates"."external_snapshot" IS 'Данные кандидата для UI';
COMMENT ON COLUMN "match_candidates"."external_snapshot_hash" IS 'sha256(stableStringify)';
COMMENT ON COLUMN "match_candidates"."external_updated_at" IS 'Обновляется только при смене snapshot';
COMMENT ON COLUMN "match_candidates"."match_method" IS 'BARCODE, VENDOR_CODE, NAME_BRAND, MANUAL';
COMMENT ON COLUMN "match_candidates"."status" IS 'PENDING, AUTO_MATCHED, MANUAL, CONFLICT';
COMMENT ON COLUMN "match_candidates"."confidence" IS 'Уверенность авто-матчинга';
COMMENT ON COLUMN "match_candidates"."confirmed_at" IS 'Время подтверждения';

COMMENT ON TABLE "idempotency_keys" IS 'Ключи идемпотентности для sync jobs';
COMMENT ON COLUMN "idempotency_keys"."company_id" IS 'ID компании (тенант)';
COMMENT ON COLUMN "idempotency_keys"."key" IS 'Ключ операции';
COMMENT ON COLUMN "idempotency_keys"."result" IS 'Результат (кеш)';
COMMENT ON COLUMN "idempotency_keys"."expires_at" IS 'Срок действия (cron cleanup)';
