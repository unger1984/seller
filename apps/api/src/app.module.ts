/** Корневой модуль приложения */
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { HttpLoggingInterceptor } from './shared/http-logging/index.js';
import { LoggerModule } from './shared/logger/logger.module.js';
import { ConfigModule } from './shared/config/config.module.js';
import { PrismaModule } from './shared/prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CompanyModule } from './modules/company/company.module.js';
import { MarketAccountModule } from './modules/market-account/market-account.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { ListingModule } from './modules/listing/listing.module.js';
import { MatchingModule } from './modules/matching/matching.module.js';
import { SyncModule } from './modules/sync/sync.module.js';

@Module({
  imports: [
    LoggerModule,
    ConfigModule,
    PrismaModule,
    AuthModule,
    CompanyModule,
    MarketAccountModule,
    ProductModule,
    ListingModule,
    MatchingModule,
    SyncModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
