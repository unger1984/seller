---
name: Seller Marketplace Sync RFC
overview: 'Полный исполняемый план создания SaaS для управления товарами на Ozon и Wildberries. Multi-tenant монорепозиторий: Nx, NestJS, Prisma, React, Vite, Zod, Swagger, Zustand, упрощённый FSD.'
todos:
  - id: phase0
    content: Phase 0 — правила, документация, AGENTS.md
    status: completed
  - id: monorepo
    content: Создание монорепо Nx + npm, структура папок
    status: completed
  - id: deps
    content: Установка зависимостей (фиксированные версии)
    status: completed
  - id: tooling
    content: ESLint, Prettier, TypeScript config
    status: completed
  - id: packages
    content: packages — domain, shared-types (Zod), prisma-client, api-contracts, shared (hash util)
    status: completed
  - id: docker
    content: docker-compose (PostgreSQL, Redis)
    status: completed
  - id: prisma
    content: Prisma schema, миграции
    status: completed
  - id: api-skeleton
    content: NestJS API skeleton, Swagger, nestjs-zod
    status: completed
  - id: auth
    content: Auth + Company модули
    status: completed
  - id: web-skeleton
    content: React + Vite + FSD + Zustand skeleton
    status: completed
  - id: market-accounts
    content: MarketAccount модуль
    status: completed
  - id: products
    content: Product, Variant, Listing модули
    status: completed
  - id: matching
    content: Matching модуль
    status: completed
  - id: sync-worker
    content: BullMQ worker, очереди
    status: completed
  - id: sync-engine
    content: Import, publish, sync_stock
    status: completed
isProject: true
---

# Seller — Исполняемый план (RFC)

**Версия:** 2.0  
**Дата:** 2025-02-18  
**Для агента:** Выполняй шаги по порядку. Создавай файлы и папки с нуля. Версии зависимостей — см. раздел «Версии зависимостей».

---

## Технические требования (обязательные)

- **Минимум тестов:** даже для MVP обязательны тесты на matching (barcode/vendorCode) и origin tracking (нет циклов). Это самые дорогие баги в проде.
- **Swagger** — обязательно, `/api/docs` или `/docs`
- **Zod** — все контракты (DTO, валидация) через Zod
- **Zustand** — state management на фронте
- **FSD** — упрощённый (app, pages, features, entities, shared)
- **Комментарии** — подробные на русском в коде и в БД (COMMENT ON TABLE/COLUMN — на русском)
- **TypeScript** — везде, strict mode
- **Версии** — для критичных пакетов фиксировать версии (без `^`). Обновления — Renovate/Dependabot. `package-lock.json` оставить, но не полагаться на него как на единственный стабилизатор.

---

## Уточнения для агента

### Ozon / Wildberries API — уровень детализации

**Нужно реализовать:**

- HTTP-клиенты (axios или fetch) с базовыми контрактами (Zod-схемы ответов)
- **Способ авторизации:** Ozon — Client-Id + Api-Key в headers; WB — Authorization: Bearer token
- **Список операций** (минимум для MVP): импорт каталога, создание/публикация продукта, обновление остатков. Конкретные endpoints — по официальной документации (Ozon: docs.ozon.ru/api/seller, WB: openapi.wildberries.ru)
- **Типы ID маркетплейсов:**
  - **WB:** nmId, imtId, chrtId — числовые в API → хранить `BigInt`. Приводить на границе (parse при импорте).
  - **Ozon:** product_id, sku — обычно числовые в API → хранить `BigInt` (productId, sku). offerId — артикул, строка.
- **BigInt в API (обязательно):** `BigInt` ломает JSON.stringify, Swagger, React. **Правило:** наружу (REST API) все marketplace IDs — **строка**.
  - Prisma: BigInt в БД
  - DTO input: строго `z.string()` + минимальная валидация. `z.number()` опасно — JS number до 2^53-1. **Numeric IDs** (nmId, chrtId, productId, sku): `z.string().regex(/^\d+$/)`. **offerId/vendorCode/barcode**: `z.string().trim().min(1)`. Антипаттерн: «просто string» без trim/regex — нормализация/матчинг страдают.
  - DTO output: всегда `string`. Преобразование Prisma → DTO: `.toString()` перед отдачей.
- **Хранение credentials API:**
  - `credentialsEncrypted` — строка (base64/hex), **не Json**. Формат: `version:nonce:ciphertext` или JSON-обёртка, хранится как string. Per marketplace: Ozon `{ clientId, apiKey }`, WB `{ apiKey }`.
  - `credentialsVersion` Int — версия формата/ключа, для миграций.
  - Не hash — ключи нужны в исходном виде. Шифрование: libsodium/envelope. Master key — env / Vault.
  - `credentialsHash` (опционально) — для дедупа. При чтении — расшифровать, передать в marketplace-клиент.

### Multi-tenant — User ↔ Company (many-to-many)

**Модель:** `CompanyMember(userId, companyId, role)` — пользователь может быть в нескольких компаниях. Роли: OWNER, ADMIN, MEMBER, VIEWER. Поддержка приглашений — позже.

**Active company:** `companyId` в JWT — текущая выбранная компания. При входе/смене компании — frontend отправляет выбранную компанию, backend проверяет членство в `CompanyMember` и выдаёт токен с этим `companyId`. Endpoint `PATCH /auth/me/active-company` или query-параметр при логине.

**Изоляция:** во всех Prisma-запросах `where: { companyId }` = `activeCompanyId` из JWT. Никогда не брать `companyId` из тела запроса.

**companyId в URL:** строго **403 при несовпадении** `req.params.companyId` с `activeCompanyId` из JWT (прозрачно для дебага). Альтернатива — убрать companyId из URL и делать `/products`, `/accounts` в контексте activeCompany. При текущем стиле `/companies/:companyId/...` — только 403.

