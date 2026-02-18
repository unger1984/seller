# ADR 0002: Zod + Swagger для API

## Статус

Принято

## Контекст

Нужна валидация DTO и документация API.

## Решение

- Zod для схем и валидации
- nestjs-zod для интеграции с NestJS
- Swagger генерируется из Zod-схем

## Последствия

- Единый источник правды для контрактов
- BigInt → string на границе API (Zod + output transform)
