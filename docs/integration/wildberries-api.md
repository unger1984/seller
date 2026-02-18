# Wildberries API

## Авторизация

- Header: `Authorization: Bearer <token>`
- Документация: openapi.wildberries.ru

## ID

- nmId, imtId, chrtId — числовые в API → хранить BigInt
- Приводить на границе: parse при импорте, .toString() при отдаче в API