**Tenant-модели:** MarketAccount, Product, Variant, VariantBarcode, Listing, OzonListingIds, WbListingIds, MatchCandidate, IdempotencyKey.

### Listing и внешние ID

**Почему не nullable в Listing:** nullable колонки + unique дают "дыры" в PG (много NULL). Ozon и WB используют разные ключи (Ozon: product_id/offer_id, WB: nmId/chrtId).

**Решение:** отдельные таблицы `OzonListingIds`, `WbListingIds` (1:1 с Listing). Unique по полям, которые реально уникальны в рамках кабинета.

**Listing.marketplace убрано:** дублировало MarketAccount.marketplace и могло расходиться. MVP: брать через `listing.marketAccount.marketplace`.

**Snapshot версионируемый:** `snapshot` + `snapshotHash` + `snapshotUpdatedAt`. Обновлять snapshot только если hash(newContent) ≠ snapshotHash — снижает шум, помогает идемпотентности. **Hash:** алгоритм `sha256(stableStringify(obj))`, утилита в `packages/shared/src/lib/hash.ts`. **stableStringify** должен канонизировать: BigInt → string (иначе упадёт), Decimal (Prisma) → string (`instanceof` или `toJSON`), Date → ISO string. Без обработки Prisma.Decimal — нестабильный hash. Антипаттерн: «просто JSON.stringify» или «stable stringify без replacer».

**Snapshot — не master:** snapshot хранит «как пришло от площадки», scope через marketAccount. Master-данные — в Product/Variant. Не использовать snapshot как источник правды (см. ADR 0014).

**Variant/Listing companyId — дубли:** companyId выводится через product (Variant) и variant/marketAccount (Listing). **Механизм (обязательно):** любой create/update для Variant, VariantBarcode, Listing — только внутри транзакции, где:

- **Variant:** проверяем `product.companyId`, пишем `variant.companyId = product.companyId`
- **VariantBarcode:** пишем `barcode.companyId = variant.companyId`
- **Listing:** проверяем `variant.companyId === marketAccount.companyId`, пишем `listing.companyId = variant.companyId` (всегда из variant)

**TenantGuard:** при маршрутах `/companies/:companyId/...` guard сравнивает `param.companyId` vs `activeCompanyId` из JWT (403 при несовпадении). **param в сервисы не передаётся** — всегда брать `activeCompanyId` из контекста/JWT. Антипаттерн: прокидывать companyId дальше «для удобства». ADR 0015.

### VariantBarcode — уникальность по компании

**@@unique([companyId, barcode]) может быть слишком жёстким:** переиспользование штрихкодов, ошибки продавца, комплекты/мультиупаковки, разные варианты с одним barcode (редко).

**Решение:** `@@index([companyId, barcode])` вместо unique. Конфликты (несколько variant на один barcode) — ловить на уровне matching, MatchStatus=CONFLICT. Если бизнес гарантирует дисциплину — можно unique, зафиксировать в ADR 0010. **Сервис добавления barcode:** `barcode = barcode.trim()`, reject пустые — не плодить мусор/невидимые дубли.

### MatchCandidate

**Почему не (variantId, marketAccountId):** один вариант — много кандидатов (фаззи). `variantId` nullable до подтверждения.

**externalRef + externalRefType:** разделять уровень — WB nmId (карточка) vs chrtId (вариант), Ozon product*id vs offer_id. Иначе смешиваются карточка и вариант. `externalRefType`: OZON_PRODUCT_ID, OZON_OFFER_ID, WB_NM_ID, WB_CHRT_ID. Unique: `(marketAccountId, externalRefType, externalRef)` — достаточно, т.к. marketAccount однозначно задаёт marketplace. **Инвариант:** externalRefType валиден только для marketplace marketAccount (OZON*_ → Ozon, WB_ → WB). Фиксировать в ADR 0006.

**MatchCandidate.marketplace убрано:** дублирует marketAccount.marketplace (как Listing). MVP: брать через `candidate.marketAccount.marketplace`. Альтернатива — валидировать перед записью: `candidate.marketplace === marketAccount.marketplace`. Иначе паразитное поле разойдётся.

**normalizedExternalRef (обязательно):** `externalRef` хранится нормализованным, иначе "007" и "7" — разные ключи. Правило: перед записью вызывать `normalizeExternalRef(type, raw)`.

- Числовые (OZON_PRODUCT_ID, WB_NM_ID, WB_CHRT_ID): DTO `z.string().regex(/^\d+$/)`. **Перед записью в БД:** `externalRef = String(BigInt(trimmed))` — иначе unique работает криво ("007" ≠ "7"). Тесты: "007" / "7" / " 7 " → один ключ.
- Строковые (OZON_OFFER_ID): `String(raw).trim()`.
- Минимальный контракт: `externalRef = String(rawId)` (канон). Тесты: "007" / "7" / " 7 " → один ключ; "7.0", "-7", "7e3", "" → 400.

**Кандидатские данные (UI «подтвердить матч»):** `externalSnapshot Json?` + `externalSnapshotHash` + `externalUpdatedAt DateTime?`. **Правило:** externalUpdatedAt обновлять только когда реально обновили snapshot (hash изменился). Антипаттерн: обновлять «при каждом импорте» — TTL/рефреш теряет смысл. Хранить последние N дней — уборка мусора.

**Confirm матчинг:** в транзакции: (1) validate `marketAccount.companyId === variant.companyId`, (2) set variantId, (3) set confirmedAt, (4) update status. Исключает межтенантные склейки и гонки.

### Origin tracking (остатки/цены)

**Без полей — ping-pong:** при двустороннем sync (WB→master→Ozon) легко получить цикл: пушим на Ozon, импортируем с Ozon, получаем свои данные, обновляем master, пушим на WB...

