import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

/** Остатки WB по складу: товар — склад — количество */
@Entity('product_wb_warehouse_stock')
@Index(['productWbId'])
@Index(['warehouseId'])
export class ProductWbWarehouseStock {
  @PrimaryColumn({ name: 'product_wb_id', type: 'uuid' })
  productWbId!: string;

  @PrimaryColumn({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @ManyToOne('ProductWb', 'warehouseStocks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_wb_id' })
  productWb!: import('./product-wb.entity.js').ProductWb;

  @ManyToOne('Warehouse', 'productWbStocks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: import('./warehouse.entity.js').Warehouse;
}
