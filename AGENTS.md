# Seller — Project Overview

SaaS для управления товарами на Ozon и Wildberries. Multi-tenant монорепозиторий.

## AI Workflow

- **Перед изменениями:** читать `.cursor/rules/` — правила для API, Prisma, frontend, tenancy
- Учитывать ESLint и Prettier; pre-commit запускает lint-staged (ESLint --fix, Prettier) — см. `.cursor/rules/pre-commit-lint-staged.mdc`
- Давать конкретные решения для проекта
- Отвечать на русском

## Конвенции

- **БД:** snake_case, COMMENT ON TABLE/COLUMN на русском
- **Код:** JSDoc и комментарии к сложной логике — на русском
- **Зависимости:** фиксированные версии без `^`, обновления через Renovate/Dependabot
- **npm:** запрещены `--ignore-scripts` и `--legacy-peer-deps` (см. `.cursor/rules/npm-install.mdc`)
- **nx:** вызывать через `npx nx` (см. `.cursor/rules/nx-npx.mdc`)
- **Pre-commit:** husky + lint-staged; коммит блокируется при ошибках ESLint/Prettier

## Документация

- [Архитектура](./docs/architecture/overview.md)
- [Поток данных](./docs/architecture/data-flow.md)
- [ADR](./docs/architecture/adr/)
- [Интеграции](./docs/integration/) — Ozon, Wildberries
- [Runbooks](./docs/runbooks/) — миграции, troubleshooting, deps
- [Мониторинг stage](./docs/runbooks/stage-monitoring.md) — k9s, stern, Grafana, Loki
- [Развёртывание мониторинга](./docs/runbooks/monitoring-deploy.md) — kube-prometheus-stack, Loki, Alloy
