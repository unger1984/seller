#!/usr/bin/env bash
# Применяет deploy/stage с подстановкой FRONTEND_URL, SMTP_FROM из .env.stage или .env
set -e

ENV_FILE=""
[ -f .env.stage ] && ENV_FILE=".env.stage"
[ -z "$ENV_FILE" ] && [ -f .env ] && ENV_FILE=".env"
[ -z "$ENV_FILE" ] && { echo "Не найден .env.stage или .env"; exit 1; }

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# sed — только FRONTEND_URL и SMTP_FROM, без envsubst (он ломал redis://seller-redis)
FRONTEND_URL="${FRONTEND_URL:-https://localhost:8443}"
SMTP_FROM="${SMTP_FROM:-noreply@seller.local}"
kubectl kustomize deploy/stage | sed -e "s|\${FRONTEND_URL:-[^}]*}|$FRONTEND_URL|g" \
  -e "s|\${SMTP_FROM:-[^}]*}|$SMTP_FROM|g" | kubectl apply -f -
