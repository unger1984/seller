import { Entity, PrimaryGeneratedColumn, Column, Unique, Index } from 'typeorm';

@Entity('idempotency_keys')
@Unique(['companyId', 'key'])
@Index(['expiresAt'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'key', type: 'varchar' })
  key!: string;

  @Column({ type: 'jsonb', nullable: true })
  result!: unknown;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;
}
