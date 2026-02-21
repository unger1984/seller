import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
@Entity('product_wb')
@Unique(['marketAccountId', 'nmId'])
@Index(['marketAccountId'])
@Index(['productId'])
export class ProductWb {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid', unique: true })
  productId!: string;

  @Column({ name: 'market_account_id', type: 'uuid' })
  marketAccountId!: string;

  @Column({ name: 'nm_id', type: 'bigint' })
  nmId!: string;

  @Column({ name: 'imt_id', type: 'bigint', nullable: true })
  imtId!: string | null;

  @Column({ name: 'vendor_code', type: 'varchar' })
  vendorCode!: string;

  @Column({ name: 'subject_id', type: 'int', nullable: true })
  subjectId!: number | null;

  @Column({ name: 'subject_name', type: 'text', nullable: true })
  subjectName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  brand!: string | null;

  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'primary_photo', type: 'text', nullable: true })
  primaryPhoto!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photos!: unknown;

  @Column({ type: 'text', nullable: true })
  video!: string | null;

  @Column({ name: 'wholesale_enabled', type: 'boolean', nullable: true })
  wholesaleEnabled!: boolean | null;

  @Column({ name: 'wholesale_quantum', type: 'int', nullable: true })
  wholesaleQuantum!: number | null;

  @Column({
    name: 'length_cm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  lengthCm!: string | null;

  @Column({
    name: 'width_cm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  widthCm!: string | null;

  @Column({
    name: 'height_cm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  heightCm!: string | null;

  @Column({
    name: 'weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  weightKg!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  characteristics!: unknown;

  @Column({ type: 'jsonb', nullable: true })
  sizes!: unknown;

  @Column({ type: 'jsonb', nullable: true })
  tags!: unknown;

  @Column({ name: 'raw_card', type: 'jsonb', nullable: true })
  rawCard!: unknown;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt!: Date | null;

  @ManyToOne('MarketAccount', 'productWbs', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'market_account_id' })
  marketAccount!: import('./market-account.entity.js').MarketAccount;

  @OneToOne('Product', 'productWb', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: import('./product.entity.js').Product;
}
