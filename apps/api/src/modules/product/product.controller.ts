/** Контроллер продуктов, вариантов и штрихкодов */
import {
  Body,
  Controller,
  Delete,
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
  CreateProductSchema,
  UpdateProductSchema,
  ProductListQuerySchema,
  CreateVariantSchema,
  UpdateVariantSchema,
  AddBarcodeSchema,
} from '@seller/shared-types';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductListQuery,
  CreateVariantInput,
  UpdateVariantInput,
  AddBarcodeInput,
} from '@seller/shared-types';
import { ProductService } from './product.service.js';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../shared/guards/tenant.guard.js';
import type { JwtUser } from '../../shared/common/types.js';
import { Request } from 'express';

class CreateProductDto extends createZodDto(
  CreateProductSchema as z.ZodTypeAny
) {}
class UpdateProductDto extends createZodDto(
  UpdateProductSchema as z.ZodTypeAny
) {}
class CreateVariantDto extends createZodDto(
  CreateVariantSchema as z.ZodTypeAny
) {}
class UpdateVariantDto extends createZodDto(
  UpdateVariantSchema as z.ZodTypeAny
) {}
class AddBarcodeDto extends createZodDto(AddBarcodeSchema as z.ZodTypeAny) {}

@ApiTags('products')
@Controller('companies/:companyId/products')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Список продуктов' })
  async list(
    @Param('companyId') _companyId: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    const parsed = ProductListQuerySchema.parse(query);
    return this.service.list(companyId, parsed as ProductListQuery);
  }

  @Post('clear')
  @ApiOperation({
    summary: 'Очистить каталог',
    description:
      'Удаляет все товары компании из БД. Не затрагивает данные на маркетплейсах.',
  })
  async clearCatalog(
    @Param('companyId') _companyId: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.clearCatalog(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать продукт' })
  @ApiBody({ type: CreateProductDto })
  async create(
    @Param('companyId') _companyId: string,
    @Body() body: CreateProductDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.create(companyId, body as CreateProductInput);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали продукта с вариантами' })
  async getById(
    @Param('companyId') _companyId: string,
    @Param('id') id: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.getById(companyId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить продукт' })
  @ApiBody({ type: UpdateProductDto })
  async update(
    @Param('companyId') _companyId: string,
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.update(companyId, id, body as UpdateProductInput);
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Варианты продукта' })
  async listVariants(
    @Param('companyId') _companyId: string,
    @Param('id') productId: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.listVariants(companyId, productId);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Добавить вариант' })
  @ApiBody({ type: CreateVariantDto })
  async addVariant(
    @Param('companyId') _companyId: string,
    @Param('id') productId: string,
    @Body() body: CreateVariantDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.addVariant(
      companyId,
      productId,
      body as CreateVariantInput
    );
  }

  @Patch(':id/variants/:variantId')
  @ApiOperation({ summary: 'Обновить вариант' })
  @ApiBody({ type: UpdateVariantDto })
  async updateVariant(
    @Param('companyId') _companyId: string,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() body: UpdateVariantDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.updateVariant(
      companyId,
      productId,
      variantId,
      body as UpdateVariantInput
    );
  }

  @Post(':id/variants/:variantId/barcodes')
  @ApiOperation({ summary: 'Добавить штрихкод к варианту' })
  @ApiBody({ type: AddBarcodeDto })
  async addBarcode(
    @Param('companyId') _companyId: string,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() body: AddBarcodeDto,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.addBarcode(
      companyId,
      productId,
      variantId,
      body as AddBarcodeInput
    );
  }

  @Delete(':id/variants/:variantId/barcodes/:barcodeId')
  @ApiOperation({ summary: 'Удалить штрихкод' })
  async deleteBarcode(
    @Param('companyId') _companyId: string,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Param('barcodeId') barcodeId: string,
    @Req() req: Request & { user?: JwtUser }
  ) {
    const companyId = req.user?.activeCompanyId;
    if (!companyId) throw new Error('Active company not set');
    return this.service.deleteBarcode(
      companyId,
      productId,
      variantId,
      barcodeId
    );
  }
}
