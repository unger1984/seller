/** Модуль синхронизации */
import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncQueueService } from './sync-queue.service';

@Module({
  controllers: [SyncController],
  providers: [SyncService, SyncQueueService],
  exports: [SyncService, SyncQueueService],
})
export class SyncModule {}
