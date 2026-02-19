# Stage — Postgres, Redis и Workers в k3s

Stage окружение развёрнуто в k3s на 192.168.1.8. API и Web запускаются локально и подключаются к удалённым Postgres/Redis. Workers могут работать локально или в кластере.

## Предварительные условия

- `kubectl` настроен на k3s (192.168.1.8): `kubectl get nodes`
- **Docker** — для сборки образов воркеров (Docker Desktop, Colima или OrbStack на Mac)
- Доступ по SSH к ноде 192.168.1.8 — для настройки k3s

---

## Деплой по шагам

### Шаг 1. Registry (глобальный, один раз)

```bash
kubectl apply -k deploy/registry/
```

Namespace `registry`, NodePort 30500. Не удаляется при `kubectl delete ns seller-stage`.

### Шаг 2. seller-stage: namespace и Secrets

```bash
kubectl create namespace seller-stage --dry-run=client -o yaml | kubectl apply -f -

# Postgres
kubectl create secret generic seller-postgres-secret \
  --from-literal=POSTGRES_PASSWORD=seller \
  -n seller-stage

# Workers (для деплоя воркеров в k8s)
kubectl create secret generic seller-worker-secret \
  --from-literal=DATABASE_URL='postgresql://seller:seller@seller-postgres:5432/seller' \
  -n seller-stage
```

Пароль в DATABASE_URL должен совпадать с `seller-postgres-secret`.

### Шаг 3. Postgres, Redis, Workers

```bash
kubectl apply -k deploy/stage/
```

Поды воркеров будут в `ImagePullBackOff` до появления образов в registry (шаг 6).

### Шаг 4. Настройка k3s для registry (один раз)

На ноде 192.168.1.8 (SSH или напрямую):

```bash
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/registries.yaml << 'EOF'
mirrors:
  "192.168.1.8:30500":
    endpoint:
      - "http://192.168.1.8:30500"
EOF
sudo systemctl restart k3s
```

### Шаг 5. Docker: insecure-registries (один раз)

**macOS (Docker Desktop):** Settings → Docker Engine → добавить в JSON:

```json
"insecure-registries": ["192.168.1.8:30500"]
```

Применить и перезапустить Docker.

**macOS (Colima):** `colima start` — обычно работает с registry по умолчанию.

### Шаг 6. Сборка и push образов воркеров

```bash
# Сборка (из корня репо)
npm run docker:worker:import
npm run docker:worker:publish
npm run docker:worker:sync-stock

# Тег и push
REGISTRY=192.168.1.8:30500
docker tag seller/worker-import:latest ${REGISTRY}/seller/worker-import:latest
docker tag seller/worker-publish:latest ${REGISTRY}/seller/worker-publish:latest
docker tag seller/worker-sync-stock:latest ${REGISTRY}/seller/worker-sync-stock:latest

docker push ${REGISTRY}/seller/worker-import:latest
docker push ${REGISTRY}/seller/worker-publish:latest
docker push ${REGISTRY}/seller/worker-sync-stock:latest
```

### Шаг 7. Проверка

```bash
kubectl get pods -n seller-stage
kubectl get pods -n registry
```

Ожидается: `seller-postgres`, `seller-redis`, `seller-worker-*` в Running; `registry-*` в Running.

---

## Альтернатива: загрузка образов без registry

Если registry не используется — save образов, scp на ноду, import в containerd:

```bash
# Локально (собрав образы)
docker save seller/worker-import:latest | gzip > /tmp/worker-import.tar.gz
docker save seller/worker-publish:latest | gzip > /tmp/worker-publish.tar.gz
docker save seller/worker-sync-stock:latest | gzip > /tmp/worker-sync-stock.tar.gz

scp /tmp/worker-*.tar.gz 192.168.1.8:/tmp/

# На ноде 192.168.1.8:
sudo k3s ctr images import /tmp/worker-import.tar.gz
sudo k3s ctr images import /tmp/worker-publish.tar.gz
sudo k3s ctr images import /tmp/worker-sync-stock.tar.gz
rm /tmp/worker-*.tar.gz
```

В этом случае в `workers.yaml` образы должны быть `seller/worker-*:latest`, а не `192.168.1.8:30500/...`.

---

## Локальный запуск (API, Web, воркеры)

### Конфигурация

```bash
cp .env.stage.example .env.stage
# Отредактировать при необходимости (JWT_SECRET и т.д.)
```

### Запуск

```bash
# API
npm run dev:api:stage

# Workers (в отдельных терминалах)
npm run dev:worker:stage           # worker-import
dotenv -e .env.stage -- nx run worker-publish:run
dotenv -e .env.stage -- nx run worker-sync-stock:run
```

### Миграции

```bash
npm run db:migrate:stage
```

---

## Подключение с хоста

```bash
# Postgres
psql "postgresql://seller:seller@192.168.1.8:30032/seller"

# Redis
redis-cli -h 192.168.1.8 -p 30379 ping
```

---

## Структура deploy/

| Путь                 | Назначение                                          |
| -------------------- | --------------------------------------------------- |
| **deploy/registry/** | Registry (namespace `registry`), NodePort 30500     |
| **deploy/stage/**    | Postgres, Redis, Workers (namespace `seller-stage`) |

### deploy/stage/

| Файл               | Назначение                          |
| ------------------ | ----------------------------------- |
| namespace.yaml     | Namespace `seller-stage`            |
| postgres.yaml      | ConfigMap, PVC, Deployment, Service |
| redis.yaml         | PVC, Deployment, Service            |
| workers.yaml       | ConfigMap, 3 Deployment воркеров    |
| kustomization.yaml | Kustomize                           |

**NodePort:** Postgres 30032, Redis 30379, Registry 30500.

---

## Безопасность

- Пароли не в репо — Secrets создаются вручную
- Stage на внутренней сети; production — Sealed Secrets / external-secrets
