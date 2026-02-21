/**
 * Импорт каталога Ozon → Product + ProductOzon.
 * Шаги: A list, E warehouses, B info/list, C pictures, D prices, F stocks-by-warehouse,
 * attributes; фаза 2 — syncDescriptions.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { createLogger } from '@seller/shared';
import {
  Product,
  ProductOzon,
  Warehouse,
  ProductOzonWarehouseStock,
} from '@seller/typeorm';
import { Marketplace } from '@seller/typeorm';
import { OzonApiRepository } from '../../shared/integrations/ozon.repository';
import type {
  OzonCredentials,
  OzonProductAttributes,
  OzonPicture,
  OzonPriceItem,
  OzonProductInfo,
  OzonProductItem,
  OzonWarehouse,
} from '../../shared/dto/ozon.dto';
import { OzonApiRepositoryFactory } from '../../shared/integrations/ozon-api.repository.factory';

const ATTRIBUTES_BATCH_SIZE = 1000;
const PROGRESS_LOG_INTERVAL = 50;
const OZON_DEFAULT_WAREHOUSE_ID = 'default';

/** Ozon API может вернуть URL как string или как object { "https://...": "" } */
function extractImageUrl(
  v: string | Record<string, unknown> | undefined
): string | null {
  if (v == null) return null;
  if (typeof v === 'string' && v.startsWith('http')) return v;
  if (typeof v === 'object') {
    const key = Object.keys(v)[0];
    if (key?.startsWith('http')) return key;
    const val = Object.values(v)[0];
    if (typeof val === 'string' && val.startsWith('http')) return val;
  }
  return null;
}

function normalizeImageUrls(arr: unknown[]): string[] {
  return arr
    .map((v) => extractImageUrl(v as string | Record<string, unknown>))
    .filter((u): u is string => u != null);
}

@Injectable()
export class OzonImportService {
  private readonly log = createLogger(OzonImportService.name);

