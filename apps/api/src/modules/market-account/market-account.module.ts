/** Модуль аккаунтов маркетплейсов */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketAccount } from '@seller/typeorm';
import { CompanyModule } from '../company/company.module.js';
import { MarketAccountController } from './market-account.controller.js';
import { MarketAccountService } from './market-account.service.js';
import { CredentialsCryptoService } from '../../shared/common/credentials-crypto.service.js';

@Module({
  imports: [CompanyModule, TypeOrmModule.forFeature([MarketAccount])],
  controllers: [MarketAccountController],
  providers: [MarketAccountService, CredentialsCryptoService],
  exports: [MarketAccountService],
})
export class MarketAccountModule {}
