import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany('CompanyMember', 'company')
  members!: import('./company-member.entity.js').CompanyMember[];

  @OneToMany('MarketAccount', 'company')
  marketAccounts!: import('./market-account.entity.js').MarketAccount[];

  @OneToMany('Product', 'company')
  products!: import('./product.entity.js').Product[];
}
