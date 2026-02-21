/**
 * Импорт каталога WB → Product + ProductWb + Warehouse + ProductWbWarehouseStock.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { createLogger } from '@seller/shared';
import {
  Product,
  ProductWb,
  Warehouse,
  ProductWbWarehouseStock,
} from '@seller/typeorm';
import { Marketplace } from '@seller/typeorm';
import { WbApiRepository } from '../../shared/integrations/wb.repository';
import type {
  WbCard,
  WbCredentials,
  WbWarehouse,
} from '../../shared/dto/wb.dto';
import { WbApiRepositoryFactory } from '../../shared/integrations/wb-api.repository.factory';

@Injectable()
export class WbImportService {
  private readonly log = createLogger(WbImportService.name);

  constructor(
    private readonly wbApiFactory: WbApiRepositoryFactory,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductWb)
    private readonly productWbRepo: Repository<ProductWb>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(ProductWbWarehouseStock)
    private readonly stockRepo: Repository<ProductWbWarehouseStock>,
    private readonly dataSource: DataSource
  ) {}

  async run(
    companyId: string,
    marketAccountId: string,
    creds: WbCredentials
  ): Promise<{ created: number; updated: number }> {
    this.log.i('Начало импорта WB', { marketAccountId });

    const repo = this.wbApiFactory.create(creds);

    // Шаг A — карточки (обязательно первым для chrtId-индекса)
    const cards = await repo.getCardsList();
    if (cards.length === 0) {
      this.log.i('Список карточек WB пуст', { marketAccountId });
      return { created: 0, updated: 0 };
    }

    const chrtIdToNmId = WbApiRepository.buildChrtIdToNmIdIndex(cards);
    const chrtIds = Array.from(chrtIdToNmId.keys());

    // Шаг B + C + D — цены параллельно с остатками
    const [pricesByNmId, stocksResult] = await Promise.all([
      repo.getPrices(),
      repo.getStocksByWarehouses(chrtIds, chrtIdToNmId),
    ]);
    const { warehouses, stocksByWarehouses } = stocksResult;

    const warehouseByExternalId = await this.syncWarehouses(
      marketAccountId,
      warehouses
    );

    this.log.i('Обработка карточек WB', {
      marketAccountId,
      total: cards.length,
    });

    let created = 0;
    let updated = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      try {
        const result = await this.upsertItem(
          companyId,
          marketAccountId,
          card,
          stocksByWarehouses,
          pricesByNmId,
          warehouseByExternalId
        );
        if (result === 'created') created += 1;
        else if (result === 'updated') updated += 1;
      } catch (err) {
        this.log.w('Ошибка upsert карточки WB', {
          nmId: card.nmID,
          vendorCode: card.vendorCode,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if ((i + 1) % 50 === 0) {
        this.log.i('Прогресс импорта WB', {
          marketAccountId,
          processed: i + 1,
          total: cards.length,
        });
      }
    }

    this.log.i('Импорт WB завершён', {
      marketAccountId,
      created,
      updated,
      total: cards.length,
    });
    return { created, updated };
  }

  /** Синхронизация складов WB. Возвращает externalId -> Warehouse */
  private async syncWarehouses(
    marketAccountId: string,
    warehouses: WbWarehouse[]
  ): Promise<Map<string, Warehouse>> {
    const byExternalId = new Map<string, Warehouse>();
    for (const wh of warehouses) {
      const extId =
        wh.id ?? (wh as unknown as { warehouseId?: number }).warehouseId;
      if (extId == null) continue;
      const extIdStr = String(extId);
      const name = (typeof wh.name === 'string' ? wh.name : null) ?? extIdStr;
      let warehouse = await this.warehouseRepo.findOne({
        where: { marketAccountId, externalId: extIdStr },
      });
      if (!warehouse) {
        warehouse = this.warehouseRepo.create({
          marketAccountId,
          marketplace: Marketplace.WILDBERRIES,
          externalId: extIdStr,
          name,
        });
        await this.warehouseRepo.save(warehouse);
      } else if (warehouse.name !== name) {
        await this.warehouseRepo.update(warehouse.id, { name });
      }
      byExternalId.set(extIdStr, warehouse);
    }
    return byExternalId;
  }

  private async upsertItem(
    companyId: string,
    marketAccountId: string,
    card: WbCard,
    stocksByWarehouses: Map<string, Record<string, number>>,
    pricesByNmId: Map<string, number>,
    warehouseByExternalId: Map<string, Warehouse>
  ): Promise<'created' | 'updated'> {
    const nmId = String(card.nmID);
    const vendorCode = card.vendorCode || String(card.nmID);
    const name = card.title ?? card.brand ?? vendorCode;

    const primaryPhoto =
      card.photos?.[0]?.big ??
      card.photos?.[0]?.c516x688 ??
      card.photos?.[0]?.c246x328 ??
      null;

    const priceFromApi = pricesByNmId.get(String(card.nmID)) ?? null;

    const stockByWarehouse = stocksByWarehouses.get(String(card.nmID)) ?? null;

    const dimensions = card.dimensions;
    const lengthCm = dimensions?.lengthCm ?? null;
    const widthCm = dimensions?.widthCm ?? null;
    const heightCm = dimensions?.heightCm ?? null;
    const weightKg =
      dimensions?.weightBrutto != null ? dimensions.weightBrutto / 1000 : null;

    const existing = await this.productWbRepo.findOne({
      where: { marketAccountId, nmId },
      relations: { product: true },
    });

    const vendorCodeTrimmed = vendorCode.trim();

    /** Поиск Product по vendorCode с ProductOzon для объединения Ozon+WB */
    let productToMerge: Product | null = null;
    if (!existing) {
      const found = await this.productRepo
        .createQueryBuilder('p')
        .innerJoin('p.productOzon', 'ozon')
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
      brand: card.brand ?? undefined,
      description: card.description ?? undefined,
      vendorCode,
    };

    const stockPresent = stockByWarehouse
      ? Object.values(stockByWarehouse).reduce((a, b) => a + b, 0)
      : null;

    const wbData = {
      nmId,
      imtId: card.imtID != null ? String(BigInt(card.imtID)) : null,
      vendorCode,
      price: priceFromApi != null ? String(priceFromApi) : null,
      stockPresent,
      subjectId: card.subjectID ?? null,
      subjectName: card.subjectName ?? null,
      brand: card.brand ?? null,
      title: card.title ?? null,
      description: card.description ?? null,
      primaryPhoto,
      photos: card.photos?.length ? card.photos : null,
      video: card.video ?? null,
      wholesaleEnabled: card.wholesale?.enabled ?? null,
      wholesaleQuantum: card.wholesale?.quantum ?? null,
      lengthCm: lengthCm != null ? String(lengthCm) : null,
      widthCm: widthCm != null ? String(widthCm) : null,
      heightCm: heightCm != null ? String(heightCm) : null,
      weightKg: weightKg != null ? String(weightKg) : null,
      characteristics: card.characteristics?.length
        ? card.characteristics
        : null,
      sizes: card.sizes?.length ? card.sizes : null,
      tags: card.tags?.length ? card.tags : null,
      rawCard: card ?? null,
      syncedAt: new Date(),
    };

    if (existing) {
      await this.dataSource.transaction(async (tx) => {
        await tx.getRepository(Product).update(existing.productId, productData);
        await tx
          .getRepository(ProductWb)
          .update(existing.id, wbData as Record<string, unknown>);
        await this.upsertWarehouseStocks(
          tx,
          existing.id,
          stockByWarehouse,
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
      const wbRepo = tx.getRepository(ProductWb);
      const wb = wbRepo.create({
        productId: product.id,
        marketAccountId,
        ...wbData,
      } as Partial<ProductWb>);
      await wbRepo.save(wb);
      await this.upsertWarehouseStocks(
        tx,
        wb.id,
        stockByWarehouse,
        warehouseByExternalId
      );
      if (productToMerge) {
        this.log.i('Объединение карточки WB с существующим Product с Ozon', {
          vendorCode: vendorCodeTrimmed,
          productId: product.id,
        });
      }
    });
    return 'created';
  }

  private async upsertWarehouseStocks(
    tx: EntityManager,
    productWbId: string,
    stockByWarehouse: Record<string, number> | null,
    warehouseByExternalId: Map<string, Warehouse>
  ): Promise<void> {
    const stockRepository = tx.getRepository(ProductWbWarehouseStock);
    await stockRepository.delete({ productWbId });
    if (!stockByWarehouse || Object.keys(stockByWarehouse).length === 0) {
      return;
    }
    for (const [extId, quantity] of Object.entries(stockByWarehouse)) {
      const wh = warehouseByExternalId.get(extId);
      if (!wh) continue;
      const qty = Math.max(0, Math.floor(Number(quantity) || 0));
      await stockRepository.save({
        productWbId,
        warehouseId: wh.id,
        quantity: qty,
      });
    }
  }
}
