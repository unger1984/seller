/** Сервис аккаунтов маркетплейсов — CRUD, шифрование credentials */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marketplace, MarketAccount } from '@seller/typeorm';
import { CredentialsCryptoService } from '../../shared/common/credentials-crypto.service.js';
import { sha256Hash } from '@seller/shared';
import type {
  CreateMarketAccountInput,
  UpdateMarketAccountCredentialsInput,
} from '@seller/shared-types';

@Injectable()
export class MarketAccountService {
  constructor(
    @InjectRepository(MarketAccount)
    private readonly repo: Repository<MarketAccount>,
    private readonly crypto: CredentialsCryptoService
  ) {}

  /** Список аккаунтов компании */
  async list(companyId: string) {
    return this.repo.find({
      where: { companyId },
      select: ['id', 'marketplace', 'name', 'isActive', 'createdAt'],
    });
  }

  /** Создать аккаунт — credentials шифруются. Максимум один Ozon и один WB на компанию. */
  async create(companyId: string, data: CreateMarketAccountInput) {
    const existing = await this.repo.findOne({
      where: { companyId, marketplace: data.marketplace as Marketplace },
    });
    if (existing) {
      const msg =
        data.marketplace === 'OZON'
          ? 'Ozon уже подключён'
          : 'Wildberries уже подключён';
      throw new ConflictException(msg);
    }

    const credentialsJson = JSON.stringify(data.credentials);
    const credentialsEncrypted = this.crypto.encrypt(credentialsJson);
    const credentialsHash = sha256Hash(credentialsJson);

    const acc = this.repo.create({
      companyId,
      marketplace: data.marketplace as Marketplace,
      name: data.name,
      credentialsEncrypted,
      credentialsVersion: 1,
      credentialsHash,
    });
    await this.repo.save(acc);
    return this.repo.findOneOrFail({
      where: { id: acc.id },
      select: ['id', 'marketplace', 'name', 'isActive', 'createdAt'],
    });
  }

  /** Обновить credentials */
  async updateCredentials(
    companyId: string,
    id: string,
    data: UpdateMarketAccountCredentialsInput
  ) {
    const acc = await this.repo.findOne({
      where: { id, companyId },
    });
    if (!acc) throw new NotFoundException('Аккаунт маркетплейса не найден');
    if (acc.marketplace !== data.marketplace) {
      throw new ForbiddenException('Маркетплейс не совпадает');
    }

    const credentialsJson = JSON.stringify(data.credentials);
    const credentialsEncrypted = this.crypto.encrypt(credentialsJson);
    const credentialsHash = sha256Hash(credentialsJson);

    await this.repo.update(id, { credentialsEncrypted, credentialsHash });
    return this.repo.findOneOrFail({
      where: { id },
      select: ['id', 'marketplace', 'name', 'isActive', 'createdAt'],
    });
  }

  /** Удалить аккаунт */
  async delete(companyId: string, id: string) {
    const acc = await this.repo.findOne({
      where: { id, companyId },
    });
    if (!acc) throw new NotFoundException('Аккаунт маркетплейса не найден');
    await this.repo.delete({ id });
    return { deleted: true };
  }
}
