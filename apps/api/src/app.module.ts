/** Корневой модуль приложения */
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { LoggerModule } from './logger/logger.module.js';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CompanyModule } from './company/company.module.js';
import { MarketAccountModule } from './market-account/market-account.module.js';
import { ProductModule } from './product/product.module.js';
import { ListingModule } from './listing/listing.module.js';
import { MatchingModule } from './matching/matching.module.js';
import { SyncModule } from './sync/sync.module.js';

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
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
