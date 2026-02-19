/** Сервис продуктов и вариантов — CRUD с инвариантами companyId */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductListQuery,
  CreateVariantInput,
  UpdateVariantInput,
  AddBarcodeInput,
} from '@seller/shared-types';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  /** Список продуктов с пагинацией */
  async list(companyId: string, query: ProductListQuery) {
    const { page, limit, search, brand } = query;
    const where: {
      companyId: string;
      name?: { contains: string; mode: 'insensitive' };
      brand?: string;
    } = {
      companyId,
    };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (brand) where.brand = brand;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { variants: { select: { id: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** Создать продукт */
  async create(companyId: string, data: CreateProductInput) {
    return this.prisma.product.create({
      data: {
        companyId,
        name: data.name,
        brand: data.brand ?? null,
        description: data.description ?? null,
        ...(data.attributes !== undefined && {
          attributes: (data.attributes === null
            ? Prisma.JsonNull
            : data.attributes) as Prisma.InputJsonValue,
        }),
      },
    });
  }

  /** Детали продукта с вариантами и листингами */
  async getById(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: {
        variants: {
          include: {
            barcodes: true,
            listings: {
              include: {
                marketAccount: {
                  select: { id: true, name: true, marketplace: true },
                },
              },
            },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  /** Обновить продукт */
  async update(companyId: string, id: string, data: UpdateProductInput) {
    const p = await this.prisma.product.findFirst({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Товар не найден');
    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name ?? p.name,
        brand: data.brand !== undefined ? data.brand : p.brand,
        description:
          data.description !== undefined ? data.description : p.description,
        ...(data.attributes !== undefined && {
          attributes: (data.attributes === null
            ? Prisma.JsonNull
            : data.attributes) as Prisma.InputJsonValue,
        }),
      },
    });
  }

  /** Список вариантов продукта */
  async listVariants(companyId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    return this.prisma.variant.findMany({
      where: { productId },
      include: { barcodes: true },
    });
  }

  /** Добавить вариант — companyId из product */
  async addVariant(
    companyId: string,
    productId: string,
    data: CreateVariantInput
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) throw new NotFoundException('Товар не найден');

    return this.prisma.variant.create({
      data: {
        productId,
        companyId: product.companyId,
        vendorCode: data.vendorCode,
        masterPrice: data.masterPrice,
        masterStock: data.masterStock ?? 0,
        size: data.size ?? null,
        color: data.color ?? null,
      },
    });
  }

  /** Обновить вариант */
  async updateVariant(
    companyId: string,
    productId: string,
    variantId: string,
    data: UpdateVariantInput
  ) {
    const variant = await this.prisma.variant.findFirst({
      where: { id: variantId, productId, companyId },
    });
    if (!variant) throw new NotFoundException('Вариант не найден');
    return this.prisma.variant.update({
      where: { id: variantId },
      data: {
        vendorCode: data.vendorCode ?? variant.vendorCode,
        masterPrice: data.masterPrice ?? variant.masterPrice,
        masterStock: data.masterStock ?? variant.masterStock,
        size: data.size !== undefined ? data.size : variant.size,
        color: data.color !== undefined ? data.color : variant.color,
      },
    });
  }

  /** Добавить штрихкод к варианту — companyId из variant */
  async addBarcode(
    companyId: string,
    productId: string,
    variantId: string,
    data: AddBarcodeInput
  ) {
    const variant = await this.prisma.variant.findFirst({
      where: { id: variantId, productId, companyId },
    });
    if (!variant) throw new NotFoundException('Вариант не найден');
    const barcode = data.barcode.trim();
    if (!barcode) throw new ForbiddenException('Штрихкод не может быть пустым');

    return this.prisma.variantBarcode.create({
      data: {
        variantId,
        companyId: variant.companyId,
        barcode,
      },
    });
  }

  /** Удалить штрихкод */
  async deleteBarcode(
    companyId: string,
    productId: string,
    variantId: string,
    barcodeId: string
  ) {
    const barcode = await this.prisma.variantBarcode.findFirst({
      where: {
        id: barcodeId,
        variantId,
        variant: { productId, companyId },
      },
    });
    if (!barcode) throw new NotFoundException('Штрихкод не найден');
    await this.prisma.variantBarcode.delete({ where: { id: barcodeId } });
    return { deleted: true };
  }
}
