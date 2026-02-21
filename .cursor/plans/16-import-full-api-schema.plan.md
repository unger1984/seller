---
name: ''
overview: ''
todos: []
isProject: false
---

# План: Полная переделка импорта и схемы БД под Ozon/WB API

## Обзор

Текущая реализация импорта неполная: используется только часть полей API, данные хранятся в `Listing.snapshot` (JSON) без структуры. Цель — корректно дергать все нужные методы Ozon и WB, сохранять поля в нормализованные таблицы.

---

## 0. Источники документации

- **Ozon:** [docs.ozon.ru/api/seller](https://docs.ozon.ru/api/seller) — официальная документация. Спеки методов: [Open Integrations — Get product list](https://en.openintegrations.dev/docs/Ozon/Uploading-and-updating-products/Get-product-list), [Get products information](https://en.openintegrations.dev/docs/Ozon/Uploading-and-updating-products/Get-products-information), [Get products attributes](https://en.openintegrations.dev/docs/Ozon/Uploading-and-updating-products/Get-products-attributes-data).
- **WB:** [dev.wildberries.ru/docs/openapi/work-with-products](https://dev.wildberries.ru/docs/openapi/work-with-products) — карточки товаров; [openapi.wildberries.ru/content/swagger](https://openapi.wildberries.ru/content/swagger/api/en/swagger.yaml) — OpenAPI.

---

## 1. Ozon API — методы и порядок вызовов

### 1.1 POST /v3/product/list

**Назначение:** Список товаров (пагинация `last_id`).

**Ответ (из документации):** `result.items[]`:

| Поле           | Тип     | Описание                                |
| -------------- | ------- | --------------------------------------- |
| product_id     | integer | ID товара в Ozon                        |
| offer_id       | string  | Артикул продавца                        |
| is_fbo_visible | boolean | Видимость в FBO (Fulfillment by Ozon)   |
| is_fbs_visible | boolean | Видимость в FBS (Fulfillment by Seller) |
| archived       | boolean | Товар в архиве                          |
| is_discounted  | boolean | Есть активные скидки                    |

Пагинация: `result.last_id`, `result.total`.

**Использование:** Первый шаг — получаем все `product_id` для дальнейших запросов.

### 1.2 POST /v3/product/info/list

**Назначение:** Основные поля товара.

**Запрос:** `{ product_id: string[] }` — до 1000 id за раз.

**Ответ (из документации):** `result.items[]`:

| Поле              | Тип      | Описание                                       |
| ----------------- | -------- | ---------------------------------------------- |
| id                | integer  | ID товара в Ozon                               |
| offer_id          | string   | Артикул в системе продавца                     |
| name              | string   | Название товара                                |
| barcode           | string?  | Штрихкод                                       |
| category_id       | integer  | ID категории                                   |
| created_at        | string   | Дата создания                                  |
| price             | string   | Текущая цена                                   |
| old_price         | string?  | Старая цена                                    |
| buybox_price      | string?  | Цена в корзине (buybox)                        |
| marketing_price   | string?  | Маркетинговая цена                             |
| premium_price     | string?  | Премиум-цена                                   |
| recommended_price | string?  | Рекомендуемая цена                             |
| min_price         | string?  | Минимальная цена                               |
| min_ozon_price    | string?  | Минимальная цена Ozon                          |
| currency_code     | string   | Валюта (RUB)                                   |
| stocks            | object   | Остатки: coming, present, reserved             |
| images            | string[] | Массив URL фото                                |
| images360         | string[] | Массив URL 360° фото                           |
| primary_image     | string?  | URL основного изображения                      |
| color_image       | string?  | URL маркетингового изображения цвета           |
| visible           | boolean  | Видимость товара                               |
| vat               | string   | НДС                                            |
| status            | object   | Статус: state, product_state, validation_state |
| updated_at        | string   | Дата обновления                                |
| sku               | integer? | SKU в Ozon                                     |

### 1.3 POST /v4/products/info/attributes

**Назначение:** Характеристики и габариты (документация: Open Integrations / Ozon).

**Запрос:** `{ filter: { product_id?: string[], offer_id?: string[] }, limit?, last_id? }` — пагинация.

**Ответ (из документации):** `items[]`:

| Поле                    | Тип      | Описание                                           |
| ----------------------- | -------- | -------------------------------------------------- |
| id                      | integer  | ID товара                                          |
| offer_id                | string   | Артикул                                            |
| barcode                 | string?  | Штрихкод                                           |
| category_id             | integer  | ID категории                                       |
| type_id                 | integer? | ID типа товара                                     |
| height                  | number   | Высота (dimension_unit, обычно mm)                 |
| width                   | number   | Ширина                                             |
| depth                   | number   | Глубина                                            |
| dimension_unit          | string   | Единица габаритов (mm)                             |
| weight                  | number   | Вес (weight_unit, обычно g)                        |
| weight_unit             | string   | Единица веса                                       |
| images                  | string[] | Фото                                               |
| images360               | string[] | Фото 360°                                          |
| pdf_list                | array?   | Список PDF                                         |
| color_image             | string?  | URL цвета                                          |
| attributes              | array    | Характеристики: attribute_id, complex_id, values[] |
| complex_attributes      | array?   | Сложные атрибуты                                   |
| description_category_id | integer? | ID категории описания                              |

### 1.4 POST /v1/product/info/description

**Назначение:** Описание товара (HTML).

**Запрос:** `{ product_id: number }` или `{ offer_id: string }`.

**Ответ:** HTML-описание.

### Алгоритм Ozon

1. Вызвать `v3/product/list` с пагинацией — собрать все `product_id` и `offer_id`.
2. Для каждой порции до 1000 `product_id` вызвать `v3/product/info/list`.
3. Для каждой порции вызвать `v4/products/info/attributes` (по product_id).
4. Для каждого товара (или батча, если API поддерживает) вызвать `v1/product/info/description`.

---

## 2. Wildberries API

### 2.1 POST /content/v2/get/cards/list

**Назначение:** Список карточек товаров (всё в одном методе).

**Документация:** [WB API — Список карточек товаров](https://dev.wildberries.ru/docs/openapi/work-with-products#tag/Kartochki-tovarov/paths/~1content~1v2~1get~1cards~1list/post)

**Запрос (body):**

```json
{
  "settings": {
    "sort": { "ascending": true },
    "cursor": { "limit": 100, "updatedAt": "...", "nmID": 123 },
    "filter": { "textSearch", "withPhoto", "imtID", "objectIDs", "brands", "tagIDs" }
  }
}
```

**Ответ (из документации WB):** `cards[]`, `cursor`:

| Поле            | Тип      | Описание                                                      |
| --------------- | -------- | ------------------------------------------------------------- |
| nmID            | integer  | Номенклатурный ID (артикул WB)                                |
| imtID           | integer? | ID объединённой карточки (image/media identifier)             |
| nmUUID          | string?  | UUID карточки                                                 |
| subjectID       | integer  | ID предмета (категории)                                       |
| subjectName     | string?  | Название предмета                                             |
| vendorCode      | string   | Артикул продавца                                              |
| brand           | string?  | Бренд                                                         |
| title           | string?  | Наименование                                                  |
| description     | string?  | Описание                                                      |
| photos          | array    | Фото: big, c246x328, c516x688, square, tm (WEBP с мая 2024)   |
| video           | string?  | URL видео                                                     |
| wholesale       | object   | Опт: enabled, quantum                                         |
| dimensions      | object   | length, width, height, weightBrutto, isValid                  |
| characteristics | array    | Характеристики: id, name, value[]                             |
| sizes           | array    | Размеры: chrtID, techSize, wbSize, skus[], price              |
| tags            | array    | Теги: id, name, color                                         |
| needKiz         | boolean? | Требуется маркировка «Честный ЗНАК» (добавлено с апреля 2025) |
| createdAt       | string   | Дата создания                                                 |
| updatedAt       | string   | Дата обновления                                               |

Пагинация: `cursor.updatedAt`, `cursor.nmID`, `cursor.limit`, `cursor.total`.

**Важно:** Текущий `wb.client` отправляет `{ limit: 1000 }` без `settings` — формат неверный. Нужно передавать `{ settings: { sort: { ascending: true }, cursor: { limit: 100 } } }`.

### Алгоритм WB

1. Вызвать `POST /content/v2/get/cards/list` с пагинацией (limit 100, затем cursor).
2. Один запрос возвращает полные карточки — дополнительные методы не нужны.

---

## 3. Схема БД: общая и маркетплейс-специфичная

### 3.1 Концепция

- **products** — общие поля, общие для Ozon и WB (название, артикул продавца, бренд и т.п.).
- **product_ozon** — поля, специфичные для Ozon (product_id, sku, Ozon-цены, Ozon-остатки, фото и т.д.).
- **product_wb** — поля, специфичные для WB (nm_id, imt_id, chrt_id по размерам, WB-характеристики, фото и т.д.).

Связь: `Product` 1:1 с `ProductOzon` и/или `ProductWb` (если товар есть на соответствующем маркетплейсе).

### 3.2 Общая таблица `products`

Поля, которые можно сопоставить между Ozon и WB:

| Поле        | Тип       | Комментарий                              |
| ----------- | --------- | ---------------------------------------- |
| id          | cuid      | PK                                       |
| company_id  | uuid      | FK                                       |
| name        | string    | Название (merge из Ozon/WB)              |
| brand       | string?   | Бренд                                    |
| description | text?     | Описание (merge, приоритет — полнее)     |
| vendor_code | string    | Артикул продавца (offer_id / vendorCode) |
| created_at  | timestamp |                                          |
| updated_at  | timestamp |                                          |

Важно: в текущей схеме `Product` содержит `name`, `brand`, `description`, а `Variant` — `vendorCode`. Для матричных товаров (несколько размеров) `vendorCode` может отличаться на размер. Ниже рассмотрены оба варианта: product-level и variant-level.

### 3.3 Таблица `product_ozon`

Специфичные поля Ozon (из v3/product/info/list, v4/attributes, v1/description):

| Поле              | Тип        | Источник                                |
| ----------------- | ---------- | --------------------------------------- |
| id                | cuid       | PK                                      |
| product_id        | cuid       | FK → products                           |
| market_account_id | uuid       | FK                                      |
| ozon_product_id   | bigint     | product_id из Ozon                      |
| offer_id          | string     | Артикул в Ozon                          |
| sku               | bigint?    | SKU в Ozon                              |
| name              | string?    | name из API                             |
| barcode           | string?    | Штрихкод                                |
| category_id       | bigint?    |                                         |
| description       | text?      | Из v1/product/info/description          |
| price             | decimal?   | Текущая цена                            |
| old_price         | decimal?   |                                         |
| marketing_price   | decimal?   |                                         |
| premium_price     | decimal?   |                                         |
| recommended_price | decimal?   |                                         |
| min_price         | decimal?   |                                         |
| currency_code     | string?    |                                         |
| stock_present     | int?       | stocks.present                          |
| stock_reserved    | int?       | stocks.reserved                         |
| stock_coming      | int?       | stocks.coming                           |
| primary_image     | string?    | URL                                     |
| images            | jsonb?     | Массив URL                              |
| images360         | jsonb?     |                                         |
| visible           | boolean?   |                                         |
| status            | jsonb?     | Статус модерации                        |
| vat               | string?    |                                         |
| height_cm         | decimal?   | Из v4/attributes                        |
| width_cm          | decimal?   |                                         |
| depth_cm          | decimal?   |                                         |
| weight_kg         | decimal?   |                                         |
| attributes        | jsonb?     | Характеристики из v4/attributes         |
| raw_info_list     | jsonb?     | Опционально: полный ответ v3/info/list  |
| raw_attributes    | jsonb?     | Опционально: полный ответ v4/attributes |
| synced_at         | timestamp? | Время последней синхронизации           |

Уникальность: `(market_account_id, ozon_product_id)` или `(market_account_id, offer_id)`.

### 3.4 Таблица `product_wb`

Специфичные поля WB (из /content/v2/get/cards/list):

| Поле              | Тип        | Источник                                       |
| ----------------- | ---------- | ---------------------------------------------- |
| id                | cuid       | PK                                             |
| product_id        | cuid       | FK → products                                  |
| market_account_id | uuid       | FK                                             |
| nm_id             | bigint     | Артикул WB                                     |
| imt_id            | bigint?    | ID объединённой карточки                       |
| vendor_code       | string     | Артикул продавца                               |
| subject_id        | int?       | subjectID                                      |
| subject_name      | string?    | subjectName                                    |
| brand             | string?    |                                                |
| title             | string?    | Наименование                                   |
| description       | text?      | Описание                                       |
| primary_photo     | string?    | photos[0].big или первый URL                   |
| photos            | jsonb?     | Массив { big, c246x328, c516x688, square, tm } |
| video             | string?    | URL видео                                      |
| wholesale_enabled | boolean?   | wholesale.enabled                              |
| wholesale_quantum | int?       | wholesale.quantum                              |
| length_cm         | decimal?   | dimensions                                     |
| width_cm          | decimal?   |                                                |
| height_cm         | decimal?   |                                                |
| weight_kg         | decimal?   | weightBrutto                                   |
| characteristics   | jsonb?     | characteristics[]                              |
| sizes             | jsonb?     | sizes[] (chrtID, techSize, skus, price)        |
| tags              | jsonb?     | tags[]                                         |
| raw_card          | jsonb?     | Полный объект карточки                         |
| synced_at         | timestamp? |                                                |

Уникальность: `(market_account_id, nm_id)`.

### 3.5 Варианты и размеры (Variant)

**Listing удаляется** — больше не используется. Связь Product ↔ маркетплейс через product_ozon / product_wb.

- **Ozon:** product_ozon хранит offer_id, ozon_product_id; размеры (если матрица) — в attributes или отдельной структуре.
- **WB:** product_wb хранит nm_id; размеры в `sizes` (jsonb): chrtID, techSize, skus, price.

Вариант (Variant) при необходимости — для внутренней матрицы товаров. Связь Product ↔ маркетплейс — только через product_ozon / product_wb.

---

## 4. Миграция схемы (без сохранения старых данных)

### 4.1 Удаляемые таблицы

Старые данные **не сохраняем**. Удалить:

- `listings` — за ненадобностью (связь Product ↔ маркетплейс через product_ozon / product_wb)
- `ozon_listing_ids` — внешние ID Ozon переедут в product_ozon
- `wb_listing_ids` — внешние ID WB переедут в product_wb
- `match_candidates` — новый импорт создаёт Product напрямую, этап матчинга не нужен

### 4.2 Удаляемые enums (после удаления таблиц)

- `ListingStatus`, `SyncPolicy`, `StockSyncPolicy`, `PriceSyncPolicy` — были на Listing
- `MatchMethod`, `MatchStatus` — были на MatchCandidate
- `ExternalRefType` — использовался в MatchCandidate

### 4.3 Шаги миграции Prisma

1. Удалить модели: Listing, OzonListingIds, WbListingIds, MatchCandidate.
2. Убрать из MarketAccount: listings, matchCandidates, ozonListingIds, wbListingIds.
3. Убрать из Variant: listings, matchCandidates.
4. Создать таблицы `product_ozon`, `product_wb`.
5. Обновить Product (добавить vendor_code при необходимости).
6. Обновить API, UI, worker-import под новую схему.

---

## 5. Переделка парсера (worker-import)

### 5.1 Ozon

1. **ozon.client.ts:**

- `fetchOzonProductList()` — уже есть.
- `fetchOzonProductInfoList(productIds: string[])` — v3/product/info/list.
  - `fetchOzonProductAttributes(filter)` — v4/products/info/attributes.
- `fetchOzonProductDescription(productId: number | offerId: string)` — v1/product/info/description.

1. **import.processor.ts:**

- Загрузить список через v3/product/list.
- Батчами по 1000 вызывать v3/product/info/list.
  - Батчами вызывать v4/products/info/attributes.
- Для каждого товара (или батча) — v1/product/info/description.
- Маппинг: Product + ProductOzon (без Listing).
- Учитывать rate limits (по документации Ozon).

### 5.2 WB

1. **wb.client.ts:**

- Переписать `fetchWbCardsList`: убрать упрощённый маппинг, возвращать полные объекты карточек из `cards[]`.
- Реализовать пагинацию через `cursor` (limit 100, cursor.updatedAt, cursor.nmID).
- Типы: описать интерфейс карточки (nmID, vendorCode, brand, title, description, photos, sizes, characteristics, dimensions и т.д.).

1. **import.processor.ts:**

- Для каждой карточки: Product + ProductWb (без Listing). Размеры в product_wb.sizes (jsonb).

---

## 6. Вопросы для уточнения

1. **Соответствие Product–Variant:**

- Один Product = одна карточка Ozon (product_id) / одна карточка WB (nm_id)?
- Один Variant = один offer_id (Ozon) / один size (chrt_id) (WB)?

1. **Точные URL Ozon:**

- v4: `/v4/products/info/attributes` (подтверждено документацией).
- v1: `/v1/product/info/description` — один product_id или батч?

1. **Токен WB:**

- POST /content/v2/get/cards/list требует токен категории «Контент» или «Продвижение».

1. **Приоритет полей при дублировании:**

- Если товар на Ozon и WB — откуда брать name, brand, description в products?

---

## 7. Порядок реализации

1. Создать миграцию: удалить Listing, OzonListingIds, WbListingIds, MatchCandidate; добавить product_ozon, product_wb.
2. Расширить wb.client: полный парсинг cards/list с пагинацией.
3. Реализовать Ozon-клиент: info/list, attributes, description.
4. Переписать import.processor для Ozon (Product + ProductOzon).
5. Переписать import.processor для WB (Product + ProductWb).
6. Обновить/удалить listing.service, matching: убрать код, зависящий от удалённых таблиц.
7. Обновить ProductService, API, UI для чтения из product_ozon/product_wb.