**MVP:** остаток — одна цифра (агрегат по площадке, без складов). `lastStockHash` = hash(canonical). Origin/hash/at на Listing достаточны для MVP. **Hash:** `sha256(stableStringify(obj))`. Канонизация: BigInt→string, Decimal→string, Date→ISO.

**Extension (склады/FBO/FBS):** когда появятся склады, hash должен учитывать warehouseId, type (FBO/FBS), набор остатков по складам. Запланирована таблица `ListingStock(listingId, warehouseId, warehouseType, quantity, updatedAt, origin, hash)` — не в MVP, добавить при поддержке складов.

---

## Шаг 1. Phase 0 — Правила и документация

### 1.1 Cursor Rules (`.cursor/rules/`)

Формат: `.mdc`, описание на English. Существующие: `save-plans-locally.mdc`, `cursor-rules-language.mdc`.

| Файл                     | globs                          | Содержание                                                                                                                                                          |
| ------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nestjs-patterns.mdc`    | `apps/api/**/*.ts`             | Modules, DI, Guards, exception filters                                                                                                                              |
| `prisma-conventions.mdc` | `**/prisma/`                   | snake_case, транзакции. COMMENT ON TABLE/COLUMN/TYPE в миграциях. Enum = API-контракт, миграция+changelog.                                                          |
| `api-zod-swagger.mdc`    | `apps/api/**/*.ts`             | Zod DTO, nestjs-zod, Swagger. BigInt → string в API (JSON/Swagger/React)                                                                                            |
| `multi-tenancy.mdc`      | `apps/api/**/`                 | TenantGuard: param.companyId vs JWT → 403; param не передавать в сервисы (всегда activeCompanyId). Variant/VariantBarcode/Listing: companyId из relation. ADR 0015. |
| `bullmq-workers.mdc`     | `apps/worker/**/*.ts`          | Job naming, idempotency, rate limit, backoff. Concurrency: одна очередь + Redis semaphore per marketAccountId. Cron: IdempotencyKey cleanup                         |
| `api-encryption.mdc`     | `apps/api/**/`                 | Хранение API-ключей: libsodium/envelope, не hash, ротация                                                                                                           |
| `frontend-fsd.mdc`       | `apps/web/**/`                 | FSD (app, pages, features, entities, shared), Zustand, русские комментарии                                                                                          |
| `russian-comments.mdc`   | `**/*.ts`, `**/*.tsx`          | JSDoc и комментарии на русском в коде                                                                                                                               |
| `versions-deps.mdc`      | `**/package.json`              | Фиксированные версии без ^, Renovate/Dependabot, не полагаться на lock                                                                                              |
| `tests-minimum.mdc`      | `**/*.spec.ts`, `**/*.test.ts` | Обязательные тесты: matching, origin tracking                                                                                                                       |

### 1.2 Документация (`docs/`)

```
docs/
├── README.md                    # Обзор проекта, quick start, docker-compose
├── architecture/
│   ├── overview.md              # Диаграммы, bounded contexts, модули
│   ├── data-flow.md             # Схема синхронизации (mermaid)
│   └── adr/
│       ├── 0001-nx-choice.md
│       ├── 0002-zod-swagger.md
│       ├── 0003-origin-tracking.md
│       ├── 0004-company-member-many-to-many.md
│       ├── 0005-ozon-wb-listing-ids.md
│       ├── 0006-match-candidate-uniqueness.md    # unique (marketAccountId, externalRefType, externalRef); инвариант: externalRefType ↔ marketplace marketAccount
│       ├── 0007-api-keys-encryption.md
│       ├── 0008-fixed-versions-no-caret.md
│       ├── 0009-origin-tracking-mvp-vs-listing-stock.md
│       ├── 0010-barcode-uniqueness-policy.md
│       ├── 0011-market-account-credentials-blob.md
│       ├── 0012-company-id-from-url-security.md
│       ├── 0013-prisma-7-setup.md                  # provider prisma-client-js. MVP без adapter-pg; подключить при профилировании/пулах/edge.
│       ├── 0014-listing-snapshot-source-of-truth.md # snapshot — только внешний источник; master в Product/Variant
│       └── 0015-company-id-invariant-enforcement.md # Variant/VariantBarcode/Listing: companyId только из relation, не из body; механизм в транзакции
├── api/
│   ├── openapi.md               # Как генерируется Swagger из Zod
│   └── changelog.md
├── integration/
│   ├── ozon-api.md              # product_id/sku — BigInt, offerId — string. Приводить на границе.
│   └── wildberries-api.md      # nmId/imtId/chrtId — BigInt, приводить на границе API
└── runbooks/
    ├── migrations.md            # prisma migrate (Prisma 7), COMMENT ON; после миграции — проверить COMMENT ON TYPE
    ├── troubleshooting.md       # Типовые ошибки sync, логи
    └── deps-update.md           # Renovate/Dependabot, процесс обновления
