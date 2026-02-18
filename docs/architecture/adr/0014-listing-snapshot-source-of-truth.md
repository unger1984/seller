# ADR 0014: Listing snapshot — не master

## Статус

Принято

## Контекст

Snapshot хранит "как пришло от площадки".

## Решение

- Master-данные — в Product/Variant
- Snapshot — только внешний источник, не источник правды
- snapshot + snapshotHash + snapshotUpdatedAt; обновлять только при изменении hash
