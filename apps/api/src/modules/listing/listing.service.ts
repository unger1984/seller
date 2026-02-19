/** Сервис листингов — привязка Variant ↔ MarketAccount */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { SyncQueueService } from '../sync/sync-queue.service.js';
import type {
  CreateListingInput,
  UpdateListingPolicyInput,
  ListingListQuery,
} from '@seller/shared-types';

@Injectable()
export class ListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncQueue: SyncQueueService
  ) {}

  /** Создать листинг — инвариант: variant.companyId === marketAccount.companyId */
  async create(companyId: string, data: CreateListingInput) {
    const [variant, marketAccount] = await Promise.all([
      this.prisma.variant.findFirst({
        where: { id: data.variantId, companyId },
      }),
      this.prisma.marketAccount.findFirst({
        where: { id: data.marketAccountId, companyId },
      }),
    ]);
    if (!variant) throw new NotFoundException('Вариант не найден');
    if (!marketAccount)
      throw new NotFoundException('Аккаунт маркетплейса не найден');
    if (variant.companyId !== marketAccount.companyId) {
      throw new ForbiddenException(
        'Вариант и аккаунт маркетплейса должны принадлежать одной компании'
      );
    }

    return this.prisma.listing.create({
      data: {
        variantId: data.variantId,
        marketAccountId: data.marketAccountId,
        companyId: variant.companyId,
        status: ListingStatus.DRAFT,
        syncPolicy: data.syncPolicy,
        stockSyncPolicy: data.stockSyncPolicy,
        priceSyncPolicy: data.priceSyncPolicy,
      },
    });
  }

  /** Список листингов */
  async list(companyId: string, query: ListingListQuery) {
    const { page, limit, marketAccountId, status } = query;
    const where: {
      companyId: string;
      marketAccountId?: string;
      status?: ListingStatus;
    } = { companyId };
    if (marketAccountId) where.marketAccountId = marketAccountId;
    if (status) where.status = status as ListingStatus;

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          variant: { include: { product: true } },
          marketAccount: {
            select: { id: true, name: true, marketplace: true },
          },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** Обновить policy листинга */
  async updatePolicy(
    companyId: string,
    id: string,
    data: UpdateListingPolicyInput
  ) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, companyId },
    });
    if (!listing) throw new NotFoundException('Листинг не найден');
    return this.prisma.listing.update({
      where: { id },
      data: {
        syncPolicy: data.syncPolicy ?? listing.syncPolicy,
        stockSyncPolicy: data.stockSyncPolicy ?? listing.stockSyncPolicy,
        priceSyncPolicy: data.priceSyncPolicy ?? listing.priceSyncPolicy,
      },
    });
  }

  /** Опубликовать — ставит job в очередь */
  async publish(companyId: string, id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, companyId },
    });
    if (!listing) throw new NotFoundException('Листинг не найден');
    const { jobId } = await this.syncQueue.addPublishListing({
      listingId: id,
      companyId,
    });
    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        status: ListingStatus.PUBLISHED,
        lastSyncAt: new Date(),
      },
    });
    return { ...updated, jobId };
  }

  /** Запустить ручную синхронизацию */
  async triggerSync(companyId: string, id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, companyId },
    });
    if (!listing) throw new NotFoundException('Листинг не найден');
    const { jobId } = await this.syncQueue.addSyncStock({
      listingId: id,
      companyId,
    });
    return { queued: true, listingId: id, jobId };
  }
}
