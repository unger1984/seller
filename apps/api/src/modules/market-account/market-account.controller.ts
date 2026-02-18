/** Контроллер аккаунтов маркетплейсов */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import type { z } from 'zod';
import {
  CreateMarketAccountSchema,
  UpdateMarketAccountCredentialsSchema,
} from '@seller/shared-types';
import type {
  CreateMarketAccountInput,
  UpdateMarketAccountCredentialsInput,
} from '@seller/shared-types';
import { MarketAccountService } from './market-account.service.js';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../shared/guards/tenant.guard.js';
import type { JwtUser } from '../../shared/common/types.js';
import { Request } from 'express';

class CreateMarketAccountDto extends createZodDto(
  CreateMarketAccountSchema as z.ZodTypeAny
) {}
class UpdateMarketAccountCredentialsDto extends createZodDto(
  UpdateMarketAccountCredentialsSchema as z.ZodTypeAny
) {}

@ApiTags('market-accounts')
@Controller('companies/:companyId/accounts')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MarketAccountController {
  constructor(private readonly service: MarketAccountService) {}

  @Get()
  @ApiOperation({ summary: 'Список аккаунтов компании' })
  async list(
    @Param('companyId') _companyId: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.list(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Подключить аккаунт' })
  @ApiBody({ type: CreateMarketAccountDto })
  async create(
    @Param('companyId') _companyId: string,
    @Body() body: CreateMarketAccountDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.create(companyId, body as CreateMarketAccountInput);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить credentials' })
  @ApiBody({ type: UpdateMarketAccountCredentialsDto })
  async updateCredentials(
    @Param('companyId') _companyId: string,
    @Param('id') id: string,
    @Body() body: UpdateMarketAccountCredentialsDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.updateCredentials(
      companyId,
      id,
      body as UpdateMarketAccountCredentialsInput
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Отключить аккаунт' })
  async delete(
    @Param('companyId') _companyId: string,
    @Param('id') id: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.delete(companyId, id);
  }
}
