import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Индекс для списка продуктов: фильтр по company_id + сортировка по updated_at DESC */
export class ProductsListIndex1738000001000 implements MigrationInterface {
  name = 'ProductsListIndex1738000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_products_company_updated"
      ON "products" ("company_id", "updated_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_products_company_updated"
    `);
  }
}
