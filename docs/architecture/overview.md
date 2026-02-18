# Обзор архитектуры

## Bounded Contexts

- **Auth** — регистрация, вход, JWT, active company
- **Company** — тенанты, CompanyMember (many-to-many)
- **MarketAccount** — подключённые аккаунты Ozon/WB, credentials
- **Product/Variant/Listing** — master-каталог и привязки к площадкам
- **Matching** — сопоставление импортированных товаров с вариантами
- **Sync** — импорт, публикация, обновление остатков (BullMQ worker)

## Модули (NestJS)

- AuthModule
- CompanyModule
- MarketAccountModule
- ProductModule (Product + Variant + VariantBarcode)
- ListingModule
- MatchingModule
- SyncModule

## Диаграмма (упрощённая)

```
[Web] → [API] → [Prisma] → [PostgreSQL]
                ↓
         [BullMQ] → [Worker] → [Ozon/WB API]
```
