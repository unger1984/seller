import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
@Entity('variant_barcodes')
@Unique(['variantId', 'barcode'])
@Index(['companyId', 'barcode'])
@Index(['barcode'])
@Index(['companyId'])
export class VariantBarcode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar' })
  barcode!: string;

  @ManyToOne('Variant', 'barcodes', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant!: import('./variant.entity.js').Variant;
}
