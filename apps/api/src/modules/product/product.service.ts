/** Сервис продуктов — CRUD с инвариантами companyId. ProductOzon/ProductWb вместо Listing. */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createLogger } from '@seller/shared';
import {
  MarketAccount,
  Product,
  ProductOzon,
  ProductWb,
  ProductWbWarehouseStock,
  ProductOzonWarehouseStock,
  Variant,
  VariantBarcode,
  Warehouse,
} from '@seller/typeorm';
import { CredentialsCryptoService } from '../../shared/common/credentials-crypto.service.js';
import {
  putWbStocksForWarehouse,
  type WbStockItem,
} from './wb-stocks.client.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductListQuery,
  CreateVariantInput,
  UpdateVariantInput,
  AddBarcodeInput,
  UpdateProductOzonMarketInput,
  UpdateProductWbMarketInput,
} from '@seller/shared-types';

@Injectable()
export class ProductService {
  private readonly log = createLogger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductOzon)
    private readonly productOzonRepo: Repository<ProductOzon>,
    @InjectRepository(ProductWb)
    private readonly productWbRepo: Repository<ProductWb>,
    @InjectRepository(Variant)
    private readonly variantRepo: Repository<Variant>,
    @InjectRepository(VariantBarcode)
    private readonly barcodeRepo: Repository<VariantBarcode>,
    @InjectRepository(MarketAccount)
    private readonly marketAccountRepo: Repository<MarketAccount>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(ProductWbWarehouseStock)
    private readonly wbStockRepo: Repository<ProductWbWarehouseStock>,
    @InjectRepository(ProductOzonWarehouseStock)
    private readonly ozonStockRepo: Repository<ProductOzonWarehouseStock>,
    private readonly credentialsCrypto: CredentialsCryptoService
  ) {}

  /** Список продуктов с пагинацией (productOzon, productWb, variants) */
  async list(companyId: string, query: ProductListQuery) {
    const { page, limit, search, brand } = query;

    let productIds: string[] | null = null;
    if (search) {
      const s = search.trim();
      const searchPattern = `%${s}%`;
      const subQb = this.productRepo
        .createQueryBuilder('p')
        .leftJoin('p.variants', 'v')
        .leftJoin('v.barcodes', 'b')
        .leftJoin('p.productOzon', 'ozon')
        .leftJoin('p.productWb', 'wb')
        .select('p.id AS product_id')
        .where('p.companyId = :companyId', { companyId })
        .andWhere(
          `(
            "p"."name" ILIKE :searchPattern OR
            "p"."vendor_code" ILIKE :searchPattern OR
            "v"."vendor_code" ILIKE :searchPattern OR
            "b"."barcode" = :s OR
            "ozon"."offer_id" ILIKE :searchPattern OR
            CAST("ozon"."sku" AS TEXT) ILIKE :searchPattern OR
            "wb"."vendor_code" ILIKE :searchPattern OR
            CAST("wb"."nm_id" AS TEXT) ILIKE :searchPattern
          )`,
          { searchPattern, s }
        )
        .distinct(true);
      if (brand) subQb.andWhere('p.brand = :brand', { brand });
      const rows = await subQb.getRawMany<{ product_id: string }>();
      productIds = rows.map((r) => r.product_id);
      if (productIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }
    }

    const countQb = this.productRepo
      .createQueryBuilder('p')
      .where('p.companyId = :companyId', { companyId });
    if (productIds) {
      countQb.andWhere('p.id IN (:...ids)', { ids: productIds });
    }
    if (brand) {
      countQb.andWhere('p.brand = :brand', { brand });
    }
    const total = await countQb.getCount();

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('v.barcodes', 'b')
      .leftJoinAndSelect('p.productOzon', 'ozon')
      .leftJoinAndSelect('p.productWb', 'wb')
      .select([
        'p.id',
        'p.name',
        'p.brand',
        'p.description',
        'p.vendorCode',
        'p.attributes',
        'p.createdAt',
        'p.updatedAt',
        'v.id',
        'v.productId',
        'v.vendorCode',
        'v.masterPrice',
        'v.masterStock',
        'b.id',
        'b.variantId',
        'b.barcode',
        'ozon.id',
        'ozon.offerId',
        'ozon.ozonProductId',
        'ozon.sku',
        'ozon.name',
        'ozon.price',
        'ozon.stockPresent',
        'ozon.primaryImage',
        'wb.id',
        'wb.nmId',
        'wb.title',
        'wb.vendorCode',
        'wb.primaryPhoto',
        'wb.price',
        'wb.stockPresent',
      ])
      .where('p.companyId = :companyId', { companyId });

    if (productIds) {
      qb.andWhere('p.id IN (:...ids)', { ids: productIds });
    }
    if (brand) {
      qb.andWhere('p.brand = :brand', { brand });
    }

    qb.orderBy('p.createdAt', 'DESC');
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
      sku: string | null;
      name: string | null;
      price: string | null;
      stockPresent: number | null;
      primaryImage: string | null;
    } | null;
    productWb?: {
      nmId: string;
      title: string | null;
      vendorCode: string;
      primaryPhoto: string | null;
      price: string | null;
      stockPresent: number | null;
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
      ozonSku: product.productOzon?.sku ?? null,
      primaryImage,
      wbNmId: product.productWb?.nmId ?? null,
      placementStatusOzon: null,
      placementStatusWb: null,
      priceOzon: product.productOzon?.price
        ? Number(product.productOzon.price)
        : null,
      stockOzon: product.productOzon?.stockPresent ?? null,
      priceWb: product.productWb?.price
        ? Number(product.productWb.price)
        : null,
      stockWb: product.productWb?.stockPresent ?? null,
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
        ozonSku: product.productOzon?.sku ?? null,
        primaryImage,
        wbNmId: product.productWb?.nmId ?? null,
        placementStatusOzon: null,
        placementStatusWb: null,
        priceOzon: product.productOzon?.price
          ? Number(product.productOzon.price)
          : null,
        stockOzon: product.productOzon?.stockPresent ?? null,
        priceWb: product.productWb?.price
          ? Number(product.productWb.price)
          : null,
        stockWb: product.productWb?.stockPresent ?? null,
      });
    }

    return {
      id: product.id,
      name: product.name,
      nameOzon: product.productOzon?.name ?? null,
      nameWb: product.productWb?.title ?? null,
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
        productOzon: {
          marketAccount: true,
          warehouseStocks: { warehouse: true },
        },
        productWb: {
          marketAccount: true,
          warehouseStocks: { warehouse: true },
        },
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

  /** Обновить цену/остаток Ozon у продукта */
  async updateProductOzonMarket(
    companyId: string,
    productId: string,
    data: UpdateProductOzonMarketInput
  ) {
    const product = await this.productRepo.findOne({
      where: { id: productId, companyId },
      relations: {
        productOzon: { warehouseStocks: { warehouse: true } },
      },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    const ozon = product.productOzon;
    if (!ozon) throw new NotFoundException('У товара нет карточки Ozon');

    const input = data as UpdateProductOzonMarketInput & {
      stockByWarehouse?: Record<string, number>;
    };
    const toUpdate: Partial<ProductOzon> = {};
    if (data.price !== undefined) toUpdate.price = String(data.price);

    let stockByWarehouse: Record<string, number> | null = null;
    if (input.stockByWarehouse !== undefined) {
      stockByWarehouse = input.stockByWarehouse;
      toUpdate.stockPresent = Object.values(stockByWarehouse).reduce(
        (a, b) => a + b,
        0
      );
    } else if (data.stock !== undefined) {
      toUpdate.stockPresent = data.stock;
      const warehouses = (ozon.warehouseStocks ?? []).map(
        (s: { warehouse: { externalId: string } }) => s.warehouse.externalId
      );
      if (warehouses.length > 0) {
        stockByWarehouse = { [warehouses[0]!]: data.stock };
        warehouses.slice(1).forEach((extId: string) => {
          stockByWarehouse![extId] = 0;
        });
      }
    }

    if (Object.keys(toUpdate).length === 0 && !stockByWarehouse) return ozon;
    if (Object.keys(toUpdate).length > 0) {
      await this.productOzonRepo.update(
        ozon.id,
        toUpdate as Record<string, unknown>
      );
    }
    if (stockByWarehouse) {
      await this.upsertOzonWarehouseStocks(
        ozon.marketAccountId,
        ozon.id,
        stockByWarehouse
      );
    }
    this.log.i('ProductOzon price/stock обновлён', {
      productId,
      companyId,
      ...toUpdate,
    });
    return this.productOzonRepo.findOneOrFail({
      where: { id: ozon.id },
      relations: { warehouseStocks: { warehouse: true } },
    });
  }

  /** Обновить цену/остаток WB у продукта. stock — распределяем по складам. */
  async updateProductWbMarket(
    companyId: string,
    productId: string,
    data: UpdateProductWbMarketInput
  ) {
    const product = await this.productRepo.findOne({
      where: { id: productId, companyId },
      relations: { productWb: { warehouseStocks: { warehouse: true } } },
    });
    if (!product) throw new NotFoundException('Товар не найден');
    const wb = product.productWb;
    if (!wb) throw new NotFoundException('У товара нет карточки WB');

    const input = data as UpdateProductWbMarketInput & {
      stockByWarehouse?: Record<string, number>;
    };
    const toUpdate: { price?: string; stockPresent?: number } = {};
    if (data.price !== undefined) toUpdate.price = String(data.price);

    let newStockByWarehouse: Record<string, number> | null = null;
    if (input.stockByWarehouse !== undefined) {
      newStockByWarehouse = input.stockByWarehouse;
      toUpdate.stockPresent = Object.values(newStockByWarehouse).reduce(
        (a: number, b: number) => a + b,
        0
      );
    } else if (data.stock !== undefined) {
      const warehouses = (wb.warehouseStocks ?? [])
        .map(
          (s: { warehouse: { externalId: string } }) => s.warehouse.externalId
        )
        .filter((x): x is string => Boolean(x));
      if (warehouses.length === 0) {
        throw new NotFoundException(
          'Нет данных по складам WB. Выполните импорт с WB.'
        );
      }
      newStockByWarehouse = {};
      warehouses.forEach((extId: string, i: number) => {
        newStockByWarehouse![extId] = i === 0 ? data.stock! : 0;
      });
      toUpdate.stockPresent = data.stock;
    }

    if (Object.keys(toUpdate).length === 0 && !newStockByWarehouse) return wb;

    if (Object.keys(toUpdate).length > 0) {
      await this.productWbRepo.update(
        wb.id,
        toUpdate as Record<string, unknown>
      );
    }
    if (newStockByWarehouse) {
      await this.upsertWbWarehouseStocks(
        wb.marketAccountId,
        wb.id,
        newStockByWarehouse
      );
    }
    this.log.i('ProductWb price/stock обновлён', {
      productId,
      companyId,
      ...toUpdate,
    });

    // Пуш остатков в WB API по складам (externalId = warehouseId для WB)
    if (newStockByWarehouse && Object.keys(newStockByWarehouse).length > 0) {
      const account = await this.marketAccountRepo.findOne({
        where: { id: wb.marketAccountId },
        select: ['credentialsEncrypted'],
      });
      if (!account) {
        throw new NotFoundException('Аккаунт WB не найден');
      }
      let apiKey: string;
      try {
        const json = this.credentialsCrypto.decrypt(
          account.credentialsEncrypted
        );
        const creds = JSON.parse(json) as { apiKey?: string };
        apiKey = creds.apiKey ?? '';
      } catch (e) {
        this.log.e('Не удалось расшифровать credentials WB', {
          marketAccountId: wb.marketAccountId,
          error: e instanceof Error ? e.message : String(e),
        });
        throw new BadRequestException(
          'Не удалось расшифровать учётные данные WB'
        );
      }
      if (!apiKey) {
        throw new BadRequestException('API-ключ WB не найден в учётных данных');
      }
      const nmId = Number(wb.nmId);
      if (!Number.isInteger(nmId) || nmId <= 0) {
        throw new BadRequestException('Некорректный nmId товара WB');
      }
      for (const [externalId, quantity] of Object.entries(
        newStockByWarehouse
      )) {
        const qty = Math.max(0, Math.floor(Number(quantity) || 0));
        const items: WbStockItem[] = [{ nmId, quantity: qty }];
        await putWbStocksForWarehouse(apiKey, externalId, items);
      }
    }

    return this.productWbRepo.findOneOrFail({
      where: { id: wb.id },
      relations: { warehouseStocks: { warehouse: true } },
    });
  }

  private async upsertWbWarehouseStocks(
    marketAccountId: string,
    productWbId: string,
    stockByWarehouse: Record<string, number>
  ): Promise<void> {
    await this.wbStockRepo.delete({ productWbId });
    const warehouses = await this.warehouseRepo.find({
      where: { marketAccountId },
      select: ['id', 'externalId'],
    });
    const byExtId = new Map(warehouses.map((w) => [w.externalId, w]));
    for (const [extId, quantity] of Object.entries(stockByWarehouse)) {
      const wh = byExtId.get(extId);
      if (!wh) continue;
      const qty = Math.max(0, Math.floor(Number(quantity) || 0));
      await this.wbStockRepo.save({
        productWbId,
        warehouseId: wh.id,
        quantity: qty,
      });
    }
  }

  private async upsertOzonWarehouseStocks(
    marketAccountId: string,
    productOzonId: string,
    stockByWarehouse: Record<string, number>
  ): Promise<void> {
    await this.ozonStockRepo.delete({ productOzonId });
    const warehouses = await this.warehouseRepo.find({
      where: { marketAccountId },
      select: ['id', 'externalId'],
    });
    const byExtId = new Map(warehouses.map((w) => [w.externalId, w]));
    for (const [extId, quantity] of Object.entries(stockByWarehouse)) {
      const wh = byExtId.get(extId);
      if (!wh) continue;
      const qty = Math.max(0, Math.floor(Number(quantity) || 0));
      await this.ozonStockRepo.save({
        productOzonId,
        warehouseId: wh.id,
        quantity: qty,
      });
    }
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

  /** Очистить каталог: удалить все товары компании (только в БД, не на маркетах) */
  async clearCatalog(companyId: string): Promise<{ deleted: number }> {
    const result = await this.productRepo.delete({ companyId });
    const deleted = result.affected ?? 0;
    this.log.i('Каталог очищен', { companyId, deleted });
    return { deleted };
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
