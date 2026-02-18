/** Корневой модуль приложения */
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { MarketAccountModule } from './market-account/market-account.module';
import { ProductModule } from './product/product.module';
import { ListingModule } from './listing/listing.module';
import { MatchingModule } from './matching/matching.module';
import { SyncModule } from './sync/sync.module';

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
