/** Сервис синхронизации — постановка jobs, история (stub) */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { SyncQueueService } from './sync-queue.service.js';
import type { ImportCatalogInput } from '@seller/shared-types';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: SyncQueueService
  ) {}

  /** Запустить импорт каталога */
  async importCatalog(companyId: string, data: ImportCatalogInput) {
    const account = await this.prisma.marketAccount.findFirst({
      where: { id: data.marketAccountId, companyId },
    });
    if (!account) throw new NotFoundException('Аккаунт маркетплейса не найден');
    const result = await this.queue.addImportCatalog({
      marketAccountId: data.marketAccountId,
      companyId,
    });
    return result;
  }

  /** История jobs — stub, BullMQ не хранит историю по умолчанию */
  async listJobs(
    _companyId: string,
    _query: { page?: number; limit?: number }
  ) {
    // TODO: хранить jobId в БД при постановке, отдавать историю
    return { items: [], total: 0, page: 1, limit: 20 };
  }

  /** Детали job — stub */
  async getJob(_companyId: string, _jobId: string) {
    throw new NotFoundException('Задача не найдена');
  }
}
