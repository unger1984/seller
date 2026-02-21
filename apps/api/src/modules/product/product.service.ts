/** Сервис продуктов — CRUD с инвариантами companyId. ProductOzon/ProductWb вместо Listing. */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Product,
  Variant,
  VariantBarcode,
  ProductOzon,
  ProductWb,
} from '@seller/typeorm';
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
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepo: Repository<Variant>,
    @InjectRepository(VariantBarcode)
    private readonly barcodeRepo: Repository<VariantBarcode>
  ) {}

  /** Список продуктов с пагинацией (productOzon, productWb, variants) */
  async list(companyId: string, query: ProductListQuery) {
    const { page, limit, search, brand } = query;

    let productIds: string[] | null = null;
    if (search) {
      const s = search.trim();
      const subQb = this.productRepo
        .createQueryBuilder('p')
        .leftJoin('p.variants', 'v')
        .leftJoin('v.barcodes', 'b')
        .select('p.id')
        .where('p.companyId = :companyId', { companyId })
        .andWhere(
          `(p.name ILIKE :search OR p.vendorCode ILIKE :search OR v.vendorCode ILIKE :search OR b.barcode = :s)`,
          { search: `%${s}%`, s }
        )
        .distinct(true);
      if (brand) subQb.andWhere('p.brand = :brand', { brand });
      const rows = await subQb.getRawMany<{ id: string }>();
      productIds = rows.map((r) => r.id);
      if (productIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
    }

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('v.barcodes', 'b')
      .leftJoinAndSelect('p.productOzon', 'ozon')
      .leftJoinAndSelect('p.productWb', 'wb')
      .where('p.companyId = :companyId', { companyId });

    if (productIds) {
      qb.andWhere('p.id IN (:...ids)', { ids: productIds });
    }
    if (brand) {
      qb.andWhere('p.brand = :brand', { brand });
    }

    qb.orderBy('p.updatedAt', 'DESC');
    const total = await qb.getCount();
    qb.skip((page - 1) * limit);
    qb.take(limit);
    const items = await qb.getMany();

    return {
      items: items.map((p) => this.mapProductForList(p)),
      total,
      page,
      limit,
    };
  }

  private mapProductForList(product: {
    id: string;
    name: string;
    brand: string | null;
    description: string | null;
    vendorCode: string;
    attributes: unknown;
    variants: Array<{
      id: string;
      vendorCode: string;
      masterPrice: string;
      masterStock: number;
      barcodes: Array<{ barcode: string }>;
    }>;
    productOzon?: {
      offerId: string;
      ozonProductId: string;
      price: string | null;
      stockPresent: number | null;
      primaryImage: string | null;
    } | null;
    productWb?: {
      nmId: string;
      vendorCode: string;
      primaryPhoto: string | null;
    } | null;
  }) {
    const attrs = product.attributes as {
      primaryImage?: string;
      images?: string[];
    } | null;
    const primaryImage =
      product.productOzon?.primaryImage ??
      product.productWb?.primaryPhoto ??
      attrs?.primaryImage ??
      null;
    const images = attrs?.images ?? [];

    const variants = (product.variants ?? []).map((v) => ({
      id: v.id,
      vendorCode: v.vendorCode,
      masterPrice: Number(v.masterPrice),
      masterStock: v.masterStock,
      barcodes: (v.barcodes ?? []).map((b) => b.barcode),
      ozonOfferId: product.productOzon?.offerId ?? null,
      ozonProductId: product.productOzon?.ozonProductId ?? null,
      primaryImage,
      wbNmId: product.productWb?.nmId ?? null,
      placementStatusOzon: null,
      placementStatusWb: null,
      priceOzon: product.productOzon?.price
        ? Number(product.productOzon.price)
        : null,
      stockOzon: product.productOzon?.stockPresent ?? null,
      priceWb: null,
      stockWb: null,
    }));

    if (variants.length === 0 && (product.productOzon || product.productWb)) {
      variants.push({
        id: `product-${product.id}`,
        vendorCode: product.vendorCode,
        masterPrice: product.productOzon?.price
          ? Number(product.productOzon.price)
          : 0,
        masterStock: product.productOzon?.stockPresent ?? 0,
        barcodes: [],
        ozonOfferId: product.productOzon?.offerId ?? null,
        ozonProductId: product.productOzon?.ozonProductId ?? null,
        primaryImage,
        wbNmId: product.productWb?.nmId ?? null,
        placementStatusOzon: null,
        placementStatusWb: null,
        priceOzon: product.productOzon?.price
          ? Number(product.productOzon.price)
          : null,
        stockOzon: product.productOzon?.stockPresent ?? null,
        priceWb: null,
        stockWb: null,
      });
    }

    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      description: product.description ?? null,
      primaryImage,
      images,
      variants,
    };
  }

  /** Создать продукт */
  async create(companyId: string, data: CreateProductInput) {
    const input = data as CreateProductInput & { vendorCode: string };
    const product = this.productRepo.create({
      companyId,
      name: data.name,
      brand: data.brand ?? null,
      description: data.description ?? null,
      vendorCode: input.vendorCode,
      attributes: data.attributes ?? undefined,
    });
    await this.productRepo.save(product);
    return product;
  }

  /** Детали продукта */
  async getById(companyId: string, id: string) {
    const product = await this.productRepo.findOne({
      where: { id, companyId },
      relations: {
        variants: { barcodes: true },
        productOzon: { marketAccount: true },
        productWb: { marketAccount: true },
      },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  /** Обновить продукт */
  async update(companyId: string, id: string, data: UpdateProductInput) {
    const p = await this.productRepo.findOne({
      where: { id, companyId },
    });
    if (!p) throw new NotFoundException('Товар не найден');
    const input = data as UpdateProductInput & { vendorCode?: string };
    const toUpdate: Record<string, unknown> = {
      name: data.name ?? p.name,
      brand: data.brand !== undefined ? data.brand : p.brand,
      description:
        data.description !== undefined ? data.description : p.description,
    };
    if (input.vendorCode !== undefined) toUpdate.vendorCode = input.vendorCode;
    if (data.attributes !== undefined) toUpdate.attributes = data.attributes;
    await this.productRepo.update(id, toUpdate);
    return this.productRepo.findOneOrFail({ where: { id } });
  }

  /** Список вариантов продукта */
  async listVariants(companyId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId, companyId },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    return this.variantRepo.find({
      where: { productId },
      relations: { barcodes: true },
    });
  }

  /** Добавить вариант — companyId из product */
  async addVariant(
    companyId: string,
    productId: string,
    data: CreateVariantInput
  ) {
    const product = await this.productRepo.findOne({
      where: { id: productId, companyId },
    });
    if (!product) throw new NotFoundException('Товар не найден');

    const variant = this.variantRepo.create({
      productId,
      companyId: product.companyId,
      vendorCode: data.vendorCode,
      masterPrice: String(data.masterPrice),
      masterStock: data.masterStock ?? 0,
      size: data.size ?? null,
      color: data.color ?? null,
    });
    await this.variantRepo.save(variant);
    return variant;
  }

  /** Обновить вариант */
  async updateVariant(
    companyId: string,
    productId: string,
    variantId: string,
    data: UpdateVariantInput
  ) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, productId, companyId },
    });
    if (!variant) throw new NotFoundException('Вариант не найден');
    await this.variantRepo.update(variantId, {
      vendorCode: data.vendorCode ?? variant.vendorCode,
      masterPrice:
        data.masterPrice !== undefined
          ? String(data.masterPrice)
          : variant.masterPrice,
      masterStock: data.masterStock ?? variant.masterStock,
      size: data.size !== undefined ? data.size : variant.size,
      color: data.color !== undefined ? data.color : variant.color,
    });
    return this.variantRepo.findOneOrFail({ where: { id: variantId } });
  }

  /** Добавить штрихкод к варианту */
  async addBarcode(
    companyId: string,
    productId: string,
    variantId: string,
    data: AddBarcodeInput
  ) {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, productId, companyId },
    });
    if (!variant) throw new NotFoundException('Вариант не найден');
    const barcode = data.barcode.trim();
    if (!barcode) throw new ForbiddenException('Штрихкод не может быть пустым');

    const vb = this.barcodeRepo.create({
      variantId,
      companyId: variant.companyId,
      barcode,
    });
    await this.barcodeRepo.save(vb);
    return vb;
  }

  /** Удалить штрихкод */
  async deleteBarcode(
    companyId: string,
    productId: string,
    variantId: string,
    barcodeId: string
  ) {
    const barcode = await this.barcodeRepo.findOne({
      where: { id: barcodeId, variantId, companyId },
      relations: { variant: true },
    });
    if (!barcode || barcode.variant?.productId !== productId) {
      throw new NotFoundException('Штрихкод не найден');
    }
    await this.barcodeRepo.delete({ id: barcodeId });
    return { deleted: true };
  }
}
