/** Модуль продуктов и вариантов */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MarketAccount,
  Product,
  Variant,
  VariantBarcode,
  ProductOzon,
  ProductWb,
  Warehouse,
  ProductWbWarehouseStock,
  ProductOzonWarehouseStock,
} from '@seller/typeorm';
import { CredentialsCryptoService } from '../../shared/common/credentials-crypto.service.js';
import { CompanyModule } from '../company/company.module.js';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';

@Module({
  imports: [
    CompanyModule,
    TypeOrmModule.forFeature([
      Product,
      Variant,
      VariantBarcode,
      ProductOzon,
      ProductWb,
      MarketAccount,
      Warehouse,
      ProductWbWarehouseStock,
      ProductOzonWarehouseStock,
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService, CredentialsCryptoService],
  exports: [ProductService],
})
export class ProductModule {}
