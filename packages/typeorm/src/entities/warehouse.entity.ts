import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Marketplace } from './enums.js';

/** Склад маркетплейса (WB offices, Ozon warehouses) */
@Entity('warehouses')
@Unique(['marketAccountId', 'externalId'])
@Index(['marketAccountId'])
@Index(['marketAccountId', 'marketplace'])
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'market_account_id', type: 'uuid' })
  marketAccountId!: string;

  @Column({ type: 'enum', enum: Marketplace, enumName: 'marketplace_enum' })
  marketplace!: Marketplace;

  /** ID склада в API маркетплейса (office.id для WB, warehouse_id для Ozon) */
  @Column({ name: 'external_id', type: 'varchar' })
  externalId!: string;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @ManyToOne('MarketAccount', 'warehouses', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'market_account_id' })
  marketAccount!: import('./market-account.entity.js').MarketAccount;

  @OneToMany('ProductWbWarehouseStock', 'warehouse')
  productWbStocks!: import('./product-wb-warehouse-stock.entity.js').ProductWbWarehouseStock[];

  @OneToMany('ProductOzonWarehouseStock', 'warehouse')
  productOzonStocks!: import('./product-ozon-warehouse-stock.entity.js').ProductOzonWarehouseStock[];
}
