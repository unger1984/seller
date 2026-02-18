/** Модуль листингов */
import { Module } from '@nestjs/common';
import { ListingController } from './listing.controller.js';
import { ListingService } from './listing.service.js';
import { SyncModule } from '../sync/sync.module.js';

@Module({
  imports: [SyncModule],
  controllers: [ListingController],
  providers: [ListingService],
  exports: [ListingService],
})
export class ListingModule {}
