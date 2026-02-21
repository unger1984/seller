import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Склады и остатки по складам. Миграция данных из product_wb.stock_by_warehouse */
export class WarehouseStocks1771668575239 implements MigrationInterface {
  name = 'WarehouseStocks1771668575239';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "warehouses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "market_account_id" uuid NOT NULL,
        "marketplace" "marketplace_enum" NOT NULL,
        "external_id" varchar NOT NULL,
        "name" varchar,
        CONSTRAINT "UQ_warehouses_market_account_external"
          UNIQUE ("market_account_id", "external_id")
      )
    `);
    await queryRunner.query(`
      COMMENT ON TABLE "warehouses" IS 'Склады маркетплейсов (WB offices, Ozon warehouses)'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_warehouses_market_account" ON "warehouses" ("market_account_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_warehouses_market_account_marketplace"
      ON "warehouses" ("market_account_id", "marketplace")
    `);
    await queryRunner.query(`
      ALTER TABLE "warehouses"
      ADD CONSTRAINT "FK_warehouses_market_account"
      FOREIGN KEY ("market_account_id") REFERENCES "market_accounts"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "product_wb_warehouse_stock" (
        "product_wb_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        PRIMARY KEY ("product_wb_id", "warehouse_id"),
        CONSTRAINT "FK_pwbws_product_wb"
          FOREIGN KEY ("product_wb_id") REFERENCES "product_wb"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pwbws_warehouse"
          FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      COMMENT ON TABLE "product_wb_warehouse_stock" IS 'Остатки WB по складам'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pwbws_product_wb" ON "product_wb_warehouse_stock" ("product_wb_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pwbws_warehouse" ON "product_wb_warehouse_stock" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "product_ozon_warehouse_stock" (
        "product_ozon_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        PRIMARY KEY ("product_ozon_id", "warehouse_id"),
        CONSTRAINT "FK_poews_product_ozon"
          FOREIGN KEY ("product_ozon_id") REFERENCES "product_ozon"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_poews_warehouse"
          FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      COMMENT ON TABLE "product_ozon_warehouse_stock" IS 'Остатки Ozon по складам'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_poews_product_ozon" ON "product_ozon_warehouse_stock" ("product_ozon_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_poews_warehouse" ON "product_ozon_warehouse_stock" ("warehouse_id")
    `);

    // Миграция данных из product_wb.stock_by_warehouse (если колонка есть)
    const hasStockByWarehouse = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'product_wb'
       AND column_name = 'stock_by_warehouse' LIMIT 1`
    );

    if (hasStockByWarehouse.length > 0) {
      await queryRunner.query(`
        INSERT INTO "warehouses" ("id", "market_account_id", "marketplace", "external_id", "name")
        SELECT gen_random_uuid(), "market_account_id", 'WILDBERRIES'::"marketplace_enum", "external_id", "external_id"
        FROM (
          SELECT DISTINCT pw.market_account_id, kv.key AS external_id
          FROM product_wb pw,
               jsonb_each_text(COALESCE(pw.stock_by_warehouse, '{}'::jsonb)) kv
          WHERE pw.stock_by_warehouse IS NOT NULL AND kv.key != ''
        ) sub
        ON CONFLICT ("market_account_id", "external_id") DO NOTHING
      `);

      await queryRunner.query(`
        INSERT INTO "product_wb_warehouse_stock" ("product_wb_id", "warehouse_id", "quantity")
        SELECT pw.id, w.id, GREATEST(0, (kv.value)::int)
        FROM product_wb pw
        CROSS JOIN jsonb_each_text(COALESCE(pw.stock_by_warehouse, '{}'::jsonb)) kv
        INNER JOIN warehouses w
          ON w.market_account_id = pw.market_account_id
          AND w.external_id = kv.key
          AND w.marketplace = 'WILDBERRIES'
        WHERE pw.stock_by_warehouse IS NOT NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "product_wb" DROP COLUMN "stock_by_warehouse"
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_wb" ADD COLUMN IF NOT EXISTS "stock_by_warehouse" jsonb
    `);

    await queryRunner.query(`
      UPDATE product_wb pw SET stock_by_warehouse = sub.agg
      FROM (
        SELECT product_wb_id,
               jsonb_object_agg(w.external_id, quantity) AS agg
        FROM product_wb_warehouse_stock pws
        JOIN warehouses w ON w.id = pws.warehouse_id
        GROUP BY product_wb_id
      ) sub
      WHERE pw.id = sub.product_wb_id
    `);

    await queryRunner.query(
      `DROP TABLE IF EXISTS "product_ozon_warehouse_stock"`
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "product_wb_warehouse_stock"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouses"`);
  }
}
