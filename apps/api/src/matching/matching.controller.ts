/** Контроллер матчинга кандидатов */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MatchCandidateListQuerySchema } from '@seller/shared-types';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import type { JwtUser } from '../common/types';
import { Request } from 'express';

const ConfirmMatchSchema = z.object({ variantId: z.string().min(1) });
class ConfirmMatchDto extends createZodDto(ConfirmMatchSchema) {}

@ApiTags('matching')
@Controller('companies/:companyId/match-candidates')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MatchingController {
  constructor(private readonly service: MatchingService) {}

  @Get()
  @ApiOperation({ summary: 'Кандидаты на сопоставление' })
  async list(
    @Param('companyId') _companyId: string,
    @Query() query: z.infer<typeof MatchCandidateListQuerySchema>,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.list(companyId, query);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Подтвердить сопоставление' })
  @ApiBody({ type: ConfirmMatchDto })
  async confirm(
    @Param('companyId') _companyId: string,
    @Param('id') candidateId: string,
    @Body() body: ConfirmMatchDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.confirm(companyId, candidateId, body.variantId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Отклонить кандидата' })
  async reject(
    @Param('companyId') _companyId: string,
    @Param('id') candidateId: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.reject(companyId, candidateId);
  }
}
