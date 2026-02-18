/** Guard: param.companyId должен совпадать с activeCompanyId из JWT → 403 при несовпадении */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import type { JwtUser } from '../common/types';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const paramCompanyId = req.params['companyId'];
    const activeCompanyId = (req.user as JwtUser | undefined)?.activeCompanyId;

    if (!activeCompanyId) {
      throw new ForbiddenException('Active company not set');
    }
    if (paramCompanyId && paramCompanyId !== activeCompanyId) {
      throw new ForbiddenException(
        'Company ID in URL does not match active company'
      );
    }
    return true;
  }
}
