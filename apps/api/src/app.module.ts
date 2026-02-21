/** Корневой модуль приложения */
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { HttpLoggingInterceptor } from './shared/http-logging/index.js';
import { LoggerModule } from './shared/logger/logger.module.js';
import { ConfigModule } from './shared/config/config.module.js';
import { ConfigService } from './shared/config/config.service.js';
import { SellerTypeOrmModule } from '@seller/typeorm';
import { RedisModule } from './shared/redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CompanyModule } from './modules/company/company.module.js';
import { MarketAccountModule } from './modules/market-account/market-account.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { SyncModule } from './modules/sync/sync.module.js';

@Module({
  imports: [
    LoggerModule,
    ConfigModule,
    SellerTypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        databaseUrl: config.cfg.db.databaseUrl,
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    AuthModule,
    CompanyModule,
    MarketAccountModule,
    ProductModule,
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
