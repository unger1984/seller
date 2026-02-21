import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

/** Остатки Ozon по складу: товар — склад — количество */
@Entity('product_ozon_warehouse_stock')
@Index(['productOzonId'])
@Index(['warehouseId'])
export class ProductOzonWarehouseStock {
  @PrimaryColumn({ name: 'product_ozon_id', type: 'uuid' })
  productOzonId!: string;

  @PrimaryColumn({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @ManyToOne('ProductOzon', 'warehouseStocks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_ozon_id' })
  productOzon!: import('./product-ozon.entity.js').ProductOzon;

  @ManyToOne('Warehouse', 'productOzonStocks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: import('./warehouse.entity.js').Warehouse;
}
