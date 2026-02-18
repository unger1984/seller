# ADR 0011: MarketAccount credentials blob

## Статус

Принято

## Контекст

Формат хранения credentials.

## Решение

- credentialsEncrypted — string (base64/hex), не JSON
- credentialsVersion — Int для миграций
- credentialsHash — опционально для дедупа
