/** Guard: param.companyId = activeCompanyId из JWT; компания должна быть активна */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtUser } from '../common/types.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const paramCompanyId = req.params['companyId'];
    const activeCompanyId = (req.user as JwtUser | undefined)?.activeCompanyId;

    if (!activeCompanyId) {
      throw new ForbiddenException('Активная компания не выбрана');
    }
    if (paramCompanyId && paramCompanyId !== activeCompanyId) {
      throw new ForbiddenException(
        'ID компании в URL не совпадает с активной компанией'
      );
    }
    const company = await this.prisma.company.findUnique({
      where: { id: activeCompanyId },
      select: { isActive: true },
    });
    if (!company) {
      throw new ForbiddenException('Компания не найдена');
    }
    if (!company.isActive) {
      throw new ForbiddenException('Компания не активирована');
    }
    return true;
  }
}
