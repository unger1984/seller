# ADR 0007: Шифрование API-ключей

## Статус

Принято

## Контекст

Хранение Client-Id + Api-Key (Ozon), apiKey (WB) — чувствительные данные.

## Решение

- credentialsEncrypted — строка (version:nonce:ciphertext)
- libsodium/envelope encryption
- Master key из env / Vault
- Не hash — ключи нужны для вызова API
