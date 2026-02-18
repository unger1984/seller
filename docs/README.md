# Seller — Документация

SaaS для управления товарами на Ozon и Wildberries. Multi-tenant монорепозиторий.

## Quick Start

```bash
# Запуск инфраструктуры
docker-compose up -d

# Миграции
npm run db:migrate

# API
npm run dev:api

# Web
npm run dev:web

# Worker
npm run dev:worker
```

При прямом вызове nx используй `npx nx` (например, `npx nx serve api`).

## Структура документации

- [Архитектура](./architecture/overview.md) — модули, bounded contexts, диаграммы
- [Поток данных](./architecture/data-flow.md) — схема синхронизации (mermaid)
- [ADR](./architecture/adr/) — архитектурные решения
- [API](./api/openapi.md) — Swagger, генерация из Zod
- [Интеграции](./integration/) — Ozon API, Wildberries API
- [Runbooks](./runbooks/) — миграции, troubleshooting, обновление зависимостей
