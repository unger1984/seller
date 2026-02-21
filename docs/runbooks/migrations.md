# Миграции TypeORM

## Команды

```bash
# Применить миграции (требуется запущенный PostgreSQL)
npm run db:migrate   # nx build typeorm && typeorm migration:run

# Stage: через dotenv
npm run db:migrate:stage   # dotenv -e .env.stage -- npm run db:migrate
```

Перед миграцией: `docker compose up -d postgres` (если БД ещё не запущена).

## Где миграции

- `packages/typeorm/src/migrations/` — TypeScript-миграции
- DataSource: `packages/typeorm/src/data-source.ts`
- CLI берёт `DATABASE_URL` из env или использует дефолт `postgresql://seller:seller@localhost:5432/seller`

## COMMENT ON

В каждой миграции добавлять (на русском):
- `COMMENT ON TABLE "table_name" IS '...'`
- `COMMENT ON COLUMN "table_name"."column_name" IS '...'`
- `COMMENT ON TYPE "EnumName" IS '...'` — для enum

Значения enum = API-контракт; менять только через миграцию + changelog. См. `.cursor/rules/typeorm-conventions.mdc`.

## Создание новой миграции

```bash
cd packages/typeorm
npx typeorm migration:create src/migrations/YYYYMMDDHHMMSS-Name
```

Заполнить `up()` и `down()`, затем `npm run db:migrate`.
