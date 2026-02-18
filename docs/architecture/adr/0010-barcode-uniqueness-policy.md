# ADR 0010: Политика уникальности штрихкодов

## Статус

Принято

## Контекст

@@unique([companyId, barcode]) может быть слишком жёстким: переиспользование, комплекты, ошибки.

## Решение

- @@index([companyId, barcode]) вместо unique
- Конфликты (несколько variant на один barcode) — MatchStatus=CONFLICT
- Сервис: barcode.trim(), reject пустые
