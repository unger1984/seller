/** Сервис матчинга — подтверждение/отклонение кандидатов */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Список кандидатов (PENDING, CONFLICT) */
  async list(
    companyId: string,
    query: { page?: number; limit?: number; status?: 'PENDING' | 'CONFLICT' }
  ) {
    const { page = 1, limit = 20, status } = query;
    const where: {
      marketAccount: { companyId: string };
      status?: MatchStatus;
    } = { marketAccount: { companyId } };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.matchCandidate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          marketAccount: {
            select: { id: true, name: true, marketplace: true },
          },
          variant: {
            include: {
              product: { select: { name: true } },
              barcodes: true,
            },
          },
        },
      }),
      this.prisma.matchCandidate.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** Подтвердить матч — в транзакции: validate, set variantId, confirmedAt, status */
  async confirm(companyId: string, candidateId: string, variantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.matchCandidate.findFirst({
        where: { id: candidateId },
        include: { marketAccount: true },
      });
      if (!candidate) throw new NotFoundException('Match candidate not found');
      if (candidate.marketAccount.companyId !== companyId)
        throw new ForbiddenException('Company mismatch');

      const variant = await tx.variant.findFirst({
        where: { id: variantId, companyId },
      });
      if (!variant) throw new NotFoundException('Variant not found');
      if (variant.companyId !== candidate.marketAccount.companyId)
        throw new ForbiddenException(
          'Variant and market account company mismatch'
        );

      return tx.matchCandidate.update({
        where: { id: candidateId },
        data: {
          variantId,
          status: MatchStatus.MANUAL,
          confirmedAt: new Date(),
        },
      });
    });
  }

  /** Отклонить — удалить кандидата */
  async reject(companyId: string, candidateId: string) {
    const candidate = await this.prisma.matchCandidate.findFirst({
      where: { id: candidateId },
      include: { marketAccount: true },
    });
    if (!candidate) throw new NotFoundException('Match candidate not found');
    if (candidate.marketAccount.companyId !== companyId)
      throw new ForbiddenException('Company mismatch');

    await this.prisma.matchCandidate.delete({ where: { id: candidateId } });
    return { deleted: true };
  }
}
