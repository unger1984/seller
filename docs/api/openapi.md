# OpenAPI / Swagger

## Генерация

Swagger генерируется из Zod-схем через `nestjs-zod`.

- Схемы в `packages/shared-types/src/schemas/`
- NestJS контроллеры используют Zod-схемы для DTO
- Путь: `/api/docs` или `/docs`

## BigInt

Все marketplace IDs в API — строка. Swagger отображает `string`, не `integer`.
