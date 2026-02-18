# ADR 0013: Prisma 7 setup

## Статус

Принято

## Контекст

Node 20.19+, TS 5.4+ для Prisma 7.

## Решение

- provider: prisma-client-js (стабильно)
- MVP без adapter-pg
- Подключить adapter-pg при профилировании, пулах, edge runtime
