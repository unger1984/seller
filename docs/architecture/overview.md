# Обзор архитектуры

## Bounded Contexts

- **Auth** — регистрация, вход, JWT, active company
- **Company** — тенанты, CompanyMember (many-to-many)
- **MarketAccount** — подключённые аккаунты Ozon/WB, credentials
- **Product/Variant** — master-каталог; привязки к площадкам через ProductOzon/ProductWb
- **Sync** — импорт, публикация, обновление остатков (BullMQ worker)

## Модули (NestJS)

- AuthModule
- CompanyModule
- MarketAccountModule
- ProductModule (Product, Variant, VariantBarcode, ProductOzon, ProductWb)
- SyncModule

## API Structure (apps/api/src)

- **modules/** — bounded context modules (Auth, Company, MarketAccount, Product, Sync)
- **shared/** — config, logger, typeorm, guards, common

## Диаграмма (упрощённая)

```
[Web] → [API] → [TypeORM] → [PostgreSQL]
                ↓
         [BullMQ] → [Worker] → [Ozon/WB API]
```
