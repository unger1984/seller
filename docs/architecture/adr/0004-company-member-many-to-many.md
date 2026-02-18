# ADR 0004: CompanyMember many-to-many

## Статус

Принято

## Контекст

Пользователь может работать в нескольких компаниях.

## Решение

- CompanyMember(userId, companyId, role)
- Роли: OWNER, ADMIN, MEMBER, VIEWER
- Active company в JWT — backend проверяет членство при логине / PATCH active-company
