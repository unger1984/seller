import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Цена и остаток в product_wb — сгенерировано TypeORM, обрезано до целевых изменений */
export class ProductWbPriceStock1771668575238 implements MigrationInterface {
  name = 'ProductWbPriceStock1771668575238';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_wb"
      ADD COLUMN IF NOT EXISTS "price" numeric(12,2),
      ADD COLUMN IF NOT EXISTS "stock_present" integer,
      ADD COLUMN IF NOT EXISTS "stock_by_warehouse" jsonb
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "product_wb"."price" IS 'Цена товара на WB (руб)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "product_wb"."stock_present" IS 'Сумма остатков по всем складам WB'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "product_wb"."stock_by_warehouse" IS 'Остатки по складам: { [warehouseId]: quantity }'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_wb"
      DROP COLUMN IF EXISTS "stock_by_warehouse",
      DROP COLUMN IF EXISTS "price",
      DROP COLUMN IF EXISTS "stock_present"
    `);
  }
}
