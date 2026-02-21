import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CompanyRole } from './enums.js';

@Entity('company_members')
@Unique(['userId', 'companyId'])
export class CompanyMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'enum', enum: CompanyRole, enumName: 'company_role_enum' })
  role!: CompanyRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne('User', 'companyMembers', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: import('./user.entity.js').User;

  @ManyToOne('Company', 'members', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: import('./company.entity.js').Company;
}
