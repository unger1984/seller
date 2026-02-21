/** Модуль TypeORM для NestJS */
import type { InjectionToken } from '@nestjs/common';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import {
  Company,
  User,
  CompanyMember,
  MarketAccount,
  Warehouse,
  Product,
  Variant,
  VariantBarcode,
  ProductOzon,
  ProductWb,
  ProductWbWarehouseStock,
  ProductOzonWarehouseStock,
  IdempotencyKey,
} from './entities/index.js';

export type TypeOrmModuleOptions = {
  databaseUrl: string;
};

export type TypeOrmModuleAsyncOptions<TDeps extends unknown[] = []> = {
  useFactory: (
    ...args: TDeps
  ) => TypeOrmModuleOptions | Promise<TypeOrmModuleOptions>;
  inject?: { [K in keyof TDeps]: InjectionToken };
};

const ENTITIES = [
  Company,
  User,
  CompanyMember,
  MarketAccount,
  Warehouse,
  Product,
  Variant,
  VariantBarcode,
  ProductOzon,
  ProductWb,
  ProductWbWarehouseStock,
  ProductOzonWarehouseStock,
  IdempotencyKey,
];

@Global()
@Module({})
export class SellerTypeOrmModule {
  static forRootAsync<TDeps extends unknown[] = []>(
    options: TypeOrmModuleAsyncOptions<TDeps>
  ): DynamicModule {
    return {
      module: SellerTypeOrmModule,
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: async (...args: unknown[]) => {
            const opts = await options.useFactory(
              ...(args as Parameters<NonNullable<typeof options.useFactory>>)
            );
            return {
              type: 'postgres',
              url: opts.databaseUrl,
              entities: ENTITIES,
              migrations: [],
              synchronize: false,
            } as DataSourceOptions;
          },
          inject: options.inject ?? [],
        }),
      ],
      exports: [TypeOrmModule],
    };
  }

  static forFeature(entities: Parameters<typeof TypeOrmModule.forFeature>[0]) {
    return TypeOrmModule.forFeature(entities);
  }
}
