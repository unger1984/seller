# ADR 0015: companyId invariant enforcement

## Статус

Принято

## Контекст

Variant/VariantBarcode/Listing — companyId только из relation, не из body.

## Решение

- Variant: companyId = product.companyId (в транзакции)
- VariantBarcode: companyId = variant.companyId
- Listing: companyId = variant.companyId; validate variant.companyId === marketAccount.companyId
- Любой create/update — только внутри транзакции с проверками
