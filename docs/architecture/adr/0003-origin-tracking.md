# ADR 0003: Origin Tracking

## Статус

Принято

## Контекст

При двустороннем sync (WB→master→Ozon) возможен ping-pong: пушим на Ozon → импортируем с Ozon → обновляем master → пушим на WB → цикл.

## Решение

- `lastStockOrigin`, `lastStockHash`, `lastStockAt` на Listing
- `lastPriceOrigin`, `lastPriceHash`, `lastPriceAt` аналогично
- При импорте: не перезаписывать, если origin уже с этой площадки
- Hash: sha256(stableStringify(obj))
