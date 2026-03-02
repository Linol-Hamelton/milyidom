# Милый Дом — Деплой на сервер с FastPanel
## (Реальная продакшн-конфигурация)

> **Актуально для:** Beget VPS, IP `62.217.178.117`, Ubuntu 22.04, FastPanel.
> Этот гайд описывает **реальное** состояние сервера — не шаблон, а факты.
> Все пути, порты, URL соответствуют тому, что сейчас работает в продакшне.

---

## Архитектура на сервере

```
Интернет
    │
    ▼
FastPanel Nginx (80/443) ← SSL Let's Encrypt, управляет FastPanel
    │
    ├─► proxy → 127.0.0.1:3002  ← milyi_dom_frontend (Docker, Next.js)
    ├─► proxy → 127.0.0.1:4001  ← milyi_dom_backend  (Docker, NestJS)
    └─► proxy → 127.0.0.1:3003  ← milyi_dom_grafana  (Docker, опционально)

Docker containers (слушают только на localhost):
    milyi_dom_frontend   127.0.0.1:3002  (порт 3000 занят next-labus-app)
    milyi_dom_backend    127.0.0.1:4001
    milyi_dom_db         внутри docker-сети (PostgreSQL 16 + PostGIS 3.4)
    milyi_dom_redis      127.0.0.1:6380  (порт 6379 занят системным Redis)
    milyi_dom_typesense  внутри docker-сети (порт 8108)
    milyi_dom_pgbouncer  внутри docker-сети (порт 5433)
    milyi_dom_grafana    127.0.0.1:3003  (порт 3001 занят dev-next-labus-app)
    milyi_dom_prometheus внутри docker-сети (порт 9090)
```

> **Важно:** на сервере уже работают другие приложения, поэтому стандартные порты
> 3000, 6379, 3001 заняты. Milyi Dom использует 3002, 6380, 3003.

---

## Реальные данные сервера

| Параметр | Значение |
|---|---|
| Провайдер | Beget VPS |
| IP | `62.217.178.117` |
| ОС | Ubuntu 22.04 LTS |
| Панель управления | FastPanel |
| Путь проекта | `/opt/milyi-dom/milyi-dom/` |
| Репозиторий | `https://github.com/Linol-Hamelton/milyidom.git` |
| DNS-регистратор | Reg.ru (ns1.reg.ru, ns2.reg.ru) |
| SSL | Let's Encrypt через FastPanel |
| Хранилище изображений | Yandex Object Storage (`milyidom-images`, `ru-central1`) |

### DNS A-записи (Reg.ru)

| Тип | Имя | Значение | TTL |
|---|---|---|---|
| A | `@` | `62.217.178.117` | 300 |
| A | `www` | `62.217.178.117` | 300 |
| A | `api` | `62.217.178.117` | 300 |

---

## Расположение файлов на сервере

```
/opt/milyi-dom/
└── milyi-dom/                    ← git clone репозитория (корень monorepo)
    ├── milyi-dom/                ← монорепозиторий приложения
    │   ├── apps/
    │   │   ├── backend/
    │   │   │   └── .env          ← production env (не в git, вручную)
    │   │   └── frontend/
    │   │       └── .env.local    ← production env (не в git, вручную)
    │   ├── docker-compose.yml
    │   └── .env                  ← build args для docker-compose
    └── images/                   ← локальные изображения (fallback, dev only)
```

> **Рабочая директория для команд:** `/opt/milyi-dom/milyi-dom/`

---

## Порты (с учётом конфликтов на сервере)

В `docker-compose.yml` настроены следующие порты. Если начинаете с нуля — убедитесь,
что эти порты свободны на вашем сервере:

```yaml
# Фрагмент docker-compose.yml для справки
frontend:
  ports:
    - '127.0.0.1:3002:3000'   # 3000 занят другим приложением → используем 3002

backend:
  ports:
    - '127.0.0.1:4001:4001'

redis:
  ports:
    - '127.0.0.1:6380:6379'   # 6379 занят системным Redis → используем 6380

grafana:
  ports:
    - '127.0.0.1:3003:3000'   # 3001 занят другим приложением → используем 3003
```

