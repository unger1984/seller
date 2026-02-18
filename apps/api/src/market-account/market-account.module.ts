/** Модуль аккаунтов маркетплейсов */
import { Module } from '@nestjs/common';
import { MarketAccountController } from './market-account.controller.js';
import { MarketAccountService } from './market-account.service.js';
import { CredentialsCryptoService } from '../common/credentials-crypto.service.js';

@Module({
  controllers: [MarketAccountController],
  providers: [MarketAccountService, CredentialsCryptoService],
  exports: [MarketAccountService],
})
export class MarketAccountModule {}
