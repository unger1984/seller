/** Контроллер листингов */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import type { z } from 'zod';
import {
  CreateListingSchema,
  UpdateListingPolicySchema,
  ListingListQuerySchema,
} from '@seller/shared-types';
import type {
  CreateListingInput,
  UpdateListingPolicyInput,
  ListingListQuery,
} from '@seller/shared-types';
import { ListingService } from './listing.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import type { JwtUser } from '../common/types';
import { Request } from 'express';

class CreateListingDto extends createZodDto(
  CreateListingSchema as z.ZodTypeAny
) {}
class UpdateListingPolicyDto extends createZodDto(
  UpdateListingPolicySchema as z.ZodTypeAny
) {}

@ApiTags('listings')
@Controller('companies/:companyId/listings')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ListingController {
  constructor(private readonly service: ListingService) {}

  @Get()
  @ApiOperation({ summary: 'Список листингов' })
  async list(
    @Param('companyId') _companyId: string,
    @Query() query: z.infer<typeof ListingListQuerySchema>,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.list(companyId, query as ListingListQuery);
  }

  @Post()
  @ApiOperation({ summary: 'Создать листинг' })
  @ApiBody({ type: CreateListingDto })
  async create(
    @Param('companyId') _companyId: string,
    @Body() body: CreateListingDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.create(companyId, body as CreateListingInput);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить policy' })
  @ApiBody({ type: UpdateListingPolicyDto })
  async updatePolicy(
    @Param('companyId') _companyId: string,
    @Param('id') id: string,
    @Body() body: UpdateListingPolicyDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.updatePolicy(
      companyId,
      id,
      body as UpdateListingPolicyInput
    );
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Опубликовать листинг' })
  async publish(
    @Param('companyId') _companyId: string,
    @Param('id') id: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.publish(companyId, id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Запустить синхронизацию' })
  async triggerSync(
    @Param('companyId') _companyId: string,
    @Param('id') id: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.triggerSync(companyId, id);
  }
}