```

### 1.3 AGENTS.md

Обновить с:

- Ссылками на `docs/architecture`, `docs/integration`, `docs/runbooks`
- Указанием читать `.cursor/rules/` перед изменениями
- Конвенциями: snake_case в БД, русские комментарии, фиксированные версии

---

## Шаг 2. Создание монорепо

### 2.1 Инициализация

```bash
cd /Users/cobalt/dev/git/ee/seller
npm init -y
```

### 2.2 Nx workspace

```bash
npm install -D nx@latest
npx nx@latest init
# Или: npx create-nx-workspace@latest seller --preset=apps --packageManager=npm
```

Выбрать/создать конфиг:

- `package.json` с полем `workspaces`
- `nx.json` с targetDefaults

### 2.3 Структура папок (создать)

```
seller/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   ├── guards/
│   │   │   └── common/
│   │   │   └── config/
│   │   ├── project.json
│   │   └── tsconfig.json
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── pages/
│   │   │   ├── features/
│   │   │   ├── entities/
│   │   │   ├── shared/
│   │   │   ├── main.tsx
│   │   │   └── index.html
│   │   ├── project.json
│   │   └── vite.config.ts
│   └── worker/
│       ├── src/
│       │   ├── main.ts
│       │   └── processors/
│       ├── project.json
│       └── tsconfig.json
├── packages/
│   ├── domain/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── enums.ts
│   │   │   └── constants.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared-types/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── schemas/     # Zod schemas
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── prisma-client/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── api-contracts/
│   │   ├── src/
│   │   │   └── index.ts     # Re-export shared-types
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/
│       ├── src/
│       │   ├── index.ts    # re-export lib/hash
│       │   └── lib/
│       │       └── hash.ts  # sha256(stableStringify(obj))
│       ├── package.json
│       └── tsconfig.json
├── tooling/
│   ├── eslint-config/
│   │   ├── base.js
│   │   └── package.json
│   ├── typescript-config/
│   │   ├── base.json
│   │   ├── api.json
│   │   └── package.json
│   └── prettier-config/
│       └── package.json
├── docs/
├── nx.json
├── package.json
├── .env.example
└── docker-compose.yml
```

---

## Шаг 3. npm workspaces (package.json)

В root `package.json` добавить:

```json
"workspaces": [
  "apps/*",
  "packages/*",
  "tooling/*"
]
```

---

## Шаг 4. Зависимости (фиксированные версии)

### 4.1 Root `package.json`

```json
{
  "name": "seller",
  "private": true,
  "workspaces": ["apps/*", "packages/*", "tooling/*"],
  "scripts": {
    "build": "nx run-many -t build",
    "dev:api": "nx serve api",
    "dev:web": "nx serve web",
    "dev:worker": "nx exec worker -- node dist/apps/worker/main.js",
    "lint": "nx run-many -t lint",
    "format": "prettier --write \"**/*.{ts,tsx,json}\"",
    "db:migrate": "nx exec prisma-client -- prisma migrate dev",
    "db:studio": "nx exec prisma-client -- prisma studio"
  },
  "devDependencies": {
    "nx": "22.0.0",
    "prettier": "3.4.0",
    "typescript": "5.7.0"
  }
}
```

Фиксированные версии (без `^`). Актуальные — проверить при установке.

### 4.2 packages/domain

```json
{
  "name": "@seller/domain",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

### 4.3 packages/shared-types

```json
{
  "name": "@seller/shared-types",
  "version": "1.0.0",
  "dependencies": {
    "zod": "3.23.0"
  }
}
```

### 4.4 packages/prisma-client

```json
{
  "name": "@seller/prisma-client",
  "version": "1.0.0",
  "scripts": {
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "7.0.0"
  },
  "devDependencies": {
    "prisma": "7.0.0"
  }
}
```

### 4.5 packages/shared

```json
{
  "name": "@seller/shared",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

Структура: `src/index.ts` реэкспортирует `lib/hash`. Для MVP — ts-source как domain/shared-types (единообразно). Позже: build, `main: "./dist/index.js"`. **stableStringify:** replacer: BigInt→string, Prisma.Decimal→string (`instanceof`/`toJSON`), Date→ISO. Антипаттерн: JSON.stringify без replacer.

### 4.6 apps/api

```json
{
  "name": "@seller/api",
  "dependencies": {
    "@nestjs/common": "11.0.0",
    "@nestjs/config": "4.0.0",
    "@nestjs/core": "11.0.0",
    "@nestjs/jwt": "10.2.0",
    "@nestjs/passport": "11.0.0",
    "@nestjs/platform-express": "11.0.0",
    "@nestjs/swagger": "11.0.0",
    "nestjs-zod": "5.0.0",
    "passport": "0.7.0",
    "passport-jwt": "4.0.0",
    "reflect-metadata": "0.2.0",
    "rxjs": "7.8.0",
    "@seller/domain": "workspace:*",
    "@seller/shared": "workspace:*",
    "@seller/shared-types": "workspace:*",
    "@seller/prisma-client": "workspace:*"
  },
  "devDependencies": {
    "@nx/nest": "22.0.0"
  }
}
```

### 4.7 apps/web

```json
{
  "name": "@seller/web",
  "dependencies": {
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-router-dom": "7.0.0",
    "zustand": "5.0.0",
    "@seller/shared-types": "workspace:*"
  },
  "devDependencies": {
    "@nx/vite": "22.0.0",
    "@nx/react": "22.0.0",
    "@vitejs/plugin-react": "4.3.0",
    "vite": "6.0.0",
    "tailwindcss": "4.0.0",
    "@types/react": "19.0.0",
    "@types/react-dom": "19.0.0"
  }
}
```

### 4.8 apps/worker

```json
{
  "name": "@seller/worker",
  "dependencies": {
    "bullmq": "5.0.0",
    "ioredis": "5.4.0",
    "@seller/domain": "workspace:*",
    "@seller/shared": "workspace:*",
    "@seller/shared-types": "workspace:*",
    "@seller/prisma-client": "workspace:*"
  }
}
```

---

## Шаг 5. TypeScript, ESLint, Prettier

### 5.1 tooling/typescript-config/base.json

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  },
  "exclude": ["node_modules"]
}
```

### 5.2 tooling/prettier-config

Создать `prettier.config.js` в root или tooling.

---

## Шаг 6. docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: seller
      POSTGRES_PASSWORD: seller
      POSTGRES_DB: seller
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
volumes:
  pgdata:
```

---

## Шаг 7. Prisma schema

### 7.1 packages/prisma-client/prisma/schema.prisma

Все поля `snake_case` через `@map`/`@@map`. `companyId` на tenant-таблицах.

**Prisma 7:** Node 20.19+, TS 5.4+. Provider `prisma-client-js` (стабильно). **MVP стартует без adapter-pg** — нет явной причины на старте. Подключить позже при профилировании, пулах, edge runtime. Точную конфигурацию — проверить в ADR 0013, прогнать `generate + migrate` на чистом репо.

**Комментарии в БД:** у каждой таблицы и поля — комментарий на русском. Добавлять `COMMENT ON TABLE`/`COMMENT ON COLUMN` в миграции вручную.

**Prisma enum:** `@@map` у enum не поддерживается. В миграциях — явно `COMMENT ON TYPE "EnumName" IS '...'` (PG создаёт свои типы). **Правило:** значения enum = API-контракт; менять только через миграцию + changelog. **Нюанс:** Prisma migrate может пересоздавать enum/менять имя типа при рефакторинге — комментарии «отваливаются». После изменения схемы: `migrate diff` + проверить стабильность имени типа, либо в runbook: «проверить COMMENT ON TYPE после миграции».

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Marketplace {
  OZON
  WILDBERRIES
}

enum ListingStatus {
  DRAFT
  PUBLISHED
  ERROR
  ARCHIVED
}

enum SyncPolicy {
  LINKED
  EXCLUSIVE_WB
  EXCLUSIVE_OZON
  MANUAL
}

enum StockSyncPolicy {
  MASTER_ONLY
  WB_IS_SOURCE
  OZON_IS_SOURCE
  LAST_WRITE_WINS
}

enum PriceSyncPolicy {
  MASTER_ONLY
  WB_IS_SOURCE
  OZON_IS_SOURCE
  LAST_WRITE_WINS
}

enum MatchMethod {
  BARCODE
  VENDOR_CODE
  NAME_BRAND
  MANUAL
}

enum MatchStatus {
  PENDING
  AUTO_MATCHED
  MANUAL
  CONFLICT
}

enum SyncOrigin {
  MASTER      // изменение из нашего master (пуш на площадку)
  OZON        // импорт с Ozon
  WILDBERRIES // импорт с WB
}

enum CompanyRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum ExternalRefType {
  OZON_PRODUCT_ID
  OZON_OFFER_ID
  WB_NM_ID
  WB_CHRT_ID
}

model Company {
  id             String          @id @default(cuid())
  name           String
  createdAt      DateTime        @default(now()) @map("created_at")
  members        CompanyMember[]
  marketAccounts MarketAccount[]
  products       Product[]
  @@map("companies")
}

model User {
  id             String          @id @default(cuid())
  email          String          @unique
  passwordHash   String          @map("password_hash")
  name           String?
  createdAt      DateTime        @default(now()) @map("created_at")
  companyMembers CompanyMember[]
  @@map("users")
}

model CompanyMember {
  id        String      @id @default(cuid())
  userId    String      @map("user_id")
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId String      @map("company_id")
  company   Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  role      CompanyRole
  createdAt DateTime    @default(now()) @map("created_at")
  @@unique([userId, companyId])
  @@index([userId])
  @@index([companyId])
  @@map("company_members")
}

model MarketAccount {
  id                  String       @id @default(cuid())
  companyId           String       @map("company_id")
  company             Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  marketplace         Marketplace
  name                  String   @map("name")  // label: "Ozon основной", "WB бренд X"
  credentialsEncrypted   String   @map("credentials_encrypted") @db.Text  // version:nonce:ciphertext (base64/hex)
  credentialsVersion     Int      @map("credentials_version") @default(1)   // для миграций формата/ключа
  credentialsHash        String?  @map("credentials_hash")                 // опционально, для дедупа
  isActive            Boolean      @default(true) @map("is_active")
  createdAt           DateTime     @default(now()) @map("created_at")
  listings            Listing[]
  matchCandidates     MatchCandidate[]
  @@index([companyId])
  @@index([companyId, marketplace])
  @@map("market_accounts")
}

model Product {
  id          String   @id @default(cuid())
  companyId   String   @map("company_id")
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name        String
  brand       String?
  description String?  @db.Text
  attributes  Json?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  variants    Variant[]
  @@index([companyId])
  @@map("products")
}

model Variant {
  id          String   @id @default(cuid())
  productId   String   @map("product_id")
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  companyId   String   @map("company_id")  // инвариант: === product.companyId
  vendorCode  String   @map("vendor_code")  // seller SKU, уникален в рамках компании
  masterPrice Decimal  @db.Decimal(12, 2) @map("master_price")
  masterStock Int      @default(0) @map("master_stock")
  size        String?
  color       String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  barcodes        VariantBarcode[]
  listings        Listing[]
  matchCandidates MatchCandidate[]
  @@unique([companyId, vendorCode])
  @@index([productId])
  @@index([companyId])
  @@index([companyId, productId])   // UI: варианты по продукту в рамках компании
  @@map("variants")
}

model VariantBarcode {
  id        String   @id @default(cuid())
  variantId String   @map("variant_id")
  variant   Variant  @relation(fields: [variantId], references: [id], onDelete: Cascade)
  companyId String   @map("company_id")  // инвариант: === variant.companyId
  barcode   String
  @@unique([variantId, barcode])
  @@index([companyId, barcode])   // уникальность по компании — опционально, см. ADR 0010
  @@index([barcode])
  @@index([companyId])
  @@map("variant_barcodes")
}

model Listing {
  id                 String          @id @default(cuid())
  companyId          String          @map("company_id")  // инвариант: === variant.companyId === marketAccount.companyId
  variantId          String          @map("variant_id")
  variant            Variant         @relation(fields: [variantId], references: [id], onDelete: Cascade)
  marketAccountId    String          @map("market_account_id")
  marketAccount      MarketAccount   @relation(fields: [marketAccountId], references: [id], onDelete: Cascade)
  status             ListingStatus
  syncPolicy         SyncPolicy      @map("sync_policy")
  stockSyncPolicy    StockSyncPolicy @map("stock_sync_policy")
  priceSyncPolicy    PriceSyncPolicy @map("price_sync_policy")
  lastSyncAt         DateTime?       @map("last_sync_at")
  lastSyncError      String?         @db.Text @map("last_sync_error")
  snapshot           Json?
  snapshotHash       String?         @map("snapshot_hash")    // sha256(stableStringify(obj)); packages/shared/src/lib/hash
  snapshotUpdatedAt  DateTime?      @map("snapshot_updated_at")
  createdAt          DateTime        @default(now()) @map("created_at")
  updatedAt          DateTime        @updatedAt @map("updated_at")
  ozonIds            OzonListingIds?
  wbIds              WbListingIds?
  // Origin tracking — защита от ping-pong. MVP: одна цифра на listing.
  lastStockOrigin    SyncOrigin?    @map("last_stock_origin")
  lastStockHash      String?         @map("last_stock_hash")   // sha256(stableStringify); packages/shared/src/lib/hash
  lastStockAt        DateTime?      @map("last_stock_at")
  lastPriceOrigin    SyncOrigin?    @map("last_price_origin")
  lastPriceHash      String?         @map("last_price_hash")   // sha256(stableStringify); packages/shared/src/lib/hash
  lastPriceAt        DateTime?      @map("last_price_at")
  @@unique([variantId, marketAccountId])
  @@index([marketAccountId])
  @@index([companyId])
  @@index([companyId, variantId])   // UI: товары + статус по площадкам, джойны
  @@map("listings")
}

model OzonListingIds {
  id              String   @id @default(cuid())
  listingId       String   @unique @map("listing_id")
  listing         Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  marketAccountId String   @map("market_account_id")
  productId       BigInt   @map("product_id")  // Ozon product_id (числовой в API)
  sku             BigInt?  @map("sku")         // Ozon SKU (числовой)
  offerId         String   @map("offer_id")     // Артикул продавца (строка)
  @@unique([marketAccountId, productId])
  @@unique([marketAccountId, offerId])
  @@index([marketAccountId])
  @@map("ozon_listing_ids")
}

model WbListingIds {
  id              String   @id @default(cuid())
  listingId       String   @unique @map("listing_id")
  listing         Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  marketAccountId String   @map("market_account_id")
  nmId            BigInt   @map("nm_id")   // Номенклатурный ID товара (числовой в API)
  imtId           BigInt?  @map("imt_id")  // ID карточки (размерная сетка)
  chrtId          BigInt   @map("chrt_id")  // ID характеристики (конкретный SKU)
  @@unique([marketAccountId, chrtId])
  @@index([marketAccountId])
  @@index([marketAccountId, nmId])
  @@map("wb_listing_ids")
}

model MatchCandidate {
  id               String          @id @default(cuid())
  variantId        String?         @map("variant_id")  // nullable до подтверждения
  variant          Variant?        @relation(fields: [variantId], references: [id], onDelete: SetNull)
  marketAccountId  String          @map("market_account_id")
  marketAccount    MarketAccount   @relation(fields: [marketAccountId], references: [id], onDelete: Cascade)
  externalRefType  ExternalRefType  @map("external_ref_type")  // OZON_*/WB_* — валиден только для marketplace marketAccount
  externalRef          String          @map("external_ref")       // нормализованный ID: normalizeExternalRef(type, raw)
  externalSnapshot     Json?           @map("external_snapshot")  // name, brand, price, barcodes, image — для UI без вызова API
  externalSnapshotHash String?         @map("external_snapshot_hash")  // sha256(stableStringify); packages/shared/src/lib/hash
  externalUpdatedAt     DateTime?       @map("external_updated_at")  // только при изменении snapshot (hash); иначе TTL бессмыслен
  matchMethod          MatchMethod     @map("match_method")
  status               MatchStatus
  confidence       Float?
  createdAt        DateTime        @default(now()) @map("created_at")
  confirmedAt      DateTime?       @map("confirmed_at")
  @@unique([marketAccountId, externalRefType, externalRef])
  @@index([variantId])
  @@index([marketAccountId])
  @@map("match_candidates")
}

model IdempotencyKey {
  id        String   @id @default(cuid())
  companyId String   @map("company_id")
  key       String   @map("key")
  result    Json?
  expiresAt DateTime @map("expires_at")
  @@unique([companyId, key])
  @@index([expiresAt])
  @@map("idempotency_keys")
}
```

### 7.2 Миграции и комментарии

В каждой миграции добавлять COMMENT ON после создания таблиц/колонок и enum-типов:

```sql
COMMENT ON TABLE companies IS 'Компании (тенанты)';
COMMENT ON COLUMN companies.name IS 'Название компании';
COMMENT ON TABLE products IS 'Master-карточки товаров';
COMMENT ON TYPE "ListingStatus" IS 'DRAFT, PUBLISHED, ERROR, ARCHIVED';
COMMENT ON TYPE "MatchStatus" IS 'PENDING, AUTO_MATCHED, MANUAL, CONFLICT';
```

Файл `docs/runbooks/migrations.md` — описать процесс. Enum-значения — API-контракт, менять только через миграцию + changelog. **Пункт runbook:** после миграции проверить COMMENT ON TYPE (Prisma может пересоздать enum — комментарии отваливаются).

### 7.3 .env.example

```
DATABASE_URL="postgresql://seller:seller@localhost:5432/seller"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="change-me"
```

---

## Шаг 8. NestJS API — skeleton

### 8.1 apps/api/src/main.ts

- Подключить `SwaggerModule` (DocumentBuilder)
- Путь: `/api/docs` или `/docs`
- `ZodValidationPipe` из nestjs-zod
- Порт 3000

### 8.2 Модули

- `ConfigModule` (forRoot)
- `PrismaModule` (глобальный, PrismaService)
- `AuthModule` (JWT strategy, login, register)
- `CompanyModule`
- Guards: `TenantGuard` (param vs JWT → 403; param не прокидывать в сервисы), `JwtAuthGuard`

### 8.3 Swagger + Zod

- Использовать `nestjs-zod` для DTO
- Схемы Zod в `packages/shared-types/src/schemas/`
- Декораторы `@ApiBody`, `@ApiResponse` — генерируются из Zod через nestjs-zod

---

## Шаг 9. Zod контракты (packages/shared-types)

### 9.1 BigInt → string для marketplace IDs

Все ID маркетплейсов в DTO — **string**. Numeric (productId, sku, nmId, chrtId) — `MarketplaceNumericIdSchema`; offerId/vendorCode/barcode — `MarketplaceStringIdSchema`. BigInt не сериализуется в JSON, ломает Swagger и React.

```ts
// numeric IDs (nmId, chrtId, productId, sku) — DTO валидация
const MarketplaceNumericIdSchema = z.string().trim().regex(/^\d+$/);
// offerId, vendorCode, barcode
const MarketplaceStringIdSchema = z.string().trim().min(1);
// перед записью в БД (numeric): externalRef = String(BigInt(trimmed)) — иначе unique криво
// output — всегда string, в сервисе: bigint.toString()
```

### 9.2 Структура

```
packages/shared-types/src/
├── index.ts
└── schemas/
    ├── auth.schema.ts
    ├── company.schema.ts
    ├── market-account.schema.ts
    ├── product.schema.ts
    ├── listing.schema.ts
    └── common.schema.ts    # pagination, ids, MarketplaceNumericIdSchema, MarketplaceStringIdSchema
```

### 9.3 Пример (auth.schema.ts)

```ts
import { z } from 'zod';

/** Схема для входа пользователя */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/** Схема регистрации */
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;
```

---

## Шаг 10. React + Vite — skeleton

### 10.1 Упрощённый FSD

```
apps/web/src/
├── app/
│   ├── index.tsx           # providers, router
│   ├── providers.tsx       # Zustand, router
│   └── App.tsx
├── pages/
│   ├── login/
│   │   └── LoginPage.tsx
│   └── dashboard/
│       └── DashboardPage.tsx
├── features/
│   └── auth/
│       ├── model/          # store (Zustand)
│       │   └── authStore.ts
│       └── ui/
│           └── LoginForm.tsx
├── entities/
│   └── product/
│       └── ui/
│           └── ProductCard.tsx
├── shared/
│   ├── ui/                 # кнопки, инпуты
│   ├── api/                # base fetch, client
│   └── lib/
├── main.tsx
└── index.html
```

### 10.2 Zustand

- `features/auth/model/authStore.ts` — auth state (user, token, login, logout)
- `features/products/model/productsStore.ts` — список товаров (позже)

### 10.3 TailwindCSS

- `tailwind.config.js`
- `postcss.config.js`

---

## Шаг 11. Правило о комментариях

Во всех `.ts` и `.tsx`:

- Комментарии к функциям/классам — на русском
- Сложная логика — поясняющие комментарии на русском
- JSDoc: `/** Описание на русском */`

---

## Шаг 12. Порядок выполнения для агента

1. **Phase 0** — создать rules, docs, обновить AGENTS.md
2. **Скелет** — создать все папки из шага 2.3
3. **Root** — package.json (с workspaces), nx.json
4. **Tooling** — typescript, eslint, prettier
5. **packages** — domain, shared-types (Zod schemas), prisma-client (schema), api-contracts, shared (hash: sha256+stableStringify)
6. **docker-compose** — postgres, redis
7. **Prisma** — schema.prisma, migrate dev
8. **apps/api** — NestJS, Swagger, nestjs-zod, Auth, Company
9. **apps/web** — Vite, React, FSD, Zustand, Tailwind, Login page
10. **apps/worker** — BullMQ, processors-заглушки
11. **MarketAccount** — CRUD, API
12. **Product, Variant, Listing** — CRUD, API
13. **Matching** — endpoints + тесты (barcode, vendorCode, conflict)
14. **Sync** — import, publish, sync_stock + тесты origin tracking (нет циклов)

---

## Domain model (кратко)

| Сущность           | Описание                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**           | Регистрация без компании                                                                                                                                |
| **Company**        | Tenant                                                                                                                                                  |
| **CompanyMember**  | many-to-many: userId, companyId, role. Приглашения — позже                                                                                              |
| **Product**        | Master-карточка: name, brand, description, attributes                                                                                                   |
| **Variant**        | SKU: vendorCode (unique per company), masterPrice, masterStock                                                                                          |
| **VariantBarcode** | variantId, barcode. Один variant — несколько barcodes. По компании — index, не unique (переиспользование, комплекты). Конфликты — MatchStatus=CONFLICT. |
| **Listing**        | Привязка Variant ↔ MarketAccount. Внешние ID — OzonListingIds / WbListingIds                                                                           |
| **OzonListingIds** | productId, sku, offerId. Unique: (marketAccountId, productId), (marketAccountId, offerId)                                                               |
| **WbListingIds**   | nmId, imtId, chrtId. Unique: (marketAccountId, chrtId)                                                                                                  |
| **MatchCandidate** | (marketAccountId, externalRefType, externalRef). externalRefType ↔ marketplace marketAccount. variantId nullable до подтверждения.                     |

**Идентификаторы маркетплейсов:**

- **Ozon:** product_id, sku — числовые в API → `BigInt`. offer_id — артикул, строка.
- **Wildberries:** nmId, imtId, chrtId — числовые в API → `BigInt`. vendorCode, barcode — строки.
- Приводить на границе API (parse/stringify).

---

## API surface (полный список endpoints)

### Auth & Company

| Method | Path                    | Описание                                                                |
| ------ | ----------------------- | ----------------------------------------------------------------------- |
| POST   | /auth/register          | Регистрация (User без компании)                                         |
| POST   | /auth/login             | Вход. Body: `{ email, password, companyId? }` — active company в токене |
| GET    | /auth/me                | User + компании (memberships) + active companyId                        |
| PATCH  | /auth/me/active-company | Сменить active company. Body: `{ companyId }`. Проверить CompanyMember  |
| GET    | /companies              | Список компаний, где user — member                                      |
| POST   | /companies              | Создать компанию + добавить user как OWNER (CompanyMember)              |
| GET    | /companies/:id          | Детали компании (проверить членство)                                    |

### Market accounts

| Method | Path                               | Описание                                                                          |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------- |
| GET    | /companies/:companyId/accounts     | Список подключенных аккаунтов                                                     |
| POST   | /companies/:companyId/accounts     | Подключить. Body: credentials per marketplace (Ozon: clientId+apiKey, WB: apiKey) |
| PATCH  | /companies/:companyId/accounts/:id | Обновить ключи                                                                    |
| DELETE | /companies/:companyId/accounts/:id | Отключить                                                                         |

### Products & Listings

| Method | Path                                                                              | Описание                               |
| ------ | --------------------------------------------------------------------------------- | -------------------------------------- |
| GET    | /companies/:companyId/products                                                    | Список products (пагинация, фильтры)   |
| POST   | /companies/:companyId/products                                                    | Создать product                        |
| GET    | /companies/:companyId/products/:id                                                | Product + variants + listings          |
| PATCH  | /companies/:companyId/products/:id                                                | Обновить master                        |
| GET    | /companies/:companyId/products/:id/variants                                       | Variants (+ barcodes)                  |
| POST   | /companies/:companyId/products/:id/variants                                       | Добавить variant                       |
| POST   | /companies/:companyId/products/:productId/variants/:variantId/barcodes            | Добавить barcode к variant             |
| DELETE | /companies/:companyId/products/:productId/variants/:variantId/barcodes/:barcodeId | Удалить barcode                        |
| GET    | /companies/:companyId/listings                                                    | Listings (фильтр по площадке, статусу) |
| POST   | /companies/:companyId/listings/:id/publish                                        | Опубликовать                           |
| PATCH  | /companies/:companyId/listings/:id                                                | Обновить policy, content               |
| POST   | /companies/:companyId/listings/:id/sync                                           | Запустить ручную синхронизацию         |

### Matching

| Method | Path                                               | Описание                   |
| ------ | -------------------------------------------------- | -------------------------- |
| GET    | /companies/:companyId/match-candidates             | Pending/Conflict кандидаты |
| POST   | /companies/:companyId/match-candidates/:id/confirm | Подтвердить сопоставление  |
| POST   | /companies/:companyId/match-candidates/:id/reject  | Отклонить                  |

### Sync status

| Method | Path                                | Описание                  |
| ------ | ----------------------------------- | ------------------------- |
| GET    | /companies/:companyId/sync/jobs     | История jobs              |
| GET    | /companies/:companyId/sync/jobs/:id | Детали job                |
| POST   | /companies/:companyId/sync/import   | Запустить импорт каталога |

---

## Дополнительные спецификации

- **Domain model** — Product, Variant, Listing, MatchCandidate (см. доменную модель выше)
- **Sync engine** — origin tracking, idempotency, очереди BullMQ. **Воркер concurrency:** зафиксировать стратегию сразу (не «потом») — иначе race conditions. Рекомендация: **одна очередь + Redis semaphore** keyed by marketAccountId в processor. Альтернатива: Queue per marketAccount (дороже, динамические очереди). + backoff при rate limit.
- **IdempotencyKey:** cron-job очистки просроченных ключей (WHERE expiresAt < now()) — иначе таблица раздуется.
- **Matching** — barcode (VariantBarcode) → vendorCode → PENDING. Один barcode на несколько variant — CONFLICT (см. ADR 0010)
- **Policies** — LINKED, EXCLUSIVE_WB, EXCLUSIVE_OZON, MANUAL

### Минимум тестов (обязательно для MVP)

**Риск:** баги в matching и origin tracking — самые дорогие в проде (циклы sync, неверные сопоставления).

**Обязательные тесты:**

- **Matching:** barcode → Variant (VariantBarcode), vendorCode → Variant, приоритеты, conflict при дублях. **externalRef normalization:** "007" / "7" / " 7 " → один ключ; "7.0", "-7", "7e3", "" → 400 (тест normalizeExternalRef).
- **Origin tracking:** при импорте с площадки не перезаписывать master, если lastStockOrigin уже с этой площадки; при push не создавать цикл (hash сравнение, skip echo)

### Планируемые расширения (не MVP)

| Расширение                                  | Описание                                                                                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ListingStock**                            | Таблица для остатков по складам: `(listingId, warehouseId, warehouseType, quantity, updatedAt, origin, hash)`. Когда появятся FBO/FBS/склады, hash учитывает scope (warehouse, type, набор остатков). |
| AI descriptions, Analytics, RBAC, Audit log | См. ранее описанные                                                                                                                                                                                   |

---

## Версии зависимостей

**Избегать:** "latest" + `^` в монорепе — почти гарант нестабильности.

**Правило:**

- **Критичные пакеты** (NestJS, Prisma, React, Nx, Zod и т.п.) — фиксировать версии **без** `^` в `package.json`
- **Обновления** — через Renovate или Dependabot (конфиг в root, PR с ревью перед merge)
- **package-lock.json** — оставить, но не полагаться на него как на единственный стабилизатор

**Ориентировочные мажорные версии** (на 2025-02, согласовано с package.json выше):

- Node: 20.19+ (для Prisma 7)
- Nx: 22+
- NestJS: 11+
- Prisma: 7+ (prisma-client-js; adapter-pg — позже при профилировании/пулах/edge)
- Zod: 3.23+
- React: 19+
- Vite: 6+
- Zustand: 5+
- TailwindCSS: 4+
- BullMQ: 5+
