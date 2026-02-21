/** Модуль продуктов и вариантов */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product,
  Variant,
  VariantBarcode,
  ProductOzon,
  ProductWb,
} from '@seller/typeorm';
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
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