Проверить конфликты:
```bash
ss -tlnp | grep -E '3000|3001|3002|6379|6380|4001'
```

---

## FastPanel: proxy-сайты

В FastPanel созданы два proxy-сайта:

### milyidom.com → Frontend

- **Домен:** `milyidom.com`, `www.milyidom.com`
- **Тип:** Proxy
- **Адрес прокси:** `http://127.0.0.1:3002`
- **SSL:** Let's Encrypt (автоматически через FastPanel)

### api.milyidom.com → Backend

- **Домен:** `api.milyidom.com`
- **Тип:** Proxy
- **Адрес прокси:** `http://127.0.0.1:4001`
- **SSL:** Let's Encrypt (автоматически через FastPanel)

### Custom Nginx директивы для api.milyidom.com

Добавить через FastPanel → Сайты → api.milyidom.com → Nginx конфигурация:

```nginx
# WebSocket (Socket.io)
location /socket.io/ {
    proxy_pass http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400s;
}

# Stripe webhook — без буферизации тела
location /api/payments/webhook {
    proxy_pass http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_request_buffering off;
}

# Размер загружаемых изображений
client_max_body_size 15M;
```

---

## Переменные окружения (production)

### `/opt/milyi-dom/milyi-dom/apps/backend/.env`

```env
NODE_ENV=production
PORT=4001

# База данных (через PgBouncer + прямое подключение для миграций)
DATABASE_URL=postgresql://postgres:ПАРОЛЬ@pgbouncer:5432/milyi_dom?schema=public&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres:ПАРОЛЬ@db:5432/milyi_dom?schema=public

# JWT (генерировать: openssl rand -base64 48)
JWT_SECRET=<64+ символов>
JWT_REFRESH_SECRET=<другие 64+ символов>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=https://milyidom.com,https://www.milyidom.com
FRONTEND_URL=https://milyidom.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Redis (внутри docker-сети, без порта-конфликта)
REDIS_URL=redis://redis:6379

# Email (Resend)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_...

# Typesense (внутри docker-сети)
TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=<случайная строка, openssl rand -hex 32>

# OAuth
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=https://api.milyidom.com/api/auth/google/callback

VK_CLIENT_ID=...
VK_CLIENT_SECRET=...
VK_CALLBACK_URL=https://api.milyidom.com/api/auth/vk/callback

# Yandex Object Storage (изображения объявлений)
S3_BUCKET=milyidom-images
S3_REGION=ru-central1
S3_ENDPOINT=https://storage.yandexcloud.net
S3_ACCESS_KEY_ID=<ключ сервисного аккаунта>
S3_SECRET_ACCESS_KEY=<секрет сервисного аккаунта>
CDN_BASE_URL=https://milyidom-images.storage.yandexcloud.net

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# Sentry (опционально)
# SENTRY_DSN=https://...@o0.ingest.sentry.io/0
```

### `/opt/milyi-dom/milyi-dom/apps/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_FALLBACK_IMAGE_URL=/images/listing-1.jpg
```

### `/opt/milyi-dom/milyi-dom/.env` (build args для docker-compose)

```env
NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
GRAFANA_PASSWORD=<пароль для Grafana>
```

---

## Команды деплоя

### Стандартный деплой (обновление кода)

```bash
cd /opt/milyi-dom/milyi-dom

# 1. Получить новый код
git pull

# 2. Пересобрать и перезапустить frontend (если изменялся только frontend)
docker compose up -d --build frontend

# 3. Пересобрать и перезапустить backend (если изменялся backend или schema.prisma)
docker compose up -d --build backend

# 4. Оба сразу (если изменялось и то и другое)
docker compose up -d --build frontend backend

# 5. Очистить старые слои Docker (после успешного деплоя)
docker system prune -f
```

### Применение миграций БД

```bash
cd /opt/milyi-dom/milyi-dom

