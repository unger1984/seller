/** Модуль синхронизации */
import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { SyncQueueService } from './sync-queue.service.js';

@Module({
  controllers: [SyncController],
  providers: [SyncService, SyncQueueService],
  exports: [SyncService, SyncQueueService],
})
export class SyncModule {}
