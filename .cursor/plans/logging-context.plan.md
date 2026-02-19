---
name: Логирование с контекстом
overview: Добавить структурированное логирование с явным указанием источника (label) в API и Worker, по образцу crm-back — через фабрику логгеров с `createLogger(name)`.
todos: []
isProject: false
---

# Логирование с контекстом (label) для API и Worker

## Проблема

Сейчас в логах нельзя понять источник сообщения: используется один Winston-логгер из `@seller/shared`, без разделения по модулям. В сообщениях встречаются ручные префиксы (`[worker]`, `[import-catalog]`, `{ prefix: 'API' }`), но формат вывода не выводит их явно, а `prefix` не совпадает с полем `label` в формате.

## Референс: crm-back

В crm-back логирование устроено в три слоя:

1. **Logger** (абстрактный) — интерфейс с методами `i()`, `d()`, `w()`, `e()` + NestJS `LoggerService` (log, error, warn, debug, verbose). Consumer-код не знает о Winston.
2. **LoggerWinston** — реализация под капотом, обёртка над `winston.Logger`.
3. **LogFactory.create(name)** — возвращает `Logger` (абстрактный тип), внутри создаёт `LoggerWinston` с `winston.child({ label })`.

**Зачем абстракция:** чтобы заменить Winston на Pino/другой бэкенд — меняется только `LoggerWinston` → `LoggerPino`, остальной код без правок.

Файлы: `[logger.ts](crm-back/src/shared/log/logger.ts)`, `[logger.winston.ts](crm-back/src/shared/log/logger.winston.ts)`, `[log.factory.ts](crm-back/src/shared/log/log.factory.ts)`.

## Решение

Добавить фабрику labeled-логгеров в `@seller/shared` и использовать её во всех точках логирования в API и Worker.

---

## 1. Абстракция и фабрика в `packages/shared`

Структура файлов (по образцу crm-back):

```
packages/shared/src/
├── log/
│   ├── logger.ts         # абстрактный Logger (LoggerService NestJS)
│   ├── logger.winston.ts # реализация через Winston
│   └── log.factory.ts    # LogFactory.create(name) → Logger
└── index.ts              # реэкспорт
```

**Logger** (абстрактный класс, имплементирует NestJS `LoggerService`):

- Методы: `i()`, `d()`, `w()`, `e()` (info, debug, warn, error)
- `http()` — для access-логов (опционально, мапится на info в Pino)
- Дефолтные реализации: `log` → `i`, `error` → `e`, `warn` → `w`, `debug` → `d`, `verbose` → `i`

**LoggerWinston** — обёртка над `winston.Logger`, мапит `i/d/w/e/http` на winston.

**LogFactory.create(label)** — возвращает `Logger`, внутри `new LoggerWinston(baseWinston.child({ label }))`.

**Важно:** Consumer-код использует только тип `Logger`. Замена Winston на Pino: добавить `LoggerPino extends Logger`, сменить в фабрике — без правок в API/Worker.

Опционально: `LOG_LEVEL` из `process.env` (в crm-back — `info` в prod, `silly` в dev).

---

## 2. API


| Место                    | Текущее  | Новое                                                                 |
| ------------------------ | -------- | --------------------------------------------------------------------- |
| `main.ts`                | `logger` | `createLogger('App')`                                                 |
| `LoggerService`          | `logger` | `createLogger('API')` — Nest bootstrap и внутренние логи с меткой API |
| `HttpLoggingInterceptor` | `logger` | `createLogger('HTTP')`                                                |


Изменения:

- [apps/api/src/main.ts](apps/api/src/main.ts) — `const log = createLogger('App')`, вызовы `log.i()`, `log.e()` (не logger.info).
- [apps/api/src/shared/logger/logger.service.ts](apps/api/src/shared/logger/logger.service.ts) — использовать `createLogger('API')` вместо `logger`.
- [apps/api/src/shared/http-logging/http-logging.interceptor.ts](apps/api/src/shared/http-logging/http-logging.interceptor.ts) — `private readonly log = createLogger('HTTP')`, вызывать `this.log.http(...)`.

---

## 3. Worker


| Место                     | Текущее                                | Новое                                |
| ------------------------- | -------------------------------------- | ------------------------------------ |
| `main.ts`                 | `logger`                               | `createLogger('Worker')`             |
| `import.processor.ts`     | `logger`, `[import-catalog]` в строке  | `createLogger('ImportProcessor')`    |
| `publish.processor.ts`    | `logger`, `[publish-listing]` в строке | `createLogger('PublishProcessor')`   |
| `sync-stock.processor.ts` | `logger`, `[sync-stock]` в строке      | `createLogger('SyncStockProcessor')` |


В каждом процессоре и в main создаётся свой labeled logger, ручные префиксы в сообщениях убираются — источник виден из label.

---

## 4. Документация и правила

- [.cursor/rules/logging-winston.mdc](.cursor/rules/logging-winston.mdc) — обновить: использовать `createLogger(label)`, API: `log.i()`, `log.d()`, `log.w()`, `log.e()`, `log.http()`.
- [.env.example](.env.example) — опционально `LOG_LEVEL=info`.

---

## 5. AsyncLocalStorage (расширение, best practice)

После внедрения label можно добавить `AsyncLocalStorage` для сквозного контекста запроса — поиск всех логов одного HTTP-запроса в Datadog/ELK.

**Механизм:**

1. Middleware (NestJS) для каждого запроса генерирует уникальный `traceId` (например, nanoid).
2. `traceId`, `userId`, `companyId` (из JWT/request) сохраняются в `AsyncLocalStorage<RequestContext>`.
3. Winston-форматтер перед выводом читает хранилище и добавляет контекст в metadata лога.

**Результат:**

```
// Без AsyncLocalStorage
[H] {HTTP}: GET /api/companies 200 45ms
[I] {ProductService}: Found 50 products for company...

// С AsyncLocalStorage
[H] {HTTP}: GET /api/companies 200 45ms {"traceId":"abc-123","userId":42}
[I] {ProductService}: Found 50 products for company... {"traceId":"abc-123","userId":42}
```

По `traceId` можно собрать полный путь запроса через все сервисы и модули.

---

## Итоговый формат логов

```
[I] {App}: SIGINT received, shutting down
[I] {API}: Nest application successfully started
[H] {HTTP}: GET /api/companies 200 45ms {"method":"GET",...}
[I] {Worker}: Worker started, listening for jobs
[I] {ImportProcessor}: marketAccountId=1 companyId=2 {"marketAccountId":"1","companyId":"2"}
```

Источник каждого сообщения однозначно определяется по `{Label}`.