import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Marketplace } from './enums.js';

@Entity('market_accounts')
@Unique(['companyId', 'marketplace'])
@Index(['companyId'])
@Index(['companyId', 'marketplace'])
export class MarketAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'enum', enum: Marketplace, enumName: 'marketplace_enum' })
  marketplace!: Marketplace;

  @Column({ name: 'name', type: 'varchar' })
  name!: string;

  @Column({ name: 'credentials_encrypted', type: 'text' })
  credentialsEncrypted!: string;

  @Column({ name: 'credentials_version', type: 'int', default: 1 })
  credentialsVersion!: number;

  @Column({ name: 'credentials_hash', type: 'varchar', nullable: true })
  credentialsHash!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne('Company', 'marketAccounts', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: import('./company.entity.js').Company;

  @OneToMany('ProductOzon', 'marketAccount')
  productOzons!: import('./product-ozon.entity.js').ProductOzon[];

  @OneToMany('ProductWb', 'marketAccount')
  productWbs!: import('./product-wb.entity.js').ProductWb[];

  @OneToMany('Warehouse', 'marketAccount')
  warehouses!: import('./warehouse.entity.js').Warehouse[];
}
