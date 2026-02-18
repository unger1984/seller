/** Модуль аккаунтов маркетплейсов */
import { Module } from '@nestjs/common';
import { MarketAccountController } from './market-account.controller';
import { MarketAccountService } from './market-account.service';
import { CredentialsCryptoService } from '../common/credentials-crypto.service';

@Module({
  controllers: [MarketAccountController],
  providers: [MarketAccountService, CredentialsCryptoService],
  exports: [MarketAccountService],
})
export class MarketAccountModule {}
