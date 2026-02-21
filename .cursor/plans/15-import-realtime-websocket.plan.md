---
name: Импорт с авто-матчем и WebSocket
overview: Переделать импорт — создавать/обновлять Product/Variant/Listing вместо MatchCandidate, авто-матч по offer_id/штрихкоду/артикулу. WebSocket для уведомления о завершении импорта, сохранение состояния «импорт идёт» для отображения лоадера при перезагрузке.
todos:
  - id: 1
    content: Redis keys для import:active
    status: completed
  - id: 2
    content: GET sync/import/status
    status: completed
  - id: 3
    content: Worker refactor Product/Variant/Listing
    status: completed
  - id: 4
    content: Worker Redis pub sync:import:done
    status: completed
  - id: 5
    content: WebSocket Gateway + Redis subscriber
    status: completed
  - id: 6
    content: Frontend useSyncImportStatus, Loader
    status: completed
isProject: false
---

# План: импорт с авто-матчем и WebSocket

## Целевой UX

1. **Кнопки «Скачать с Озон» и «Скачать с ВБ»** — отдельная кнопка для каждого маркета. При клике на свою кнопку — сразу лоадер (от одного маркета нельзя два импорта одновременно)
2. **Импорт** — Ozon/WB API → Product/Variant/Listing: создаётся новый или обновляется существующий (авто-матч)
3. **По завершении** — список товаров обновляется (фото, остатки, цены)
4. **При перезагрузке страницы во время импорта** — вместо кнопки лоадер (состояние «импорт идёт» на бэке)
5. **WebSocket** — сервер пушит «импорт закончен» → фронт обновляет список без polling

## 1. Состояние импорта (Redis)

Хранить активные импорты по маркету:

- Redis ключ `import:active:{marketAccountId}` = `{ jobId, companyId, startedAt }`, TTL 24h
- При постановке job в очередь: API пишет ключ
- Worker при старте job: проверяет/перезаписывает (опционально)
- Worker при завершении (success/fail): удаляет ключ
- API: `GET /companies/:companyId/sync/import/status` → для каждого marketAccountId проверяет Redis + при необходимости BullMQ (active job)

## 2. WebSocket (NestJS)

**Схема:**

- `@WebSocketGateway` в API (например `SyncGateway`)
- Клиент подключается с JWT (handshake: `auth` query или header)
- Комнаты по `companyId` — клиент join `company:${companyId}`
- Worker при завершении job публикует в Redis: `sync:import:done` { companyId, marketAccountId, jobId, status, created, updated }
- API: Redis subscriber слушает `sync:import:done`, эмитит в WebSocket комнату `company:${companyId}`

**Зависимости:** `@nestjs/websockets`, `@nestjs/platform-socket.io` (или ws). Redis pub/sub уже есть (ioredis).

## 3. Worker — авто-матч вместо MatchCandidate

**Ozon (пример логики):**

1. `product/list` → список offer_id, product_id
2. `product/info/list` (батчами) → name, photos, barcodes, price, stock
3. Для каждого товара:

- Поиск по `OzonListingIds (marketAccountId, offerId)` → есть Listing → **обновить** snapshot, ozonIds, цены/остатки
- Иначе поиск Variant по `VariantBarcode.barcode` (если Ozon вернул штрихкод) → **создать** Listing + OzonListingIds
- Иначе поиск Variant по `vendorCode = offer_id` → **создать** Listing + OzonListingIds
- Иначе **создать** Product (name) + Variant (vendorCode=offer_id) + Listing + OzonListingIds

**WB** — аналогично по chrtId, nmId, barcodes.

**Важно:** Worker после finish публикует в Redis `sync:import:done` и удаляет `import:active:{marketAccountId}`.

## 4. API endpoints

- `GET /companies/:companyId/sync/import/status` — возвращает `{ marketAccountId: { active: boolean, jobId?: string } }` для всех accounts компании
- `POST /companies/:companyId/sync/import` — без изменений, но при постановке job пишет Redis `import:active`

## 5. Frontend

- **useSyncImportStatus(companyId)** — при mount: GET import/status, подписка на WebSocket `sync:import:done` для companyId
- **Кнопки:** отдельно для Ozon и ВБ. Если `importStatus[marketAccountId].active` → Loader вместо соответствующей кнопки
- **При `sync:import:done`:** refetch products, обновить importStatus (active=false)
- **При клике «Скачать»:** POST sync/import, сразу set active=true (optimistic), ждём WS event

## 6. Порядок реализации

1. **Redis keys для import:active** — SyncService при add job, worker при complete/ fail
2. **GET sync/import/status** — читает Redis + optional BullMQ
3. **Worker: refactor** — Product/Variant/Listing вместо MatchCandidate, Ozon product/info для деталей
4. **Worker: Redis pub** — при complete публиковать sync:import:done
5. **WebSocket Gateway** — SyncGateway, auth, rooms по companyId
6. **Redis subscriber в API** — слушать sync:import:done, emit в комнату
7. **Frontend** — useSyncImportStatus, WebSocket client, Loader при active

## 7. MatchCandidate

- Оставить модель в БД (миграция не нужна), но воркер импорта больше не пишет
- MatchingModule/API можно оставить для ручного матчинга в будущем или удалить позже

## 8. Ozon product/info

Для имени, фото, штрихкодов нужен `POST /v3/product/info` или `/v3/product/info/list`. product/list даёт только product_id, offer_id. product/info/list — батч по product_id, возвращает структуру с primary_image, images, barcodes и т.д. См. docs.ozon.ru/api/seller.

## 9. CAP и ACID

**CAP:**

- Redis (import:active, pub/sub) — AP-система: при сетевом разрыве сохраняем доступность, жертвуем консистентностью. Лоадер может «зависнуть» если Redis недоступен — acceptable для UX.
- PostgreSQL (Product/Variant/Listing) — CP: консистентность и устойчивость к partition важнее, чем доступность записи.

**ACID (PostgreSQL):**

- Создание/обновление Product + Variant + Listing — в одной транзакции (`prisma.$transaction`). Либо всё сохраняем, либо откатываем полностью.
- Worker: при частичной ошибке (например, API маркета упал после половины) — транзакция на текущий batch откатывается; job можно retry, idempotency по offer_id/chrtId.
