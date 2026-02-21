/** Сервис компаний */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Company, CompanyMember, CompanyRole } from '@seller/typeorm';
import type { CreateCompanyInput } from '@seller/shared-types';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyMember)
    private readonly memberRepo: Repository<CompanyMember>,
    private readonly dataSource: DataSource
  ) {}

  /** Список компаний, где user — member */
  async list(userId: string) {
    const members = await this.memberRepo.find({
      where: { userId },
      relations: { company: true },
    });
    return members.map((m) => ({
      id: m.company.id,
      name: m.company.name,
      role: m.role,
      createdAt: m.company.createdAt,
    }));
  }

  /** Создать компанию и добавить user как OWNER */
  async create(userId: string, data: CreateCompanyInput) {
    try {
      return await this.dataSource.transaction(async (tx) => {
        const company = tx.getRepository(Company).create({ name: data.name });
        await tx.getRepository(Company).save(company);
        const member = tx.getRepository(CompanyMember).create({
          userId,
          companyId: company.id,
          role: CompanyRole.OWNER,
        });
        await tx.getRepository(CompanyMember).save(member);
        return company;
      });
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === '23505') {
        throw new ConflictException(
          'Компания с таким названием уже существует'
        );
      }
      throw err;
    }
  }

  /** Детали компании — только если user member */
  async getById(userId: string, companyId: string) {
    const member = await this.memberRepo.findOne({
      where: { userId, companyId },
      relations: { company: true },
    });
    if (!member) {
      throw new NotFoundException('Компания не найдена');
    }
    return member.company;
  }
}
