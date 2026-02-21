import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
@Entity('variants')
@Unique(['companyId', 'vendorCode'])
@Index(['productId'])
@Index(['companyId'])
@Index(['companyId', 'productId'])
export class Variant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'vendor_code', type: 'varchar' })
  vendorCode!: string;

  @Column({
    name: 'master_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  masterPrice!: string;

  @Column({ name: 'master_stock', type: 'int', default: 0 })
  masterStock!: number;

  @Column({ type: 'varchar', nullable: true })
  size!: string | null;

  @Column({ type: 'varchar', nullable: true })
  color!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne('Product', 'variants', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: import('./product.entity.js').Product;

  @OneToMany('VariantBarcode', 'variant')
  barcodes!: import('./variant-barcode.entity.js').VariantBarcode[];
}
