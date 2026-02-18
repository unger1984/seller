# Seller — Project Overview

SaaS для управления товарами на Ozon и Wildberries. Multi-tenant монорепозиторий.

## AI Workflow

- **Перед изменениями:** читать `.cursor/rules/` — правила для API, Prisma, frontend, tenancy
- Учитывать ESLint и Prettier
- Давать конкретные решения для проекта
- Отвечать на русском

## Конвенции

- **БД:** snake_case, COMMENT ON TABLE/COLUMN на русском
- **Код:** JSDoc и комментарии к сложной логике — на русском
- **Зависимости:** фиксированные версии без `^`, обновления через Renovate/Dependabot

## Документация

- [Архитектура](./docs/architecture/overview.md)
- [Поток данных](./docs/architecture/data-flow.md)
- [ADR](./docs/architecture/adr/)
- [Интеграции](./docs/integration/) — Ozon, Wildberries
- [Runbooks](./docs/runbooks/) — миграции, troubleshooting, deps
