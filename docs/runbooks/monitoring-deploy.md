# Развёртывание мониторинга в окружении

Пошаговое развёртывание стека мониторинга: k9s/stern → kube-prometheus-stack → Loki + Alloy. Окружение: k3s на одной ноде (например 192.168.1.8), namespace `seller-stage`.

**Для кого:** полный нуб в Kubernetes. Документ объясняет каждый шаг, каждую команду и что делать, если что-то пошло не так.

---

## Содержание

1. [Глоссарий](#глоссарий) — что означают термины
2. [Предварительные условия](#предварительные-условия) — что установить
3. [Этап 0](#этап-0-k9s-и-stern-без-инфраструктуры) — k9s и stern (без установки в кластер)
4. [Этап 1](#этап-1-kube-prometheus-stack) — Prometheus + Grafana
5. [Этап 1a](#этап-1a-bullmq-метрики) — метрики очередей
6. [Этап 2](#этап-2-loki--alloy) — логи в Loki
7. [Алерты](#алерты-prometheusrule)
8. [Troubleshooting](#troubleshooting) — типичные ошибки

---

## Глоссарий

| Термин | Кратко |
| ------ | ------ |
| **kubectl** | CLI для управления Kubernetes. «kube control» |
| **Helm** | Пакетный менеджер для K8s. Ставит сложные приложения одним командой |
| **namespace** | Изолированная «папка» в кластере. `seller-stage` — наши воркеры, `monitoring` — стек мониторинга |
| **pod** | Минимальная единица запуска — один или несколько контейнеров |
| **deployment** | Шаблон подов. «Держи 1 под worker-import всегда запущенным» |
| **NodePort** | Порт на ноде, через который можно достучаться до сервиса с хоста (напр. `192.168.1.8:30300`) |
| **Secret** | Хранилище паролей/ключей в K8s. Графана хранит пароль admin в Secret |
| **DaemonSet** | Запускает по одному поду на каждую ноду (Alloy собирает логи с каждой ноды) |
| **Prometheus** | Собирает числовые метрики (CPU, память, кол-во jobs) |
| **Loki** | Хранит логи (текст из stdout подов) |
| **Grafana** | UI для графиков и логов. Дашборды, Explore, алерты |
| **Alloy** | Сборщик логов. Читает stdout подов и отправляет в Loki |

---

## Предварительные условия

### 1. Терминал

Все команды выполняются в терминале (macOS: Terminal, iTerm; Windows: WSL, PowerShell).

### 2. Homebrew (macOS)

Если ещё не установлен:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

После установки — выполнить команды из вывода (добавить brew в PATH).

### 3. kubectl — доступ к кластеру

**Проверка:** `kubectl get nodes` должен вернуть список нод (например `192.168.1.8`).

**Если нет:**

- Для k3s на своей машине: `kubectl` обычно ставится вместе с k3s.
- Для удалённого кластера: нужен `kubeconfig`. Его даёт админ кластера или его копируют с сервера (`~/.kube/config`).

**Установка kubectl (если нужен отдельно):**

```bash
brew install kubectl
```

Проверить контекст: `kubectl config current-context` — показывает, к какому кластеру вы подключены.

### 4. Helm 3

**Проверка:** `helm version` — должна быть версия 3.x.

**Установка:**

```bash
brew install helm
```

### 5. Клонирование репо и переход в папку

```bash
cd /путь/к/seller
```

Все пути к файлам (например `deploy/monitoring/...`) — от корня репо.

---

## Этап 0: k9s и Stern (без инфраструктуры)

Самый простой способ смотреть логи и статусы. Ничего не ставится в кластер — только локальные утилиты.

### k9s — интерактивный TUI

**Что это:** терминальный UI. Вместо кучи `kubectl` команд — навигация стрелками, выбор пода, просмотр логов.

**Установка:**

```bash
brew install k9s
```

**Запуск:**

```bash
k9s -n seller-stage
```

`-n seller-stage` — сразу открыть namespace с воркерами.

**Как пользоваться (кратко):**

| Действие | Клавиша |
| -------- | ------- |
| Показать deployments | `:deployments` и Enter |
| Выбрать deployment | стрелки вверх/вниз |
| Логи выбранного пода | `l` |
| Логи всех подов deployment | `Shift+L` |
| События (почему под перезапустился) | `:events` |
| Выход | `:q` или `Ctrl+C` |

**Ожидаемый вид:** список deployment'ов (`seller-worker-import`, `seller-worker-publish` и т.д.), статус `Running`.

---

### Stern — tail логов по label

**Что это:** как `tail -f`, но для нескольких подов одновременно. Все воркеры с label `seller-worker` — логи в одном потоке.

**Установка:**

```bash
brew install stern
```

Если brew не сработал — скачать бинарник с [релизов](https://github.com/stern/stern/releases).

**Запуск:**

```bash
stern seller-worker -n seller-stage
```

В начале каждой строки — имя пода (`seller-worker-import-xxx`, `seller-worker-publish-yyy`).

**Остановка:** `Ctrl+C`.

---

## Этап 1: kube-prometheus-stack

**Что ставим:** Prometheus (метрики), Grafana (дашборды и логи), Alertmanager (уведомления), плюс готовые алерты для K8s.

### Шаг 1.1. Добавить Helm-репозиторий

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

**Зачем:** Helm должен знать, откуда качать чарт. `update` — обновить список доступных версий.

**Проверка:** `helm search repo prometheus-community/kube-prometheus-stack` — должна быть строчка с чартом.

### Шаг 1.2. Убедиться, что values на месте

Файл `deploy/monitoring/kube-prometheus-stack-values.yaml` должен существовать в репо.

**Содержимое (кратко):**

- Prometheus: хранить метрики 7 дней, лимит 5GB
- Grafana: NodePort 30300 — доступ с хоста по `http://IP_НОДЫ:30300`

### Шаг 1.3. Установка

```bash
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --version 58.0.0 \
  -f deploy/monitoring/kube-prometheus-stack-values.yaml
```

**Что делает каждая часть:**

- `helm install` — установить приложение
- `kube-prometheus-stack` — имя релиза (можно будет `helm uninstall kube-prometheus-stack -n monitoring`)
- `prometheus-community/kube-prometheus-stack` — чарт из репо
- `--namespace monitoring` — ставить в namespace `monitoring`
- `--create-namespace` — создать namespace, если его нет
- `--version 58.0.0` — **обязательно** фиксируем версию. Без `--version` при следующем деплое может подтянуться другая версия — что-то сломается
- `-f deploy/monitoring/kube-prometheus-stack-values.yaml` — наши настройки

**Длительность:** 1–3 минуты. Helm скачивает образы и создаёт поды.

### Шаг 1.4. Проверка

```bash
kubectl get pods -n monitoring
```

**Ожидаемо:** поды с префиксами `prometheus`, `grafana`, `alertmanager` в статусе `Running` или `ContainerCreating`. Через минуту все должны быть `Running`.

**Если поды в `Pending`:** возможно, не хватает ресурсов на ноде. `kubectl describe pod ИМЯ_ПОДА -n monitoring` — смотреть Events.

**Если `ImagePullBackOff`:** нет доступа к registry с образами. Проверить сеть, при необходимости — mirrors для Docker.

### Шаг 1.5. Доступ к Grafana

**URL:** `http://192.168.1.8:30300` (заменить на IP вашей ноды, если другой).

**Пароль admin:**

```bash
kubectl get secret kube-prometheus-stack-grafana -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d
```

Выведется пароль. Логин: `admin`.

**Первый вход:** Grafana может попросить сменить пароль — можно пропустить или задать свой.

**Проверка:** в левом меню есть Dashboards, Explore. В Explore выбрать Prometheus — запрос `up` должен вернуть метрики.

---

## Этап 1a: BullMQ метрики

**Реализовано:** воркеры отдают `/metrics` на порту 9090. Метрики: `bull_queue_waiting_jobs`, `bull_queue_active_jobs`, `bull_queue_delayed_jobs`, `bull_queue_completed_total`, `bull_queue_failed_total` (label `queue`).

**PodMonitor** — чтобы Prometheus собирал метрики с воркеров:

```bash
kubectl apply -f deploy/monitoring/podmonitor-workers.yaml -n seller-stage
```

PodMonitor'ы в namespace `seller-stage` с label `release: kube-prometheus-stack` — Prometheus Operator подхватит их автоматически.

**Проверка:** Grafana → Explore → Prometheus → `bull_queue_waiting_jobs` — должны появиться ряды по очередям.

### Алерты (PrometheusRule)

**Сначала** должен быть установлен kube-prometheus-stack — он ставит Prometheus Operator и CRD `PrometheusRule`.

```bash
kubectl apply -f deploy/monitoring/prometheus-rules-workers.yaml -n monitoring
```

Правила: OOMKilled, частые рестарты, deployment down, queue lag > 100, failed jobs > 10 за 5 мин.

---

## Этап 2: Loki + Alloy

**Что ставим:** Loki хранит логи, Alloy собирает их из stdout подов и отправляет в Loki. В Grafana (той же, что из этапа 1) добавляем Loki как datasource — и можно искать по логам.

**Важно:** не ставить вторую Grafana. Loki подключаем к существующей.

### Шаг 2.1. Добавить Helm-репозиторий Grafana

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### Шаг 2.2. Установка Loki

Loki — single-binary: на одной ноде все компоненты в одном процессе. Retention 7 дней, хранилище — локальный диск.

```bash
helm install loki grafana/loki \
  --namespace monitoring \
  --version 6.0.0 \
  -f deploy/monitoring/loki-values.yaml
```

**Проверка:**

```bash
kubectl get pods -n monitoring | grep loki
```

Под `loki-0` (или `loki-...`) должен быть `Running`.

**Узнать имя сервиса Loki:**

```bash
kubectl get svc -n monitoring | grep loki
```

Часто: `loki-gateway` или `loki`. Это понадобится для Alloy и Grafana.

### Шаг 2.3. Поправить Alloy config, если имя сервиса другое

Открыть `deploy/monitoring/alloy-values.yaml`. В блоке `loki.write` URL должен совпадать с сервисом:

```
http://ИМЯ_СЕРВИСА.monitoring.svc.cluster.local/loki/api/v1/push
```

Например `loki-gateway` или `loki`. Формат: `http://<svc>.<namespace>.svc.cluster.local/loki/api/v1/push`.

### Шаг 2.4. Установка Alloy

```bash
helm install alloy grafana/alloy \
  --namespace monitoring \
  -f deploy/monitoring/alloy-values.yaml
```

Alloy устанавливается как DaemonSet — по одному поду на ноду. Каждый под читает логи всех подов на своей ноде и шлёт в Loki.

**Проверка:**

```bash
kubectl get pods -n monitoring | grep alloy
```

### Шаг 2.5. Добавить Loki в Grafana

1. Открыть Grafana: `http://192.168.1.8:30300`
2. Левое меню → **Connections** (или Configuration) → **Data sources**
3. **Add data source**
4. Выбрать **Loki**
5. **URL:** `http://loki-gateway.monitoring.svc.cluster.local` (если сервис называется иначе — подставить свой)
6. **Save & test** — должно быть зелёное «Data source is working»

**Проверка:** меню **Explore** → выбрать Loki → запрос `{namespace="seller-stage"}` — должны появиться логи из подов.

---

## JSON-логи (опционально)

Для удобного поиска в Loki по полям `level`, `label`, `error.stack` можно включить структурированный вывод.

В ConfigMap воркеров (или env deployment) добавить:
```
LOG_FORMAT=json
```

Логгер (`packages/shared`) при `LOG_FORMAT=json` переключается на `winston.format.json()`. По умолчанию — человекочитаемый вывод.

**Важно:** не использовать `userId`, `jobId`, `requestId` как labels в Loki — только в полях JSON.

---

## Алерты (PrometheusRule)

Готовые алерты из стека ловят общие проблемы. Свои правила для воркеров — в `deploy/monitoring/prometheus-rules-workers.yaml` (см. Этап 1a выше).

**Примеры правил:**

| Что ловим | PromQL |
| --------- | ------ |
| OOMKilled | `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} > 0` |
| Много рестартов за 5 мин | `increase(kube_pod_container_status_restarts_total[5m]) > 3` |
| Deployment недоступен | `kube_deployment_status_replicas_unavailable > 0` |
| Очередь растёт (нужны BullMQ метрики) | `bull_queue_waiting_jobs > N` |
| Много failed jobs | `increase(bull_queue_failed_total[5m]) > X` |

**Alertmanager:** уведомления в Telegram/Email настраиваются отдельно в values (секция `alertmanager`).

---

## Адаптация под окружение

| Параметр | Пример |
| -------- | ------ |
| IP ноды | `192.168.1.8` |
| Namespace воркеров | `seller-stage` |
| Namespace мониторинга | `monitoring` |
| Grafana NodePort | 30300 |
| Retention метрик/логов | 7–15 дней для stage |

---

## Версионирование Helm

| Правило | Зачем |
| ------- | ----- |
| values в repo | Воспроизводимость, code review |
| Не `--set key=val` в командной строке | Всё в файле, понятно что поменялось |
| Фиксировать `--version X.Y.Z` | Иначе через полгода деплой может сломаться |

Актуальные версии чартов: [kube-prometheus-stack](https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack), [Loki](https://artifacthub.io/packages/helm/grafana/loki).

---

## Troubleshooting

### kubectl get nodes: connection refused / timeout

Кластер недоступен. Проверить:

- `kubectl config current-context` — правильный ли контекст
- Есть ли доступ до ноды по сети (ping, ssh)
- Для k3s: запущен ли k3s на ноде

### helm install: Error: failed to download

Нет доступа в интернет или Helm не может скачать чарт. Проверить `helm repo update` и сетевое подключение.

### Pod в ImagePullBackOff

Образ не скачивается. Причины:

- Нет доступа к registry (Docker Hub, ghcr.io и т.п.)
- Для приватного registry — не настроен `imagePullSecrets`
- Неправильное имя образа

Смотреть: `kubectl describe pod ИМЯ -n monitoring` → Events.

### Pod в CrashLoopBackOff

Контейнер падает сразу после старта. Логи: `kubectl logs ИМЯ_ПОДА -n monitoring --previous` (если под уже перезапускался).

Типично: неверный конфиг (values), не хватает памяти (OOM), ошибка в коде.

### Grafana: Data source is not working

- Проверить, что Loki запущен: `kubectl get pods -n monitoring | grep loki`
- URL в Grafana должен быть `http://ИМЯ_СЕРВИСА.monitoring.svc.cluster.local` — из того же кластера
- Из браузера этот URL не откроется (внутренний DNS). Grafana работает внутри кластера и должна его видеть

### Alloy не видит логи

- Alloy — DaemonSet, поды должны быть на тех же нодах, что и воркеры
- Проверить конфиг: `kubectl get configmap -n monitoring -l app.kubernetes.io/name=alloy -o yaml`
- В Loki URL в конфиге Alloy должен совпадать с реальным сервисом

### Нет метрик в Prometheus / Grafana

- ServiceMonitor'ы: kube-prometheus-stack создаёт их автоматически для стандартных компонентов
- Для кастомных приложений (воркеры) — нужен или `ServiceMonitor`, или Prometheus scrape config. BullMQ метрики (Этап 1a) должны быть доступны по HTTP на подах

---

## Ссылки

- [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Loki Helm chart](https://github.com/grafana/loki/tree/main/production/helm/loki)
- [Grafana Alloy](https://grafana.com/docs/alloy/latest/)
- [stage-monitoring.md](./stage-monitoring.md) — как пользоваться мониторингом
