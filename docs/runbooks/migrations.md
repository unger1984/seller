# Миграции TypeORM

## Команды

```bash
# Сгенерировать миграцию (сравнение entities со stage-БД, DATABASE_URL из .env.stage)
npm run db:migration:generate -- packages/typeorm/src/migrations/ИмяМиграции

# Применить миграции (требуется запущенный PostgreSQL)
npm run db:migrate

# Stage: через dotenv
npm run db:migrate:stage
```

Перед генерацией: обновить entities, убедиться что stage-БД доступна. Перед migrate: `docker compose up -d postgres` (если БД локально).

## Где миграции

- `packages/typeorm/src/migrations/` — TypeScript-миграции
- DataSource: `packages/typeorm/src/data-source.ts`
- Генерация ориентирована на **stage** (DATABASE_URL из `.env.stage`)

## COMMENT ON

После генерации — дописать в миграцию (на русском):
- `COMMENT ON TABLE "table_name" IS '...'`
- `COMMENT ON COLUMN "table_name"."column_name" IS '...'`
- `COMMENT ON TYPE "EnumName" IS '...'` — для enum

Значения enum = API-контракт; менять только через миграцию + changelog. См. `.cursor/rules/typeorm-conventions.mdc`.
