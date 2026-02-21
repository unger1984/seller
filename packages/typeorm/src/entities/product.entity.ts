import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
@Entity('products')
@Index(['companyId'])
@Index(['companyId', 'vendorCode'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  brand!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'vendor_code', type: 'varchar' })
  vendorCode!: string;

  @Column({ type: 'jsonb', nullable: true })
  attributes!: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne('Company', 'products', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: import('./company.entity.js').Company;

  @OneToMany('Variant', 'product')
  variants!: import('./variant.entity.js').Variant[];

  @OneToOne('ProductOzon', 'product', { nullable: true })
  productOzon!: import('./product-ozon.entity.js').ProductOzon | null;

  @OneToOne('ProductWb', 'product', { nullable: true })
  productWb!: import('./product-wb.entity.js').ProductWb | null;
}
