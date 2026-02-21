#!/usr/bin/env bash
# Пересборка и деплой воркеров на stage (k3s)
# Вызов из корня репо: ./tooling/scripts/deploy-workers-stage.sh
set -e

REGISTRY="${REGISTRY:-192.168.1.8:30500}"
NAMESPACE="${NAMESPACE:-seller-stage}"
WORKERS=(import publish sync-stock email)

cd "$(dirname "$0")/../.."
ROOT="${PWD}"

echo "==> Сборка образов"
for w in "${WORKERS[@]}"; do
  echo "  docker:worker:$w"
  npm run "docker:worker:${w}"
done

echo "==> Тег и push в ${REGISTRY}"
for w in "${WORKERS[@]}"; do
  docker tag "seller/worker-${w}:latest" "${REGISTRY}/seller/worker-${w}:latest"
  docker push "${REGISTRY}/seller/worker-${w}:latest"
done

if ! kubectl get deployment seller-worker-import -n "$NAMESPACE" &>/dev/null; then
  echo "==> Deployments не найдены, применяю deploy:stage"
  npm run deploy:stage
fi

echo "==> Rollout restart в namespace ${NAMESPACE}"
for w in "${WORKERS[@]}"; do
  kubectl rollout restart "deployment/seller-worker-${w}" -n "$NAMESPACE"
done

echo "==> Готово. Статус:"
kubectl get pods -n "$NAMESPACE" -l 'app in (seller-worker-import,seller-worker-publish,seller-worker-sync-stock,seller-worker-email)'
