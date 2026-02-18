# ADR 0012: companyId из URL — безопасность

## Статус

Принято

## Контекст

Маршруты `/companies/:companyId/...` — риск подмены companyId.

## Решение

- TenantGuard: 403 если param.companyId !== activeCompanyId из JWT
- param.companyId не передавать в сервисы — только activeCompanyId из контекста
