/** Сервис аккаунтов маркетплейсов — CRUD, шифрование credentials */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Marketplace } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CredentialsCryptoService } from '../../shared/common/credentials-crypto.service.js';
import { sha256Hash } from '@seller/shared';
import type {
  CreateMarketAccountInput,
  UpdateMarketAccountCredentialsInput,
} from '@seller/shared-types';

@Injectable()
export class MarketAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CredentialsCryptoService
  ) {}

  /** Список аккаунтов компании */
  async list(companyId: string) {
    return this.prisma.marketAccount.findMany({
      where: { companyId },
      select: {
        id: true,
        marketplace: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  /** Создать аккаунт — credentials шифруются */
  async create(companyId: string, data: CreateMarketAccountInput) {
    const credentialsJson = JSON.stringify(data.credentials);
    const credentialsEncrypted = this.crypto.encrypt(credentialsJson);
    const credentialsHash = sha256Hash(credentialsJson);

    return this.prisma.marketAccount.create({
      data: {
        companyId,
        marketplace: data.marketplace as Marketplace,
        name: data.name,
        credentialsEncrypted,
        credentialsVersion: 1,
        credentialsHash,
      },
      select: {
        id: true,
        marketplace: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  /** Обновить credentials */
  async updateCredentials(
    companyId: string,
    id: string,
    data: UpdateMarketAccountCredentialsInput
  ) {
    const acc = await this.prisma.marketAccount.findFirst({
      where: { id, companyId },
    });
    if (!acc) throw new NotFoundException('Market account not found');
    if (acc.marketplace !== data.marketplace) {
      throw new ForbiddenException('Marketplace mismatch');
    }

    const credentialsJson = JSON.stringify(data.credentials);
    const credentialsEncrypted = this.crypto.encrypt(credentialsJson);
    const credentialsHash = sha256Hash(credentialsJson);

    return this.prisma.marketAccount.update({
      where: { id },
      data: { credentialsEncrypted, credentialsHash },
      select: {
        id: true,
        marketplace: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  /** Удалить аккаунт */
  async delete(companyId: string, id: string) {
    const acc = await this.prisma.marketAccount.findFirst({
      where: { id, companyId },
    });
    if (!acc) throw new NotFoundException('Market account not found');
    await this.prisma.marketAccount.delete({ where: { id } });
    return { deleted: true };
  }
}
