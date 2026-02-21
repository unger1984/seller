/**
 * Импорт каталога WB → Product + ProductWb.
 * Алгоритм по плану 16: POST /content/v2/get/cards/list с пагинацией cursor.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createLogger } from '@seller/shared';
import { Product, ProductWb } from '@seller/typeorm';
import {
  fetchWbCardsList,
  type WbCard,
  type WbCredentials,
} from '../clients/wb.client.js';

@Injectable()
export class WbImportService {
  private readonly log = createLogger(WbImportService.name);
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductWb)
    private readonly productWbRepo: Repository<ProductWb>,
    private readonly dataSource: DataSource
  ) {}

  async run(
    companyId: string,
    marketAccountId: string,
    creds: WbCredentials
  ): Promise<{ created: number; updated: number }> {
    this.log.i('Начало импорта WB', { marketAccountId });

    const cards = await fetchWbCardsList(creds);
    if (cards.length === 0) {
      this.log.i('Список карточек WB пуст', { marketAccountId });
      return { created: 0, updated: 0 };
    }

    this.log.i('Обработка карточек WB', {
      marketAccountId,
      total: cards.length,
    });

    let created = 0;
    let updated = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      try {
        const result = await this.upsertItem(companyId, marketAccountId, card);
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

  private async upsertItem(
    companyId: string,
    marketAccountId: string,
    card: WbCard
  ): Promise<'created' | 'updated'> {
    const nmId = String(card.nmID);
    const vendorCode = card.vendorCode || String(card.nmID);
    const name = card.title ?? card.brand ?? vendorCode;

    const primaryPhoto =
      card.photos?.[0]?.big ??
      card.photos?.[0]?.c516x688 ??
      card.photos?.[0]?.c246x328 ??
      null;

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

    const wbData = {
      nmId,
      imtId: card.imtID != null ? String(BigInt(card.imtID)) : null,
      vendorCode,
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
      if (productToMerge) {
        this.log.i('Объединение карточки WB с существующим Product с Ozon', {
          vendorCode: vendorCodeTrimmed,
          productId: product.id,
        });
      }
    });
    return 'created';
  }
}
