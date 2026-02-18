# ADR 0005: OzonListingIds / WbListingIds

## Статус

Принято

## Контекст

nullable колонки + unique дают "дыры" в PG. Ozon и WB используют разные ключи.

## Решение

- Отдельные таблицы OzonListingIds, WbListingIds (1:1 с Listing)
- Ozon: productId, sku, offerId
- WB: nmId, imtId, chrtId
- Unique по полям, уникальным в рамках кабинета
