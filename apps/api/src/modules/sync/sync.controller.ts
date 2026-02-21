/** Контроллер синхронизации */
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
import type { z } from 'zod';
import { createLogger } from '@seller/shared';
import { ImportCatalogSchema } from '@seller/shared-types';
import type { ImportCatalogInput } from '@seller/shared-types';
import { SyncService } from './sync.service.js';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../shared/guards/tenant.guard.js';
import type { JwtUser } from '../../shared/common/types.js';
import { Request } from 'express';

class ImportCatalogDto extends createZodDto(
  ImportCatalogSchema as z.ZodTypeAny
) {}

@ApiTags('sync')
@Controller('companies/:companyId/sync')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SyncController {
  private readonly log = createLogger(SyncController.name);

  constructor(private readonly service: SyncService) {}

  @Get('import/status')
  @ApiOperation({ summary: 'Статус импорта по маркетам' })
  async getImportStatus(@Req() req: Request & { user?: JwtUser }) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.getImportStatus(companyId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'История jobs' })
  async listJobs(
    @Param('companyId') _companyId: string,
    @Query() query: { page?: number; limit?: number },
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.listJobs(companyId, query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Детали job' })
  async getJob(
    @Param('companyId') _companyId: string,
    @Param('id') jobId: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.getJob(companyId, jobId);
  }

  @Post('import')
  @ApiOperation({ summary: 'Запустить импорт каталога' })
  @ApiBody({ type: ImportCatalogDto })
  async importCatalog(
    @Param('companyId') _companyId: string,
    @Body() body: ImportCatalogDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    const input = body as ImportCatalogInput;
    this.log.i('Import catalog requested', {
      companyId,
      marketAccountId: input.marketAccountId,
    });
    const result = await this.service.importCatalog(companyId, input);
    this.log.i('Import catalog response', {
      companyId,
      jobId: result.jobId,
    });
    return result;
  }
}
