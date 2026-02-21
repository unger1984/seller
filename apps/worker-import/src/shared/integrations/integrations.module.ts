/** Модуль интеграций с маркетплейсами — фабрики API-репозиториев */
import { Module } from '@nestjs/common';
import { WbApiRepositoryFactory } from './wb-api.repository.factory';
import { OzonApiRepositoryFactory } from './ozon-api.repository.factory';

@Module({
  providers: [WbApiRepositoryFactory, OzonApiRepositoryFactory],
  exports: [WbApiRepositoryFactory, OzonApiRepositoryFactory],
})
export class IntegrationsModule {}
