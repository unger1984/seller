# ADR 0001: Выбор Nx для монорепозитория

## Статус

Принято

## Контекст

Нужен монорепозиторий для apps (api, web, worker) и packages (domain, shared-types, prisma-client, shared).

## Решение

Nx — проверенная экосистема для монорепо, интеграция с NestJS, Vite, Prisma через плагины.

## Последствия

- Единая команда `nx run-many -t build`
- Кэширование сборок
- Зависимости между проектами через `workspace:*`
