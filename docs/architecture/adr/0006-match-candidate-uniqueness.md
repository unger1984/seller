# ADR 0006: MatchCandidate uniqueness

## Статус

Принято

## Контекст

Нужно различать уровни: WB nmId (карточка) vs chrtId (вариант), Ozon product_id vs offer_id.

## Решение

- externalRefType: OZON_PRODUCT_ID, OZON_OFFER_ID, WB_NM_ID, WB_CHRT_ID
- Unique: (marketAccountId, externalRefType, externalRef)
- Инвариант: externalRefType валиден только для marketplace marketAccount
- externalRef нормализован: numeric — String(BigInt(trimmed)); string — trim
