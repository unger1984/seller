# ADR 0009: Origin tracking MVP vs ListingStock

## Статус

Принято

## Контекст

MVP — одна цифра остатка на Listing. Склады (FBO/FBS) — позже.

## Решение

- MVP: lastStockHash, lastStockOrigin на Listing
- Extension: ListingStock(listingId, warehouseId, warehouseType, quantity, origin, hash) — при поддержке складов
