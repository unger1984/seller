# ADR 0001: Выбор Nx для монорепозитория

## Статус

Принято

## Контекст

Нужен монорепозиторий для apps (api, web, worker) и packages (domain, shared-types, typeorm, shared).

## Решение

Nx — проверенная экосистема для монорепо, интеграция с NestJS, Vite, TypeORM.

## Последствия

- Единая команда `nx run-many -t build`
- Кэширование сборок
- Зависимости между проектами через `workspace:*`
- nx вызывать через `npx nx` при прямом вызове (не из npm scripts)
