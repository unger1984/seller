/** Guard: param.companyId = activeCompanyId из JWT; компания должна быть активна */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '@seller/typeorm';
import type { JwtUser } from '../common/types.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>
  ) {}

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
    const company = await this.companyRepo.findOne({
      where: { id: activeCompanyId },
      select: ['id', 'isActive'],
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