  constructor(
    private readonly ozonApiFactory: OzonApiRepositoryFactory,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductOzon)
    private readonly productOzonRepo: Repository<ProductOzon>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    private readonly dataSource: DataSource
  ) {}

  async run(
    companyId: string,
    marketAccountId: string,
    creds: OzonCredentials
  ): Promise<{ created: number; updated: number }> {
    const startTime = performance.now();
    const client = this.ozonApiFactory.create(creds);

    this.log.i('Начало импорта Ozon', { marketAccountId });

    const phase1Start = performance.now();

    const listItems = await client.getProductList();
    if (listItems.length === 0) {
      this.log.i('Список товаров Ozon пуст', { marketAccountId });
      return { created: 0, updated: 0 };
    }

    const productIds = listItems.map((i) => i.product_id);

    this.log.i('Шаг E: загрузка складов', { marketAccountId });
    const ozonWarehouses = await client.getWarehouseList();
    const warehouseByExternalId = await this.syncOzonWarehouses(
      marketAccountId,
      ozonWarehouses
    );
    const defaultWarehouse =
      await this.ensureOzonDefaultWarehouse(marketAccountId);
    warehouseByExternalId.set(defaultWarehouse.externalId, defaultWarehouse);

    this.log.i('Фаза 1: загрузка info/list', {
      marketAccountId,
      total: listItems.length,
    });
    const infoMap = await this.fetchInfoMap(client, listItems);

    this.log.i('Фаза 1: загрузка pictures, prices, attributes', {
      marketAccountId,
    });
    const [picturesMap, pricesMap, attrsMap] = await Promise.all([
      client.getProductPictures(productIds),
      client.getProductPrices(productIds),
      this.fetchAttributesMap(client, listItems, marketAccountId),
    ]);

    this.log.i('Шаг F: загрузка остатков по складам', {
      marketAccountId,
      warehouses: warehouseByExternalId.size,
    });
    const productIdToOfferId = new Map(
      listItems.map((i) => [i.product_id, i.offer_id])
    );
    const stocksByWarehouse = await client.getStocksByWarehouse(
      productIds,
      productIdToOfferId
    );

    let created = 0;
    let updated = 0;
    const offerIdsProcessed: string[] = [];

    for (let i = 0; i < listItems.length; i++) {
      const item = listItems[i];
      const info =
        infoMap.get(item.product_id) ??
        infoMap.get(item.offer_id) ??
        this.fallbackInfo(item);
      const attrs = attrsMap.get(item.product_id);
      const priceItem = pricesMap.get(item.product_id);
      const pictures = picturesMap.get(item.product_id);
      const stockByWh = stocksByWarehouse.get(String(item.product_id));
      const stockByWhRecord = stockByWh ? Object.fromEntries(stockByWh) : null;

      const result = await this.upsertItem(
        companyId,
        marketAccountId,
        item,
        info,
        attrs,
        null,
        priceItem,
        pictures,
        stockByWhRecord,
        warehouseByExternalId,
        defaultWarehouse
      );
      if (result === 'created') created += 1;
      else if (result === 'updated') updated += 1;
      offerIdsProcessed.push(item.offer_id);

      if ((i + 1) % PROGRESS_LOG_INTERVAL === 0) {
        this.log.i('Прогресс импорта Ozon', {
          marketAccountId,
          processed: i + 1,
          total: listItems.length,
        });
      }
    }

    const phase1Duration = performance.now() - phase1Start;
    this.log.i('Фаза 1 завершена', {
      marketAccountId,
      durationMs: Math.round(phase1Duration),
      apiRequests: client.apiRequestCount,
      retryCount: client.retryCount,
      created,
      updated,
    });

    const phase2Start = performance.now();
    await this.syncDescriptions(client, marketAccountId, offerIdsProcessed);
    const phase2Duration = performance.now() - phase2Start;

    const totalDuration = performance.now() - startTime;
    this.log.i('Импорт Ozon завершён', {
      marketAccountId,
      created,
      updated,
      total: listItems.length,
      phase1Ms: Math.round(phase1Duration),
      phase2Ms: Math.round(phase2Duration),
      totalMs: Math.round(totalDuration),
      apiRequests: client.apiRequestCount,
      retryCount: client.retryCount,
    });
    return { created, updated };
  }

  private async fetchInfoMap(
    client: OzonApiRepository,
    listItems: OzonProductItem[]
  ): Promise<Map<string, OzonProductInfo>> {
    const productIds = listItems.map((i) => i.product_id);
    const infos = await client.getProductInfo(productIds);
    const map = new Map<string, OzonProductInfo>();
    for (const info of infos) {
      map.set(String(info.id), info);
      map.set(info.offer_id, info);
    }
    return map;
  }

  private async fetchAttributesMap(
    client: OzonApiRepository,
    listItems: OzonProductItem[],
    marketAccountId: string
  ): Promise<Map<string, OzonProductAttributes>> {
    const productIds = listItems.map((i) => i.product_id);
    const map = new Map<string, OzonProductAttributes>();

    try {
      for (let i = 0; i < productIds.length; i += ATTRIBUTES_BATCH_SIZE) {
        const batch = productIds.slice(i, i + ATTRIBUTES_BATCH_SIZE);
        const attrs = await client.getProductAttributesAll({
          product_id: batch,
        });
        for (const a of attrs) {
          map.set(String(a.id), a);
        }
        this.log.d('Ozon attributes batch', {
          batchIndex: Math.floor(i / ATTRIBUTES_BATCH_SIZE),
          batchSize: batch.length,
          count: attrs.length,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is404 = msg.includes('404');
      if (is404) {
        this.log.w(
          'Эндпоинт v4/product/info/attributes вернул 404 — габариты и атрибуты пропущены',
          { marketAccountId }
        );
      } else {
        throw err;
      }
    }
    return map;
  }

  private fallbackInfo(item: OzonProductItem): OzonProductInfo {
    return {
      id: parseInt(item.product_id, 10) || 0,
      offer_id: item.offer_id,
      price: '0',
    };
  }

  /**
   * Синхронизация описаний только для товаров: новых или без description в БД.
   * Не блокирует основной импорт.
   */
  private async syncDescriptions(
    client: OzonApiRepository,
    marketAccountId: string,
    offerIds: string[]
  ): Promise<void> {
    const needDescription = await this.productOzonRepo
      .createQueryBuilder('po')
      .select(['po.id', 'po.offerId', 'po.ozonProductId', 'po.productId'])
      .where('po.marketAccountId = :marketAccountId', { marketAccountId })
      .andWhere('po.offerId IN (:...offerIds)', { offerIds })
      .andWhere('(po.description IS NULL OR po.description = :empty)', {
        empty: '',
      })
      .getMany();

    if (needDescription.length === 0) {
      this.log.i('Фаза 2: описания не требуются', { marketAccountId });
      return;
    }

    this.log.i('Фаза 2: загрузка descriptions', {
      marketAccountId,
      count: needDescription.length,
    });

    let synced = 0;
    for (const po of needDescription) {
      try {
        const dat = await client.getProductDescription(po.ozonProductId, false);
        if (dat?.description) {
          await this.dataSource.transaction(async (tx) => {
            await tx
              .getRepository(ProductOzon)
              .update({ id: po.id }, { description: dat.description });
            await tx
              .getRepository(Product)
              .update({ id: po.productId }, { description: dat.description });
          });
          synced += 1;
        }
      } catch {
        this.log.w('Не удалось загрузить description', {
          offerId: po.offerId,
          ozonProductId: po.ozonProductId,
        });
      }
    }

    this.log.i('Фаза 2: descriptions обновлены', {
      marketAccountId,
      synced,
      total: needDescription.length,
    });
  }

  /** Синхронизация складов Ozon. Возвращает externalId -> Warehouse */
  private async syncOzonWarehouses(
    marketAccountId: string,
    warehouses: OzonWarehouse[]
  ): Promise<Map<string, Warehouse>> {
    const byExternalId = new Map<string, Warehouse>();
    for (const wh of warehouses) {
      const extId = wh.warehouse_id;
      if (!extId) continue;
      const name = (typeof wh.name === 'string' ? wh.name : null) ?? extId;
      let warehouse = await this.warehouseRepo.findOne({
        where: { marketAccountId, externalId: extId },
      });
      if (!warehouse) {
        warehouse = this.warehouseRepo.create({
          marketAccountId,
          marketplace: Marketplace.OZON,
          externalId: extId,
          name,
        });
        await this.warehouseRepo.save(warehouse);
      } else if (warehouse.name !== name) {
        await this.warehouseRepo.update(warehouse.id, { name });
      }
      byExternalId.set(extId, warehouse);
    }
    return byExternalId;
  }

  /** Склад Ozon по умолчанию (fallback при пустом warehouse list или stocks-by-warehouse) */
  private async ensureOzonDefaultWarehouse(
    marketAccountId: string
  ): Promise<Warehouse> {
    let wh = await this.warehouseRepo.findOne({
      where: {
        marketAccountId,
        marketplace: Marketplace.OZON,
        externalId: OZON_DEFAULT_WAREHOUSE_ID,
      },
    });
    if (!wh) {
      wh = this.warehouseRepo.create({
        marketAccountId,
        marketplace: Marketplace.OZON,
        externalId: OZON_DEFAULT_WAREHOUSE_ID,
        name: 'Ozon (агрегат)',
      });
      await this.warehouseRepo.save(wh);
    }
    return wh;
  }

  private async upsertItem(
    companyId: string,
    marketAccountId: string,
    item: OzonProductItem,
    info: OzonProductInfo,
    attrs: OzonProductAttributes | undefined,
    description: string | null,
    priceItem: OzonPriceItem | undefined,
    pictures: OzonPicture[] | undefined,
    stockByWarehouse: Record<
      string,
      { available: number; reserved?: number }
    > | null,
    warehouseByExternalId: Map<string, Warehouse>,
    defaultWarehouse: Warehouse
  ): Promise<'created' | 'updated'> {
    const ozonProductId = BigInt(item.product_id);
    const price =
      priceItem?.price != null
        ? parseFloat(priceItem.price) || 0
        : parseFloat(info.price ?? '0') || 0;
    const oldPriceFromApi = priceItem?.old_price ?? info.old_price ?? null;
    const stocks = info.stocks;
    const stocksArr = Array.isArray(stocks) ? stocks : stocks ? [stocks] : [];
    const stockPresent = stocksArr.reduce((s, st) => s + (st.present ?? 0), 0);
    const stockReserved = stocksArr.reduce(
      (s, st) => s + (st.reserved ?? 0),
      0
    );
    const stockComing = stocksArr.reduce((s, st) => s + (st.coming ?? 0), 0);
    const name =
      (typeof info.name === 'string' && info.name.trim()) || item.offer_id;
    const desc =
      (typeof description === 'string' ? description : '').trim() ||
      (typeof info.description === 'string' ? info.description : '').trim() ||
      null;

    const pictureUrls =
      pictures
        ?.filter((p) => typeof p.url === 'string' && p.url.startsWith('http'))
        .map((p) => p.url as string) ?? [];
    const primaryFromPictures = pictures?.find((p) => p.is_primary)?.url;
    const primaryImage =
      (typeof primaryFromPictures === 'string' &&
      primaryFromPictures.startsWith('http')
        ? primaryFromPictures
        : null) ?? extractImageUrl(info.primary_image ?? info.images?.[0]);
    const rawImages =
      pictureUrls.length > 0
        ? pictureUrls
        : (info.images ?? (info.primary_image ? [info.primary_image] : []));
    const images =
      typeof rawImages[0] === 'string'
        ? (rawImages as string[]).filter((u) => u?.startsWith('http'))
        : (rawImages as Array<string | Record<string, unknown>>)
            .map(extractImageUrl)
            .filter((u): u is string => u != null);
    const resolvedImages =
      images.length > 0 ? images : primaryImage ? [primaryImage] : [];
    const images360 = normalizeImageUrls(
      Array.isArray(info.images360) ? info.images360 : []
    );

    const heightCm =
      attrs?.height != null && attrs.dimension_unit === 'mm'
        ? attrs.height / 10
        : null;
    const widthCm =
      attrs?.width != null && attrs.dimension_unit === 'mm'
        ? attrs.width / 10
        : null;
    const depthCm =
      attrs?.depth != null && attrs.dimension_unit === 'mm'
        ? attrs.depth / 10
        : null;
    const weightKg =
      attrs?.weight != null && attrs.weight_unit === 'g'
        ? attrs.weight / 1000
        : null;

    const stockByWarehouseRecord: Record<string, number> = {};
    if (stockByWarehouse && Object.keys(stockByWarehouse).length > 0) {
      for (const [whId, val] of Object.entries(stockByWarehouse)) {
        stockByWarehouseRecord[whId] = Math.max(0, val.available ?? 0);
      }
    } else {
      stockByWarehouseRecord[defaultWarehouse.externalId] = Math.max(
        0,
        stockPresent
      );
    }

    const existing = await this.productOzonRepo.findOne({
      where: { marketAccountId, offerId: item.offer_id },
      relations: { product: true },
    });

    const vendorCodeTrimmed = item.offer_id.trim();

    /** Поиск Product по vendorCode с ProductWb для объединения Ozon+WB */
    let productToMerge: Product | null = null;
    if (!existing) {
      const found = await this.productRepo
        .createQueryBuilder('p')
        .innerJoin('p.productWb', 'wb')
        .where('p.companyId = :companyId', { companyId })
        .andWhere('p.vendorCode = :vendorCode', {
          vendorCode: vendorCodeTrimmed,
        })
        .limit(1)
        .getOne();
      if (found) productToMerge = found;
    }

    const productData = {
      name,
      brand: undefined as string | undefined,
      description: desc,
      vendorCode: item.offer_id,
    };

    const ozonData = {
      ozonProductId: String(ozonProductId),
      offerId: item.offer_id,
      sku: info.sku != null ? String(BigInt(info.sku)) : null,
      name: info.name ?? null,
      barcode: info.barcode ?? info.barcodes?.[0] ?? null,
      categoryId:
        info.category_id != null ? String(BigInt(info.category_id)) : null,
      description: desc || null,
      price: String(price),
      oldPrice:
        oldPriceFromApi != null
          ? String(parseFloat(oldPriceFromApi))
          : info.old_price != null
            ? String(parseFloat(info.old_price))
            : null,
      marketingPrice:
        info.marketing_price != null
          ? String(parseFloat(info.marketing_price))
          : null,
      premiumPrice:
        info.premium_price != null
          ? String(parseFloat(info.premium_price))
          : null,
      recommendedPrice:
        info.recommended_price != null
          ? String(parseFloat(info.recommended_price))
          : null,
      minPrice:
        (info.min_price ?? info.min_ozon_price != null)
          ? String(parseFloat(info.min_price ?? info.min_ozon_price ?? '0'))
          : null,
      currencyCode: info.currency_code ?? null,
      stockPresent,
      stockReserved,
      stockComing,
      primaryImage: primaryImage ?? null,
      images: resolvedImages.length ? resolvedImages : null,
      images360: images360.length ? images360 : null,
      visible: info.visible ?? null,
      status: info.status ?? null,
      vat: info.vat ?? null,
      heightCm: heightCm != null ? String(heightCm) : null,
      widthCm: widthCm != null ? String(widthCm) : null,
      depthCm: depthCm != null ? String(depthCm) : null,
      weightKg: weightKg != null ? String(weightKg) : null,
      attributes: attrs?.attributes ?? null,
      rawInfoList: info ?? null,
      rawAttributes: attrs ?? null,
      syncedAt: new Date(),
    };

    if (existing) {
      await this.dataSource.transaction(async (tx) => {
        await tx.getRepository(Product).update(existing.productId, productData);
        await tx
          .getRepository(ProductOzon)
          .update(existing.id, ozonData as Record<string, unknown>);
        await this.upsertOzonWarehouseStocks(
          tx,
          existing.id,
          stockByWarehouseRecord,
          warehouseByExternalId
        );
      });
      return 'updated';
    }

    const productIdForCreate = productToMerge?.id ?? null;

    await this.dataSource.transaction(async (tx) => {
      let product: Product;
      if (productIdForCreate) {
        await tx.getRepository(Product).update(productIdForCreate, productData);
        product = await tx.getRepository(Product).findOneOrFail({
          where: { id: productIdForCreate },
        });
      } else {
        product = tx.getRepository(Product).create({
          companyId,
          ...productData,
        });
        await tx.getRepository(Product).save(product);
      }
      const ozonRepo = tx.getRepository(ProductOzon);
      const ozon = ozonRepo.create({
        productId: product.id,
        marketAccountId,
        ...ozonData,
      } as Partial<ProductOzon>);
      await ozonRepo.save(ozon);
      await this.upsertOzonWarehouseStocks(
        tx,
        ozon.id,
        stockByWarehouseRecord,
        warehouseByExternalId
      );
      if (productToMerge) {
        this.log.i('Объединение карточки Ozon с существующим Product с WB', {
          vendorCode: vendorCodeTrimmed,
          productId: product.id,
        });
      }
    });
    return 'created';
  }

  private async upsertOzonWarehouseStocks(
    tx: EntityManager,
    productOzonId: string,
    stockByWarehouse: Record<string, number>,
    warehouseByExternalId: Map<string, Warehouse>
  ): Promise<void> {
    const repo = tx.getRepository(ProductOzonWarehouseStock);
    await repo.delete({ productOzonId });
    for (const [extId, quantity] of Object.entries(stockByWarehouse)) {
      const wh = warehouseByExternalId.get(extId);
      if (!wh) continue;
      await repo.save({
        productOzonId,
        warehouseId: wh.id,
        quantity: Math.max(0, Math.floor(quantity)),
      });
    }
  }
}
