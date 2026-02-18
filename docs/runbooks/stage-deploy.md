# Stage — Postgres и Redis в k3s

Stage окружение: PostgreSQL и Redis развёрнуты в k3s на 192.168.1.8. API, Worker и Web запускаются локально и подключаются к удалённым сервисам.

## Предварительные условия

- `kubectl` настроен на k3s (192.168.1.8)
- Доступ к кластеру: `kubectl get nodes`

## Деплой Postgres и Redis

```bash
# 1. Создать namespace и Secret (пароль не в репо)
kubectl create namespace seller-stage --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic seller-postgres-secret \
  --from-literal=POSTGRES_PASSWORD=seller \
  -n seller-stage

# 2. Применить манифесты (ConfigMap, PVC, Deployment, Service)
kubectl apply -k deploy/stage/
```

## Проверка

```bash
kubectl get pods -n seller-stage
kubectl get svc -n seller-stage
```

Ожидаемый вывод: `seller-postgres` и `seller-redis` в статусе Running. NodePort: Postgres 30032, Redis 30379.

Подключение с хоста:

```bash
# Postgres (с машины с доступом к 192.168.1.8)
psql "postgresql://seller:seller@192.168.1.8:30032/seller"

# Redis
redis-cli -h 192.168.1.8 -p 30379 ping
```

## Локальный запуск проекта

### 1. Конфигурация

```bash
cp .env.stage.example .env.stage
# Отредактировать .env.stage при необходимости (пароль, JWT_SECRET)
```

### 2. Запуск API

```bash
npm run dev:api:stage
# или
npm run dev:stage
```

### 3. Запуск Worker

```bash
npm run dev:worker:stage
```

### 4. Миграции БД

```bash
npm run db:migrate:stage
```

## Структура deploy/stage/

| Файл           | Назначение                                      |
|----------------|--------------------------------------------------|
| namespace.yaml | Namespace `seller-stage`                         |
| postgres.yaml  | ConfigMap, PVC, Deployment, Service (Secret создаётся вручную) |
| redis.yaml     | PVC, Deployment, Service                        |
| kustomization.yaml | Kustomize для `kubectl apply -k`             |

NodePort: Postgres 30032, Redis 30379 (диапазон k3s 30000–32767).

## Безопасность

- Пароль Postgres не в репо — Secret создаётся вручную перед деплоем.
- Stage на внутренней сети 192.168.x — пароль `seller` для простоты. Production: Sealed Secrets / external-secrets.
- При необходимости ограничить доступ firewall'ом.
