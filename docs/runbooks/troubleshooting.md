# Troubleshooting

## npm install: unrs-resolver / napi-postinstall Permission denied

**Цепочка:** `@nx/jest` → `jest-resolve` → `unrs-resolver` → postinstall `napi-postinstall` → Permission denied.

**Варианты без `--ignore-scripts`:**

1. **Override jest-resolve** — в `package.json` уже есть `"jest-resolve":"29.2.0"` (в overrides). Jest 29 использует `resolve`, не `unrs-resolver`. При необходимости версию можно скорректировать.

2. **pnpm** — `corepack enable pnpm && pnpm install`. pnpm иначе обрабатывает lifecycle-скрипты; может подойти в sandbox/CI.

3. **unsafe-perm** — `npm config set unsafe-perm true` (глобально или `.npmrc`). В некоторых окружениях снимает ограничения на postinstall.

4. **Обычный терминал** — в Cursor sandbox postinstall может падать; попробовать `npm install` в обычном терминале вне IDE.

## Типовые ошибки sync

- **Rate limit** — backoff, проверить concurrency
- **Циклы ping-pong** — origin tracking: lastStockOrigin, hash comparison
- **Конфликт matching** — несколько variant на один barcode → MatchStatus=CONFLICT

## Логи

- API: стандартный NestJS logger
- Worker: BullMQ job logs, проверить Redis
