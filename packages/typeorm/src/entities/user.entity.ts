import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash!: string;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'last_active_company_id', type: 'uuid', nullable: true })
  lastActiveCompanyId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne('Company', { nullable: true })
  @JoinColumn({ name: 'last_active_company_id' })
  lastActiveCompany!: import('./company.entity.js').Company | null;

  @OneToMany('CompanyMember', 'user')
  companyMembers!: import('./company-member.entity.js').CompanyMember[];
}
