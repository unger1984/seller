---
name: Страница товаров и скачивание
overview: Добавить навигацию на страницу товаров, реализовать страницу со списком (заголовок, кнопки «Скачать с ВБ», «Скачать с Озон», «Добавить», фильтры, таблица), расширить API для данных таблицы и реализовать воркер импорта. Кнопки скачивания и колонки по маркетам отображаются только при наличии credentials этого маркета.
todos: []
isProject: false
---

# План: страница товаров и скачивание с маркетплейсов

## Текущее состояние

- **Навигация:** только «Главная» в хедере, карточка «Товары» на дашборде без ссылки
- **Роутинг:** `/products` отсутствует
- **API:** `GET/POST /companies/:companyId/products` возвращает базовые данные (id, name, brand, variants) без листингов, артикулов, цен, остатков
- **Sync:** `POST /companies/:companyId/sync/import` с `marketAccountId` ставит job; воркер [apps/worker-import/src/import.processor.ts](apps/worker-import/src/import.processor.ts) — **stub**, не вызывает Ozon/WB API
- **Данные:** Product — name, brand, attributes (JSON); Variant — vendorCode, masterPrice, masterStock; Listing + OzonListingIds/WbListingIds — связь с маркетами

## Безопасность: credentials никогда на фронт

**Креды маркетплейсов (Ozon: clientId, apiKey; WB: apiKey) ни при каких обстоятельствах не должны попадать на фронтенд.** Расшифровка и использование только на backend/в воркерах.

- API responses: только `id`, `marketplace`, `name`, `isActive`, `createdAt` (и подобный non-sensitive metadata)
- Максимум на фронте: `marketAccountId` для вызова операций (например POST sync/import)
- Проверить: `MarketAccountService.list` и все endpoints, возвращающие MarketAccount — `select` без `credentialsEncrypted`, `credentialsHash`, `credentialsVersion`

См. правило [.cursor/rules/marketplace-credentials-never-frontend.mdc](.cursor/rules/marketplace-credentials-never-frontend.mdc).

## Ограничение по credentials (UI)

**Кнопки скачивания и данные по маркету показываются только если у компании есть подключённый аккаунт (credentials) этого маркета.** Фронт определяет это по наличию записи в списке accounts (id + marketplace), не по самим кредам.

- **«Скачать с ВБ»** — показывать только если есть `MarketAccount` с `marketplace: WILDBERRIES`
- **«Скачать с Озон»** — показывать только если есть `MarketAccount` с `marketplace: OZON`
- **Колонки таблицы:**
  - «Цена Ozon», «Остаток Ozon» — показывать только при наличии Ozon-аккаунта
  - «Цена ВБ», «Остаток ВБ» — показывать только при наличии WB-аккаунта
  - Артикул Ozon / артикул ВБ — аналогично
  - «Статус размещения» — всегда (отображать только те маркеты, по которым есть креды)

Реализация: на странице загружать `GET /companies/:companyId/accounts`, фильтровать по `marketplace`, использовать при рендере кнопок и колонок.

## 1. Навигация и роутинг

- [apps/web/src/layouts/AppShell.tsx](apps/web/src/layouts/AppShell.tsx): добавить в `navItems` пункт `{ to: '/products', label: 'Товары', icon: Package }` рядом с Главная
- [apps/web/src/pages/dashboard/DashboardPage.tsx](apps/web/src/pages/dashboard/DashboardPage.tsx): обернуть карточку «Товары» в `Link` на `/products`
- [apps/web/src/app/App.tsx](apps/web/src/app/App.tsx): добавить маршрут `<Route path="products" element={<ProductsPage />} />`

## 2. Страница товаров (UI)

Создать [apps/web/src/pages/products/ProductsPage.tsx](apps/web/src/pages/products/ProductsPage.tsx):

- **Структура (по скриншоту):**
  - Заголовок «Список товаров»
  - Кнопки: «Скачать с ВБ», «Скачать с Озон», «Добавить» — первые две только при наличии соответствующего аккаунта
  - Фильтры: поиск (название, артикул, SKU, штрихкод), кнопка «Фильтры» (пока без логики или простой выпадающий список)
  - Таблица: фото, артикул на маркетах (по подключённым), название, статус размещения, цены и остатки — только по маркетам с кредами
- **Логика:**
  - GET `/companies/:companyId/accounts` при монтировании → `hasOzon`, `hasWb`
  - Кнопки «Скачать с ВБ»/«Скачать с Озон» — рендерить только при `hasWb`/`hasOzon` соответственно
  - POST `/companies/:companyId/sync/import` с `marketAccountId` выбранного аккаунта
  - «Добавить» — модалка создания продукта (POST `/companies/:companyId/products`)
- **Таблица:** колонки по маркетам — только если есть credentials этого маркета

## 3. Реализация скачивания (воркер)

Текущий воркер — stub. Нужно:

- **Ozon-клиент:** POST `https://api.ozon.ru/v3/product/list` (пагинация `last_id`), затем POST `/v3/product/info/list` для деталей. Headers: `Client-Id`, `Api-Key`.
- **WB-клиент:** POST `https://content-api.wildberries.ru/content/v2/get/cards/list` (или актуальный endpoint). Header: `Authorization: Bearer <token>`.
- **Воркер:** расшифровать credentials из `MarketAccount`, вызвать API, создать `MatchCandidate`. При импорте не создавать Product/Variant — только кандидаты (согласно RFC).

## 4. Расширение API списка товаров

- Расширить `ProductService.list`: `include` variants + listings + marketAccount + ozonIds/wbIds.
- DTO: `ozonOfferId`, `wbNmId`, `placementStatus`, `priceOzon`, `priceWb`, `stockOzon`, `stockWb`.
- Frontend формирует набор колонок на основе `hasOzon` / `hasWb` из списка accounts.

## 5. Порядок реализации

1. **Навигация и роутинг**
2. **Страница товаров (shell)** — заголовок, условные кнопки, фильтры, таблица-заглушка
3. **Загрузка accounts** и условный рендер кнопок и колонок
4. **Расширение Product list API**
5. **Подключение таблицы к API**
6. **Кнопки Скачать** — вызов sync/import
7. **Модалка Добавить**
8. **Воркер импорта** — Ozon/WB клиенты, MatchCandidate
