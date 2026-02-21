/**
 * Импорт каталога Ozon → Product + ProductOzon.
 * Алгоритм по плану 16: v3/list → v3/info/list (batch 1000) → v4/attributes → v1/description.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createLogger } from '@seller/shared';
import { Product, ProductOzon } from '@seller/typeorm';
import {
  fetchOzonProductList,
  fetchOzonProductInfo,
  fetchOzonProductAttributesAll,
  fetchOzonProductDescription,
  type OzonCredentials,
  type OzonProductItem,
  type OzonProductInfo,
  type OzonProductAttributes,
} from '../clients/ozon.client.js';

const OZON_INFO_BATCH = 1000;

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
const OZON_DESCRIPTION_DELAY_MS = 100;

@Injectable()
export class OzonImportService {
  private readonly log = createLogger(OzonImportService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductOzon)
    private readonly productOzonRepo: Repository<ProductOzon>,
    private readonly dataSource: DataSource
  ) {}

  async run(
    companyId: string,
    marketAccountId: string,
    creds: OzonCredentials
  ): Promise<{ created: number; updated: number }> {
    this.log.i('Начало импорта Ozon', { marketAccountId });

    const listItems = await fetchOzonProductList(creds);
    if (listItems.length === 0) {
      this.log.i('Список товаров Ozon пуст', { marketAccountId });
      return { created: 0, updated: 0 };
    }

    this.log.i('Загрузка info/list батчами', {
      marketAccountId,
      total: listItems.length,
      batchSize: OZON_INFO_BATCH,
    });
    const infoMap = await this.fetchInfoMap(creds, listItems);

    this.log.i('Загрузка attributes батчами', { marketAccountId });
    const attrsMap = await this.fetchAttributesMap(
      creds,
      listItems,
      marketAccountId
    );

    let created = 0;
    let updated = 0;

    for (let i = 0; i < listItems.length; i++) {
      const item = listItems[i];
      const info =
        infoMap.get(item.product_id) ??
        infoMap.get(item.offer_id) ??
        this.fallbackInfo(item);
      const attrs = attrsMap.get(item.product_id);

      let description = '';
      let name = '';
      try {
        await new Promise((r) => setTimeout(r, OZON_DESCRIPTION_DELAY_MS));
        const dat = await fetchOzonProductDescription(
          creds,
          item.product_id,
          false
        );
        description = dat?.description ?? '';
        name = dat?.name ?? '';
      } catch {
        // Игнорируем ошибки description
      }

      const result = await this.upsertItem(
        companyId,
        marketAccountId,
        item,
        info,
        attrs,
        description
      );
      if (result === 'created') created += 1;
      else if (result === 'updated') updated += 1;

      if ((i + 1) % 50 === 0) {
        this.log.i('Прогресс импорта Ozon', {
          marketAccountId,
          processed: i + 1,
          total: listItems.length,
        });
      }
    }

    this.log.i('Импорт Ozon завершён', {
      marketAccountId,
      created,
      updated,
      total: listItems.length,
    });
    return { created, updated };
  }

  private async fetchInfoMap(
    creds: OzonCredentials,
    listItems: OzonProductItem[]
  ): Promise<Map<string, OzonProductInfo>> {
    const productIds = listItems.map((i) => i.product_id);
    const map = new Map<string, OzonProductInfo>();

    for (let i = 0; i < productIds.length; i += OZON_INFO_BATCH) {
      const batch = productIds.slice(i, i + OZON_INFO_BATCH);
      const infos = await fetchOzonProductInfo(creds, batch);
      for (const info of infos) {
        map.set(String(info.id), info);
        map.set(info.offer_id, info);
      }
      this.log.d('Ozon info batch', {
        batchIndex: Math.floor(i / OZON_INFO_BATCH),
        count: infos.length,
      });
    }
    return map;
  }

  private async fetchAttributesMap(
    creds: OzonCredentials,
    listItems: OzonProductItem[],
    marketAccountId: string
  ): Promise<Map<string, OzonProductAttributes>> {
    const productIds = listItems.map((i) => i.product_id);
    const map = new Map<string, OzonProductAttributes>();

    try {
      for (let i = 0; i < productIds.length; i += OZON_INFO_BATCH) {
        const batch = productIds.slice(i, i + OZON_INFO_BATCH);
        const attrs = await fetchOzonProductAttributesAll(creds, {
          product_id: batch,
        });
        for (const a of attrs) {
          map.set(String(a.id), a);
        }
        this.log.d('Ozon attributes batch', {
          batchIndex: Math.floor(i / OZON_INFO_BATCH),
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

  private async upsertItem(
    companyId: string,
    marketAccountId: string,
    item: OzonProductItem,
    info: OzonProductInfo,
    attrs: OzonProductAttributes | undefined,
    description: string
  ): Promise<'created' | 'updated'> {
    const ozonProductId = BigInt(item.product_id);
    const price = parseFloat(info.price ?? '0') || 0;
    const stockPresent = info.stocks?.present ?? 0;
    const stockReserved = info.stocks?.reserved ?? 0;
    const stockComing = info.stocks?.coming ?? 0;
    const name =
      (typeof info.name === 'string' && info.name.trim()) || item.offer_id;
    const desc =
      (typeof description === 'string' ? description : '').trim() ||
      (typeof info.description === 'string' ? info.description : '').trim() ||
      null;

    const primaryImage = extractImageUrl(
      info.primary_image ?? info.images?.[0]
    );
    const rawImages =
      info.images ?? (info.primary_image ? [info.primary_image] : []);
    const images = rawImages
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

    const existing = await this.productOzonRepo.findOne({
      where: { marketAccountId, offerId: item.offer_id },
      relations: { product: true },
    });

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
        info.old_price != null ? String(parseFloat(info.old_price)) : null,
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
      });
      return 'updated';
    }

    await this.dataSource.transaction(async (tx) => {
      const product = tx.getRepository(Product).create({
        companyId,
        ...productData,
      });
      await tx.getRepository(Product).save(product);
      const ozonRepo = tx.getRepository(ProductOzon);
      const ozon = ozonRepo.create({
        productId: product.id,
        marketAccountId,
        ...ozonData,
      } as Partial<ProductOzon>);
      await ozonRepo.save(ozon);
    });
    return 'created';
  }
}