# Применить новые Prisma-миграции (DIRECT_DATABASE_URL bypasses PgBouncer)
docker compose exec backend sh -c "cd /monorepo/apps/backend && npx prisma migrate deploy"
```

### Проверка состояния

```bash
cd /opt/milyi-dom/milyi-dom

# Все контейнеры запущены
docker compose ps

# Логи backend (последние 50 строк)
docker compose logs backend --tail=50

# Логи frontend
docker compose logs frontend --tail=50

# Здоровье API
curl https://api.milyidom.com/api/health

# Использование ресурсов
docker stats --no-stream
```

---

## Тестовые данные (Seed)

База данных содержит 15 тестовых объявлений в 9 городах.

### Добавить тестовые данные

```bash
cd /opt/milyi-dom/milyi-dom

docker compose exec backend sh -c \
  "cd /monorepo/apps/backend && node -e \"require('child_process').execSync('npx ts-node --transpile-only prisma/seed.ts', {stdio:'inherit'})\""
```

**Скрипт идемпотентен** — повторный запуск пропускает существующие записи.

### Тестовые учётные записи (пароль: `password123`)

| Email | Роль | Имя |
|---|---|---|
| `host@example.com` | HOST (Суперхост) | Елена Морозова |
| `host2@example.com` | HOST (Суперхост) | Наталья Сорокина |
| `guest@example.com` | GUEST | Сергей Иванов |
| `admin@example.com` | ADMIN | Максим Петров |

### Удалить тестовые данные

```bash
docker compose exec backend sh -c \
  "cd /monorepo/apps/backend && node -e \"require('child_process').execSync('npx ts-node --transpile-only prisma/seed-clear.ts', {stdio:'inherit'})\""
```

Удаляет **только** записи с маркерами: IDs начинающиеся на `seed_`, email `@example.com`.
Реальные данные пользователей не затрагиваются.

---

## Хранилище изображений — Yandex Object Storage

Настройки бакета в Яндекс Облаке:
- **Имя бакета:** `milyidom-images`
- **Регион:** `ru-central1`
- **Чтение объектов:** Публичный (для отображения без подписи)
- **Чтение списка:** Приватный
- **Класс хранения:** Стандартный
- **Версионирование:** Выкл

Сервисный аккаунт IAM должен иметь роль `storage.uploader`.

**Как работает fallback:**
- Если `S3_ACCESS_KEY_ID` пустой → изображения сохраняются на диск в `/opt/milyi-dom/milyi-dom/images/` (только для dev-режима)
- Тестовые данные seed используют Unsplash CDN URL напрямую — никакой загрузки не требуется

**Важно для Next.js Image:**
Изображения с внешних URL (Unsplash, Yandex Object Storage) рендерятся через `<Image unoptimized>` —
Next.js Image optimization (`/_next/image`) не применяется, т.к. VPS не может проксировать
запросы к внешним CDN из-за серверных ограничений.

---

## Известные особенности и их решения

### Конфликты портов

На сервере уже запущены другие приложения:

| Порт | Занят | Используем |
|---|---|---|
| 3000 | next-labus-app | Frontend → 3002 |
| 3001 | dev-next-labus-app | Grafana → 3003 |
| 6379 | системный Redis | Redis → 6380 |

Если понадобится добавить новое приложение — проверить свободные порты: `ss -tlnp`.

### Reviews API несоответствие

Backend возвращает `{ reviews: [], total, page, limit }`, frontend ожидает `{ items: [], meta: { page, limit, total } }`.
Исправлено нормализацией в `apps/frontend/src/services/reviews.ts` → функция `fetchListingReviews`.

### Запуск seed через ts-node в Docker

`npx pnpm prisma:seed` требует запуска из директории конкретного воркспейса.
Надёжный вариант — запуск через ts-node напрямую из `/monorepo/apps/backend/`:

```bash
docker compose exec backend sh -c \
  "cd /monorepo/apps/backend && node -e \"require('child_process').execSync('npx ts-node --transpile-only prisma/seed.ts', {stdio:'inherit'})\""
