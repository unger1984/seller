/** Контроллер компаний */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import type { z } from 'zod';
import { CreateCompanySchema } from '@seller/shared-types';
import type { CreateCompanyInput } from '@seller/shared-types';
import { CompanyService } from './company.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { Request } from 'express';

/** DTO создания компании — cast к zod из api для обхода TS2742 */
class CreateCompanyDto extends createZodDto(
  CreateCompanySchema as z.ZodTypeAny
) {}

@ApiTags('companies')
@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'Список компаний пользователя' })
  async list(@Req() req: Request & { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Unauthorized');
    return this.company.list(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать компанию' })
  @ApiBody({ type: CreateCompanyDto })
  async create(
    @Body() body: CreateCompanyDto,
    @Req() req: Request & { user?: { userId: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Unauthorized');
    return this.company.create(userId, body as CreateCompanyInput);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали компании' })
  async getById(
    @Param('id') id: string,
    @Req() req: Request & { user?: { userId: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Unauthorized');
    return this.company.getById(userId, id);
  }
}
