/** Модуль синхронизации */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketAccount } from '@seller/typeorm';
import { ConfigService } from '../../shared/config/config.service.js';
import { CompanyModule } from '../company/company.module.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { SyncQueueService } from './sync-queue.service.js';

@Module({
  imports: [
    CompanyModule,
    TypeOrmModule.forFeature([MarketAccount]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.cfg.jwt.secret,
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncQueueService],
  exports: [SyncService, SyncQueueService],
})
export class SyncModule {}
