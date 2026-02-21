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

## Эндпоинты импорта

| Шаг | Метод | Описание |
|-----|-------|----------|
| A | POST /v3/product/list | Список product_id (filter visibility: ALL, пагинация last_id) |
| B | POST /v3/product/info/list | Карточки по product_id[] (батчи 500) |
| C | POST /v2/product/pictures/info | Фото по product_id[] |
| D | POST /v5/product/info/prices | Цены по product_id[] (filter + last_id) |
| E | POST /v1/warehouse/list | Список складов warehouse_id |
| F | POST /v1/product/info/stocks-by-warehouse/fbs | Остатки FBS по складам |
| - | POST /v4/product/info/attributes | Габариты, вес, атрибуты |
| - | POST /v1/product/info/description | Описание (фаза 2 для товаров без description) |
