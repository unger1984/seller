# Stage — k9s и логи

Логи воркеров stage: kubectl, stern, k9s. Namespace `seller-stage`.

---

## Установка k9s

```bash
brew install k9s
```

---

## Быстрый старт

### Логи одного воркера

```bash
kubectl logs -f deployment/seller-worker-import -n seller-stage
```

Заменить `import` на `publish`, `sync-stock`, `email` для других воркеров.

### Логи всех воркеров

```bash
stern seller-worker -n seller-stage
```

Stern: `brew install stern`

### K9s (TUI)

```bash
k9s -n seller-stage
```

`:deploy` — список deployment'ов, стрелками выбрать воркер, `l` — логи. `:events` — события кластера (OOMKilled, BackOff).
