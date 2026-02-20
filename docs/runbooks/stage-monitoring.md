# Stage Monitoring — использование

Как пользоваться мониторингом stage: k9s, stern, Grafana, Loki, алерты. Воркеры в `seller-stage` с логами в stdout (Winston с label: `{ImportProcessor}`, `{PublishProcessor}` и т.д.).

**Для кого:** полный нуб. Подробно расписано, куда нажимать, что вводить и на что смотреть.

---

## Содержание

1. [Быстрый старт](#быстрый-старт) — три команды для логов
2. [k9s](#k9s--навигация-и-логи) — пошаговая навигация
3. [Stern](#stern--tail-по-label) — логи нескольких подов
4. [Grafana](#grafana) — дашборды, Loki, алерты
5. [Типовые сценарии](#типовые-сценарии) — что делать, когда что-то не так
6. [Развёртывание](#развёртывание) — ссылка на установку

---

## Быстрый старт

Самые частые задачи — три команды:

### 1. Логи одного воркера (например import)

```bash
kubectl logs -f deployment/seller-worker-import -n seller-stage
```

- `-f` — следить в реальном времени (как `tail -f`)
- `deployment/seller-worker-import` — все поды этого deployment (обычно один)
- Остановка: `Ctrl+C`

**Другие воркеры:** заменить `import` на `publish`, `sync-stock`, `email`.

### 2. Логи всех воркеров сразу

```bash
stern seller-worker -n seller-stage
```

В начале строки видно, от какого пода лог: `seller-worker-import-xxx`, `seller-worker-publish-yyy` и т.д.

### 3. Интерактивный режим (k9s)

```bash
k9s -n seller-stage
```

TUI: стрелками выбираем deployment, жмём `l` — логи. Подробнее ниже.

---

## k9s — навигация и логи

### Запуск

```bash
k9s -n seller-stage
```

По умолчанию k9s показывает поды (pods). Можно переключиться на другие ресурсы.

### Основные команды (вводить после `:`)

| Команда | Что покажет |
| ------- | ----------- |
| `:pods` | Поды (по умолчанию) |
| `:deployments` или `:deploy` | Деплойменты воркеров |
| `:svc` или `:services` | Сервисы |
| `:events` | События кластера (кто перезапустился, почему) |
| `:quit` или `:q` | Выход |

### Горячие клавиши

| Клавиша | Действие |
| ------- | -------- |
| Стрелки ↑↓ | Выбрать строку |
| Enter | Детали ресурса |
| `l` | Логи **выбранного** пода |
| `Shift+L` | Логи **всех** подов выбранного deployment |
| `d` | Опиши (describe) — детали пода, события, почему перезапустился |
| `y` | Показать YAML ресурса |
| `/` | Поиск по списку |
| `Ctrl+A` | Выбрать все |
| `?` | Помощь по всем клавишам |

### Типичный сценарий: посмотреть логи воркера

1. Запустить `k9s -n seller-stage`
2. Ввести `:deploy` — список deployment'ов
3. Стрелками выбрать `seller-worker-import` (или другой)
4. Нажать `l` — откроются логи в реальном времени
5. Ввести `:q` чтобы вернуться к списку, `:q` ещё раз — выход

### События (почему под упал)

1. `:events`
2. События отсортированы по времени. Смотреть колонку `REASON` — `OOMKilled`, `Failed`, `BackOff` и т.д.
3. Колонка `MESSAGE` — краткое описание

---

## Stern — tail по label

Stern выводит логи из нескольких подов одновременно. Удобно, когда нужно видеть все воркеры в одном потоке.

### Установка (если ещё нет)

```bash
brew install stern
```

Или скачать бинарник: [релизы Stern](https://github.com/stern/stern/releases).

### Примеры команд

**Все воркеры (по префиксу имени):**

```bash
stern seller-worker -n seller-stage
```

**Только import:**

```bash
stern seller-worker-import -n seller-stage
```

**С таймстемпами** (когда каждое сообщение пришло):

```bash
stern seller-worker -n seller-stage --timestamps
```

**Только ошибки** (если в логах есть слово error):

```bash
stern seller-worker -n seller-stage --template '{{.PodName}} {{.Message}}' 2>/dev/null | grep -i error
```

Или проще — запустить stern и искать вручную (в терминале с поддержкой scrollback).

**Остановка:** `Ctrl+C`

---

## Grafana

### Доступ

**URL:** `http://192.168.1.8:30300` (заменить на IP ноды, если другой).

**Логин:** `admin`

**Пароль** (получить из кластера):

```bash
kubectl get secret kube-prometheus-stack-grafana -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d
```

Скопировать вывод — это пароль. Вставить в форму входа.

**Если Grafana не открывается:** проверить, что NodePort 30300 открыт на ноде, firewall не блокирует. `kubectl get svc -n monitoring | grep grafana` — в колонке PORT должно быть `30300:30300/TCP` или подобное.

---

### Дашборды

**Где искать:** левое меню → **Dashboards** (иконка с четырьмя квадратами) → **Browse**.

**Полезные дашборды (если развёрнут kube-prometheus-stack):**

| Дашборд | Что показывает |
| ------- | -------------- |
| Kubernetes / Compute cluster | Обзор подов, CPU, память по namespace |
| Node Exporter | Метрики нод (CPU, память, диск) |
| BullMQ (если настроен) | Очереди: waiting, active, failed, completed |

**Как найти под воркера:** Dashboards → Kubernetes/Compute → выбрать namespace `seller-stage` — появятся поды `seller-worker-*`. Клик по поду → детали, ссылки на логи.

---

### Loki — поиск по логам

**Где:** левое меню → **Explore** (иконка компаса) → в выпадающем списке выбрать **Loki**.

#### Простой поиск — Log browser

1. Включить режим **Log browser** (если есть)
2. Выбрать label `namespace` → `seller-stage`
3. Выбрать `container` или `app` — сузить до воркеров
4. Нажать **Run query**

#### Ручной запрос (LogQL)

В поле запроса ввести:

```
{namespace="seller-stage", app=~"seller-worker-.*"}
```

- `app=~"seller-worker-.*"` — регулярка: все приложения, начинающиеся с `seller-worker-`
- Чтобы только import: `{namespace="seller-stage", app="seller-worker-import"}`

**Фильтры по содержимому:**

```
{namespace="seller-stage"} |= "error"
```

Показать только строки, содержащие «error».

**Фильтр по уровню** (если логи JSON с полем `level`):

```
{namespace="seller-stage"} | json | level="error"
```

**Важно — кардинальность labels:** не добавлять в labels Loki `userId`, `jobId`, `requestId` — слишком много уникальных значений, Loki перегрузится. Эти поля оставлять только в теле лога (в JSON).

---

### Алерты

**Посмотреть активные алерты:** левое меню → **Alerting** → **Alert rules** (или Prometheus → Alerts).

**Где настраиваются правила:** в kube-prometheus-stack, PrometheusRule. Посмотреть в кластере:

```bash
kubectl get prometheusrules -n monitoring
```

**Уведомления (Telegram, Email):** настраиваются в Alertmanager. Конфиг хранится в values kube-prometheus-stack.

---

## Типовые сценарии

### Сценарий 1: Воркер упал / перезапускается

**Симптомы:** задачи не обрабатываются, в k9s под в состоянии `CrashLoopBackOff` или часто рестартует.

#### Шаг 1. События кластера

```bash
kubectl get events -n seller-stage --sort-by='.lastTimestamp'
```

Смотреть последние строки. `Reason`: `OOMKilled` — не хватило памяти. `Failed` — ошибка при старте. `BackOff` — контейнер падает, K8s перезапускает.

#### Шаг 2. Логи упавшего пода

Если под уже перезапустился, логи **предыдущего** запуска:

```bash
kubectl logs deployment/seller-worker-import -n seller-stage --previous
```

Без `--previous` — логи текущего запуска (может быть пусто, если под только что стартанул).

#### Шаг 3. OOMKilled?

```bash
kubectl describe pod -l app=seller-worker-import -n seller-stage
```

В секции **Containers** → **Last State** искать `Reason: OOMKilled`. Значит нужно увеличить `resources.limits.memory` в deployment воркера.

#### Шаг 4. Grafana

- Dashboards → Kubernetes → выбрать под
- Или Explore → Loki → `{namespace="seller-stage", app="seller-worker-import"}` — поиск по логам до падения

---

### Сценарий 2: Очередь растёт (много задач в ожидании)

**Симптомы:** задачи накапливаются, долго обрабатываются.

#### Шаг 1. Метрики BullMQ (если настроен `/metrics`)

В Grafana → Explore → выбрать **Prometheus**, запрос:

```promql
bull_queue_waiting_jobs{queue="import"}
```

Или аналогичное имя метрики. Покажет количество задач в ожидании. Если растёт — воркер не успевает или завис.

#### Шаг 2. Redis напрямую

```bash
redis-cli -h 192.168.1.8 -p 30379
```

Внутри redis-cli:

```
LLEN bull:import:wait
```

(для очереди import; для других — `bull:publish:wait`, `bull:sync-stock:wait` и т.д.)

Число — сколько задач ждут. Растёт — проблема на стороне обработки.

#### Шаг 3. Логи воркера

Возможные причины: rate limit API маркетплейса, ошибки при обработке, воркер упал.

```bash
stern seller-worker-import -n seller-stage
```

Или Loki: `{namespace="seller-stage", app="seller-worker-import"} |= "error"`.

---

### Сценарий 3: Много failed jobs

**Симптомы:** задачи падают с ошибкой, в Redis накапливаются failed.

#### Шаг 1. Метрики (если есть)

Prometheus:

```promql
increase(bull_queue_failed_total[5m])
```

Рост за 5 минут — код или внешний API начал падать.

#### Шаг 2. Логи

Loki:

```
{namespace="seller-stage"} |= "error"
```

Или `|= "failed"` — смотреть стек ошибок.

#### Шаг 3. Проверить алерт

Если настроен алерт Failed jobs rate — он должен был сработать. Prometheus → Alerts — смотреть firing alerts.

---

## Развёртывание

Как развернуть мониторинг с нуля: [monitoring-deploy.md](./monitoring-deploy.md).

---

## Шпаргалка команд

| Задача | Команда |
| ------ | ------- |
| Логи одного воркера | `kubectl logs -f deployment/seller-worker-import -n seller-stage` |
| Логи всех воркеров | `stern seller-worker -n seller-stage` |
| k9s TUI | `k9s -n seller-stage` |
| События (почему упал) | `kubectl get events -n seller-stage --sort-by='.lastTimestamp'` |
| Логи предыдущего запуска | `kubectl logs deployment/seller-worker-import -n seller-stage --previous` |
| Описание пода (OOM и т.д.) | `kubectl describe pod -l app=seller-worker-import -n seller-stage` |
| Пароль Grafana | `kubectl get secret kube-prometheus-stack-grafana -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d` |
| Очередь в Redis | `redis-cli -h 192.168.1.8 -p 30379` → `LLEN bull:import:wait` |
