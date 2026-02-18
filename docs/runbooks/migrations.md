# Миграции Prisma

## Команды

```bash
# Применить миграции (требуется запущенный PostgreSQL)
npm run db:migrate   # prisma migrate dev

# Интерактивный просмотр БД
npm run db:studio    # prisma studio
```

Перед миграцией: `docker compose up -d postgres` (если БД ещё не запущена).

## COMMENT ON

В каждой миграции добавлять (на русском):
- `COMMENT ON TABLE "table_name" IS '...'`
- `COMMENT ON COLUMN "table_name"."column_name" IS '...'`
- `COMMENT ON TYPE "EnumName" IS '...'` — для enum

Значения enum = API-контракт; менять только через миграцию + changelog.

## После миграции

Проверить `COMMENT ON TYPE` — Prisma может пересоздать enum при рефакторинге и сбросить комментарии. При необходимости выполнить COMMENT вручную. См. `.cursor/rules/prisma-conventions.mdc`.

## Генерация SQL без БД

```bash
cd packages/prisma-client
npx prisma migrate diff --from-empty --to-schema=prisma/schema.prisma --script -o migration.sql
```

Затем создать папку `prisma/migrations/YYYYMMDDHHMMSS_name/` и поместить туда `migration.sql`, добавив COMMENT ON вручную.
