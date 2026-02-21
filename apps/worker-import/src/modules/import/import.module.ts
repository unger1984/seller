/** Модуль импорта каталога — сервисы WB и Ozon */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product,
  ProductOzon,
  ProductWb,
  Warehouse,
  ProductWbWarehouseStock,
  ProductOzonWarehouseStock,
} from '@seller/typeorm';
import { IntegrationsModule } from '../../shared/integrations/integrations.module';
import { WbImportService } from './wb-import.service';
import { OzonImportService } from './ozon-import.service';

@Module({
  imports: [
    IntegrationsModule,
    TypeOrmModule.forFeature([
      Product,
      ProductOzon,
      ProductWb,
      Warehouse,
      ProductWbWarehouseStock,
      ProductOzonWarehouseStock,
    ]),
  ],
  providers: [WbImportService, OzonImportService],
  exports: [WbImportService, OzonImportService],
})
export class ImportModule {}
