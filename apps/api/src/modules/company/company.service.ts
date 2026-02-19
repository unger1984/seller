/** Сервис компаний */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { CreateCompanyInput } from '@seller/shared-types';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Список компаний, где user — member */
  async list(userId: string) {
    const members = await this.prisma.companyMember.findMany({
      where: { userId },
      include: { company: true },
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
      const company = await this.prisma.company.create({
        data: {
          name: data.name,
          members: {
            create: {
              userId,
              role: CompanyRole.OWNER,
            },
          },
        },
      });
      return company;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Компания с таким названием уже существует'
        );
      }
      throw err;
    }
  }

  /** Детали компании — только если user member */
  async getById(userId: string, companyId: string) {
    const member = await this.prisma.companyMember.findUnique({
      where: { userId_companyId: { userId, companyId } },
      include: { company: true },
    });
    if (!member) {
      throw new NotFoundException('Company not found');
    }
    return member.company;
  }
}
