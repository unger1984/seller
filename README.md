# Seller

SaaS для управления товарами на Ozon и Wildberries. Multi-tenant монорепозиторий.

## Требования

- Node.js 20+
- Docker (Postgres, Redis)
- npm

## Quick Start

```bash
# Зависимости
npm install

# Инфраструктура (Postgres + Redis на localhost)
docker-compose up -d

# Конфиг
cp .env.example .env
# Отредактировать .env — пароль БД, JWT_SECRET, при необходимости CREDENTIALS_ENCRYPTION_KEY

# Сертификаты (HTTPS для local/stage)
npm run certs

# Миграции
npm run db:migrate

# Запуск
npm run dev:api    # https://localhost:8084, Swagger https://localhost:8084/api/docs
npm run dev:web    # https://localhost:8443
npm run dev:worker
```

## Структура

- `apps/api` — NestJS API, Swagger `/api/docs`
- `apps/web` — React + Vite + FSD
- `apps/worker-import`, `worker-publish`, `worker-sync-stock` — BullMQ workers (SRP: одна очередь — один образ)
- `packages/` — domain, shared-types, prisma-client, api-contracts, shared

## Команды

| Команда | Описание |
|---------|----------|
| `npm run build` | Сборка api, web, worker |
| `npm run dev:api` | API в dev-режиме |
| `npm run dev:web` | Web в dev-режиме |
| `npm run dev:worker` | Worker |
| `npm run db:migrate` | Prisma миграции |
| `npm run db:studio` | Prisma Studio |
| `npm run test` | Vitest |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

Stage-окружение: `dev:api:stage`, `dev:worker:stage`, `db:migrate:stage` (см. `.env.stage.example`).

## Документация

- [Архитектура](./docs/architecture/overview.md)
- [Поток данных](./docs/architecture/data-flow.md)
- [ADR](./docs/architecture/adr/)
- [Интеграции](./docs/integration/) — Ozon, Wildberries
- [Runbooks](./docs/runbooks/)