```

---

## Первый деплой с нуля (на новый сервер)

```bash
# 1. Установить Docker (если нет)
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER && newgrp docker

# 2. Проверить свободные порты
ss -tlnp | grep -E '3000|3001|3002|4001|6379|6380'

# 3. Клонировать репозиторий
mkdir -p /opt/milyi-dom
cd /opt/milyi-dom
git clone https://github.com/Linol-Hamelton/milyidom.git milyi-dom
cd milyi-dom/milyi-dom

# 4. Создать .env файлы (заполнить реальными значениями)
cp apps/backend/.env.example apps/backend/.env
nano apps/backend/.env

# Frontend .env.local
nano apps/frontend/.env.local
# NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
# NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# .env в корне monorepo (build args)
nano .env
# NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
# NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# 5. Проверить/настроить порты в docker-compose.yml под реалии сервера
# (изменить если нужно: '127.0.0.1:3002:3000', '127.0.0.1:6380:6379' и т.д.)

# 6. Первый запуск
docker compose up -d db redis typesense pgbouncer
sleep 20

# 7. Применить миграции
docker compose exec backend sh -c \
  "cd /monorepo/apps/backend && npx prisma migrate deploy"

# 8. Запустить всё
docker compose up -d

# 9. Проверить
docker compose ps
curl http://127.0.0.1:4001/api/health
curl -I http://127.0.0.1:3002

# 10. В FastPanel создать proxy-сайты:
#     milyidom.com     → http://127.0.0.1:3002  + Let's Encrypt SSL
#     api.milyidom.com → http://127.0.0.1:4001  + Let's Encrypt SSL
#     Добавить custom nginx для WebSocket + Stripe webhook

# 11. Добавить тестовые данные (опционально)
docker compose exec backend sh -c \
  "cd /monorepo/apps/backend && node -e \"require('child_process').execSync('npx ts-node --transpile-only prisma/seed.ts', {stdio:'inherit'})\""
```

---

## Чеклист проверки после деплоя

- [ ] `https://milyidom.com` открывается, SSL валиден
- [ ] `https://api.milyidom.com/api/health` → `{"status":"ok"}`
- [ ] Главная страница: блок "Идеи для путешествий" показывает карточки с изображениями
- [ ] Страница листинга `/listings/seed_spb_penthouse` открывается без ошибок
- [ ] Регистрация и вход работают
- [ ] Загрузка изображений хоста → файл появляется в Yandex Object Storage
- [ ] WebSocket (сообщения в реальном времени) работает
- [ ] `docker compose ps` — все контейнеры Up/Healthy

---

## Типичные проблемы

### 502 Bad Gateway

```bash
# Проверить что контейнер запущен и слушает нужный порт
docker compose ps
ss -tlnp | grep 3002   # frontend
ss -tlnp | grep 4001   # backend

# Перезагрузить nginx FastPanel
nginx -t && nginx -s reload
```

### Контейнеры не стартуют после перезагрузки сервера

```bash
# Убедиться что docker запускается автоматически
systemctl enable docker

# В docker-compose.yml все сервисы должны иметь: restart: unless-stopped
```

### Backend не стартует: "JWT_SECRET env variable is required in production"

```bash
grep JWT_SECRET /opt/milyi-dom/milyi-dom/apps/backend/.env
# Убедиться NODE_ENV=production и JWT_SECRET заполнен
```

### Образы Unsplash не загружаются

Это нормально при просмотре через headless браузер/бот.
В реальном браузере пользователей изображения загружаются напрямую с Unsplash CDN.
Причина: `unoptimized={true}` для внешних URL в `listing-card.tsx` — изображения
рендерятся на стороне браузера, не через сервер.

### PgBouncer: SCRAM authentication error

```bash
# AUTH_TYPE должен быть scram-sha-256
grep AUTH_TYPE /opt/milyi-dom/milyi-dom/docker-compose.yml
# Перезапустить pgbouncer
docker compose restart pgbouncer
```

---

*Дата обновления: 3 марта 2026 — отражает реальное состояние продакшн-сервера*
