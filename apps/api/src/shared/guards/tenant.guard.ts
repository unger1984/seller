/** Guard: param.companyId должен совпадать с activeCompanyId из JWT → 403 при несовпадении */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import type { JwtUser } from '../common/types.js';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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
    return true;
  }
}
