---
name: Stage k3s deploy
overview: "Подготовка stage окружения: манифесты K8s для Postgres и Redis на k3s (192.168.1.8), конфигурация .env.stage и npm-скрипты для локального запуска проекта с подключением к удалённым сервисам."
todos:
  - id: k8s-manifests
    content: "Создать deploy/stage/: namespace, postgres (ConfigMap, Secret, PVC, Deployment, Service), redis (PVC, Deployment, Service)"
    status: completed
  - id: env-stage
    content: Добавить .env.stage.example и настроить ConfigModule на загрузку .env.stage при APP_ENV=stage
    status: completed
  - id: npm-scripts
    content: Добавить dev:api:stage, dev:worker:stage, db:migrate:stage; dotenv-cli для db:migrate:stage
    status: completed
  - id: runbook
    content: Написать docs/runbooks/stage-deploy.md с инструкциями деплоя и локального подключения
    status: completed
isProject: true
---

# Stage окружение — Postgres и Redis в k3s

## Текущее состояние

- [`docker-compose.yml`](docker-compose.yml) — Postgres 16, Redis 7 для локальной разработки
- [`.env.example`](.env.example) — `DATABASE_URL`, `REDIS_URL` для localhost
- API и Worker читают env из ConfigModule (NestJS) и Prisma config

## Архитектура

```mermaid
flowchart LR
    subgraph k3s [k3s на 192.168.1.8]
        Postgres[PostgreSQL NodePort 30032]
        Redis[Redis NodePort 30379]
    end
    subgraph local [Локальная машина]
        API[API nx serve]
        Worker[Worker]
        Web[Web]
    end
    API -->|DATABASE_URL| Postgres
    API -->|REDIS_URL| Redis
    Worker -->|DATABASE_URL| Postgres
    Worker -->|REDIS_URL| Redis
```
