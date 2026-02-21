# Ozon API

## Базовый URL

- `https://api-seller.ozon.ru` — Seller API (docs.ozon.ru/api/seller)

## Авторизация

- Headers: `Client-Id`, `Api-Key`
- Документация: docs.ozon.ru/api/seller

## ID

- product_id, sku — числовые в API → хранить BigInt
- offer_id — артикул, строка
- Приводить на границе: parse при импорте, .toString() при отдаче в API
