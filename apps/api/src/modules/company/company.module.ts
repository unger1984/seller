/** Модуль компаний */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company, CompanyMember } from '@seller/typeorm';
import { CompanyController } from './company.controller.js';
import { CompanyService } from './company.service.js';
import { TenantGuard } from '../../shared/guards/tenant.guard.js';

@Module({
  imports: [TypeOrmModule.forFeature([Company, CompanyMember])],
  controllers: [CompanyController],
  providers: [CompanyService, TenantGuard],
  exports: [CompanyService, TenantGuard, TypeOrmModule],
})
export class CompanyModule {}
