import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738000000000 implements MigrationInterface {
  name = 'InitialSchema1738000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "marketplace_enum" AS ENUM ('OZON', 'WILDBERRIES')
    `);
    await queryRunner.query(`
      CREATE TYPE "sync_origin_enum" AS ENUM ('MASTER', 'OZON', 'WILDBERRIES')
    `);
    await queryRunner.query(`
      CREATE TYPE "company_role_enum" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
    `);

    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "is_active" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_companies_name" UNIQUE ("name"),
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "email_verified_at" TIMESTAMP,
        "is_active" boolean NOT NULL DEFAULT false,
        "last_active_company_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "company_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "role" "company_role_enum" NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_company_members_user_company" UNIQUE ("user_id", "company_id"),
        CONSTRAINT "PK_company_members" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "market_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "marketplace" "marketplace_enum" NOT NULL,
        "name" character varying NOT NULL,
        "credentials_encrypted" text NOT NULL,
        "credentials_version" integer NOT NULL DEFAULT 1,
        "credentials_hash" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_market_accounts_company_marketplace" UNIQUE ("company_id", "marketplace"),
        CONSTRAINT "PK_market_accounts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "brand" character varying,
        "description" text,
        "vendor_code" character varying NOT NULL,
        "attributes" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "variants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "vendor_code" character varying NOT NULL,
        "master_price" decimal(12,2) NOT NULL,
        "master_stock" integer NOT NULL DEFAULT 0,
        "size" character varying,
        "color" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_variants_company_vendor" UNIQUE ("company_id", "vendor_code"),
        CONSTRAINT "PK_variants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "variant_barcodes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "variant_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "barcode" character varying NOT NULL,
        CONSTRAINT "UQ_variant_barcodes_variant_barcode" UNIQUE ("variant_id", "barcode"),
        CONSTRAINT "PK_variant_barcodes" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "product_ozon" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "market_account_id" uuid NOT NULL,
        "ozon_product_id" bigint NOT NULL,
        "offer_id" character varying NOT NULL,
        "sku" bigint,
        "name" text,
        "barcode" character varying,
        "category_id" bigint,
        "description" text,
        "price" decimal(12,2),
        "old_price" decimal(12,2),
        "marketing_price" decimal(12,2),
        "premium_price" decimal(12,2),
        "recommended_price" decimal(12,2),
        "min_price" decimal(12,2),
        "currency_code" character varying,
        "stock_present" integer,
        "stock_reserved" integer,
        "stock_coming" integer,
        "primary_image" text,
        "images" jsonb,
        "images360" jsonb,
        "visible" boolean,
        "status" jsonb,
        "vat" character varying,
        "height_cm" decimal(10,2),
        "width_cm" decimal(10,2),
        "depth_cm" decimal(10,2),
        "weight_kg" decimal(10,3),
        "attributes" jsonb,
        "raw_info_list" jsonb,
        "raw_attributes" jsonb,
        "synced_at" TIMESTAMP,
        CONSTRAINT "UQ_product_ozon_product" UNIQUE ("product_id"),
        CONSTRAINT "UQ_product_ozon_account_ozon" UNIQUE ("market_account_id", "ozon_product_id"),
        CONSTRAINT "UQ_product_ozon_account_offer" UNIQUE ("market_account_id", "offer_id"),
        CONSTRAINT "PK_product_ozon" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "product_wb" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "market_account_id" uuid NOT NULL,
        "nm_id" bigint NOT NULL,
        "imt_id" bigint,
        "vendor_code" character varying NOT NULL,
        "subject_id" integer,
        "subject_name" text,
        "brand" character varying,
        "title" text,
        "description" text,
        "primary_photo" text,
        "photos" jsonb,
        "video" text,
        "wholesale_enabled" boolean,
        "wholesale_quantum" integer,
        "length_cm" decimal(10,2),
        "width_cm" decimal(10,2),
        "height_cm" decimal(10,2),
        "weight_kg" decimal(10,3),
        "characteristics" jsonb,
        "sizes" jsonb,
        "tags" jsonb,
        "raw_card" jsonb,
        "synced_at" TIMESTAMP,
        CONSTRAINT "UQ_product_wb_product" UNIQUE ("product_id"),
        CONSTRAINT "UQ_product_wb_account_nm" UNIQUE ("market_account_id", "nm_id"),
        CONSTRAINT "PK_product_wb" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "key" character varying NOT NULL,
        "result" jsonb,
        "expires_at" TIMESTAMP NOT NULL,
        CONSTRAINT "UQ_idempotency_keys_company_key" UNIQUE ("company_id", "key"),
        CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("id")
      )
    `);

    // Foreign keys
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_last_company"
        FOREIGN KEY ("last_active_company_id") REFERENCES "companies"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "company_members" ADD CONSTRAINT "FK_company_members_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "company_members" ADD CONSTRAINT "FK_company_members_company"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "market_accounts" ADD CONSTRAINT "FK_market_accounts_company"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "products" ADD CONSTRAINT "FK_products_company"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "variants" ADD CONSTRAINT "FK_variants_product"
        FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "variants" ADD CONSTRAINT "FK_variants_company"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "variant_barcodes" ADD CONSTRAINT "FK_variant_barcodes_variant"
        FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "variant_barcodes" ADD CONSTRAINT "FK_variant_barcodes_company"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "product_ozon" ADD CONSTRAINT "FK_product_ozon_product"
        FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "product_ozon" ADD CONSTRAINT "FK_product_ozon_market_account"
        FOREIGN KEY ("market_account_id") REFERENCES "market_accounts"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "product_wb" ADD CONSTRAINT "FK_product_wb_product"
        FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "product_wb" ADD CONSTRAINT "FK_product_wb_market_account"
        FOREIGN KEY ("market_account_id") REFERENCES "market_accounts"("id") ON DELETE CASCADE
    `);

    // Indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_company_members_user" ON "company_members" ("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_company_members_company" ON "company_members" ("company_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_market_accounts_company" ON "market_accounts" ("company_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_market_accounts_company_marketplace" ON "market_accounts" ("company_id", "marketplace")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_company" ON "products" ("company_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_company_vendor" ON "products" ("company_id", "vendor_code")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variants_product" ON "variants" ("product_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variants_company" ON "variants" ("company_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variants_company_product" ON "variants" ("company_id", "product_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variant_barcodes_company_barcode" ON "variant_barcodes" ("company_id", "barcode")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variant_barcodes_barcode" ON "variant_barcodes" ("barcode")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variant_barcodes_company" ON "variant_barcodes" ("company_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_ozon_market_account" ON "product_ozon" ("market_account_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_ozon_product" ON "product_ozon" ("product_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_wb_market_account" ON "product_wb" ("market_account_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_wb_product" ON "product_wb" ("product_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_idempotency_keys_expires" ON "idempotency_keys" ("expires_at")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FKs and tables in reverse order
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_last_company"`
    );
    await queryRunner.query(
      `ALTER TABLE "company_members" DROP CONSTRAINT IF EXISTS "FK_company_members_user"`
    );
    await queryRunner.query(
      `ALTER TABLE "company_members" DROP CONSTRAINT IF EXISTS "FK_company_members_company"`
    );
    await queryRunner.query(
      `ALTER TABLE "market_accounts" DROP CONSTRAINT IF EXISTS "FK_market_accounts_company"`
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_company"`
    );
    await queryRunner.query(
      `ALTER TABLE "variants" DROP CONSTRAINT IF EXISTS "FK_variants_product"`
    );
    await queryRunner.query(
      `ALTER TABLE "variants" DROP CONSTRAINT IF EXISTS "FK_variants_company"`
    );
    await queryRunner.query(
      `ALTER TABLE "variant_barcodes" DROP CONSTRAINT IF EXISTS "FK_variant_barcodes_variant"`
    );
    await queryRunner.query(
      `ALTER TABLE "variant_barcodes" DROP CONSTRAINT IF EXISTS "FK_variant_barcodes_company"`
    );
    await queryRunner.query(
      `ALTER TABLE "product_ozon" DROP CONSTRAINT IF EXISTS "FK_product_ozon_product"`
    );
    await queryRunner.query(
      `ALTER TABLE "product_ozon" DROP CONSTRAINT IF EXISTS "FK_product_ozon_market_account"`
    );
    await queryRunner.query(
      `ALTER TABLE "product_wb" DROP CONSTRAINT IF EXISTS "FK_product_wb_product"`
    );
    await queryRunner.query(
      `ALTER TABLE "product_wb" DROP CONSTRAINT IF EXISTS "FK_product_wb_market_account"`
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_wb"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_ozon"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "variant_barcodes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "variants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "company_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "companies"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "company_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_origin_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "marketplace_enum"`);
  }
}
