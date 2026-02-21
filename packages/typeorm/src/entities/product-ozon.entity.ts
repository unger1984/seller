import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
@Entity('product_ozon')
@Unique(['marketAccountId', 'ozonProductId'])
@Unique(['marketAccountId', 'offerId'])
@Index(['marketAccountId'])
@Index(['productId'])
export class ProductOzon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid', unique: true })
  productId!: string;

  @Column({ name: 'market_account_id', type: 'uuid' })
  marketAccountId!: string;

  @Column({ name: 'ozon_product_id', type: 'bigint' })
  ozonProductId!: string;

  @Column({ name: 'offer_id', type: 'varchar' })
  offerId!: string;

  @Column({ type: 'bigint', nullable: true })
  sku!: string | null;

  @Column({ name: 'name', type: 'text', nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', nullable: true })
  barcode!: string | null;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  price!: string | null;

  @Column({
    name: 'old_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  oldPrice!: string | null;

  @Column({
    name: 'marketing_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  marketingPrice!: string | null;

  @Column({
    name: 'premium_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  premiumPrice!: string | null;

  @Column({
    name: 'recommended_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  recommendedPrice!: string | null;

  @Column({
    name: 'min_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  minPrice!: string | null;

  @Column({ name: 'currency_code', type: 'varchar', nullable: true })
  currencyCode!: string | null;

  @Column({ name: 'stock_present', type: 'int', nullable: true })
  stockPresent!: number | null;

  @Column({ name: 'stock_reserved', type: 'int', nullable: true })
  stockReserved!: number | null;

  @Column({ name: 'stock_coming', type: 'int', nullable: true })
  stockComing!: number | null;

  @Column({ name: 'primary_image', type: 'text', nullable: true })
  primaryImage!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  images!: unknown;

  @Column({ name: 'images360', type: 'jsonb', nullable: true })
  images360!: unknown;

  @Column({ type: 'boolean', nullable: true })
  visible!: boolean | null;

  @Column({ type: 'jsonb', nullable: true })
  status!: unknown;

  @Column({ type: 'varchar', nullable: true })
  vat!: string | null;

  @Column({
    name: 'height_cm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  heightCm!: string | null;

  @Column({
    name: 'width_cm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  widthCm!: string | null;

  @Column({
    name: 'depth_cm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  depthCm!: string | null;

  @Column({
    name: 'weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  weightKg!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attributes!: unknown;

  @Column({ name: 'raw_info_list', type: 'jsonb', nullable: true })
  rawInfoList!: unknown;

  @Column({ name: 'raw_attributes', type: 'jsonb', nullable: true })
  rawAttributes!: unknown;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt!: Date | null;

  @ManyToOne('MarketAccount', 'productOzons', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'market_account_id' })
  marketAccount!: import('./market-account.entity.js').MarketAccount;

  @OneToOne('Product', 'productOzon', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: import('./product.entity.js').Product;

  @OneToMany('ProductOzonWarehouseStock', 'productOzon')
  warehouseStocks!: import('./product-ozon-warehouse-stock.entity.js').ProductOzonWarehouseStock[];
}
