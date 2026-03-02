# Милый Дом — Деплой на сервер с FastPanel

> Этот гайд для ситуации: на сервере уже работает **FastPanel**, есть другие сайты,
> и нужно добавить «Милый Дом» без риска сломать что-то существующее.

**Принцип:** FastPanel управляет Nginx и SSL — мы это не трогаем.
Docker запускает приложение на localhost-портах, FastPanel создаёт proxy-сайты к ним.

---

## Архитектура на сервере с FastPanel

```
Интернет
    │
    ▼
FastPanel Nginx (80/443) ← управляет FastPanel, трогать напрямую НЕЛЬЗЯ
    │
    ├─► proxy → 127.0.0.1:3000  ← milyi_dom_frontend (Docker)
    ├─► proxy → 127.0.0.1:4001  ← milyi_dom_backend  (Docker)
    └─► proxy → 127.0.0.1:3001  ← milyi_dom_grafana  (Docker, опционально)

Docker containers (слушают только на localhost — не доступны снаружи):
    milyi_dom_frontend :3000
    milyi_dom_backend  :4001
    milyi_dom_db       :5432  (только внутри docker-сети, наружу не выходит)
    milyi_dom_redis    :6379  (только внутри docker-сети)
    milyi_dom_typesense:8108  (только внутри docker-сети)
    milyi_dom_pgbouncer:5433  (только внутри docker-сети)
```

Другие сайты через FastPanel продолжают работать как обычно — конфликтов нет.

---

## Шаг 1. Установка Docker (если ещё нет)

SSH на сервер и выполнить:

```bash
# Проверить — возможно уже установлен
docker --version && docker compose version

# Если не установлен:
curl -fsSL https://get.docker.com | sh

# Добавить текущего пользователя в группу docker (чтобы не писать sudo)
usermod -aG docker $USER
newgrp docker   # применить без перезахода
```

> FastPanel не конфликтует с Docker. Они работают независимо на одном сервере.

---

## Шаг 2. Изменить docker-compose.yml — порты только на localhost

Это **ключевой момент безопасности**: Docker-контейнеры должны быть доступны
только с localhost, а не из интернета напрямую.

Откройте файл `milyi-dom/docker-compose.yml` и измените секции портов:

```yaml
  backend:
    # ... остальная конфигурация ...
    ports:
      - '127.0.0.1:4001:4001'   # ← было: '4001:4001'

  frontend:
    # ... остальная конфигурация ...
    ports:
      - '127.0.0.1:3000:3000'   # ← было: '3000:3000'

  grafana:
    # ... остальная конфигурация ...
    ports:
      - '127.0.0.1:3001:3000'   # ← было: '3001:3000'

  # prometheus — только внутренний, порт вообще убрать или оставить 127.0.0.1
  prometheus:
    ports:
      - '127.0.0.1:9090:9090'
```

> **Порты db, redis, typesense, pgbouncer — не публикуем вообще.** Они работают
> только внутри docker-сети и не нужны снаружи.

---

## Шаг 3. Загрузить проект на сервер

### Вариант A: через Git (рекомендуется для CI/CD)

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/your-org/milyi-dom.git milyi-dom
```

### Вариант B: через файловый менеджер FastPanel

1. В FastPanel → **Файловый менеджер** (или FTP/SFTP)
2. Загрузить архив в `/var/www/milyi-dom/`
3. Распаковать: `tar -xzf milyi-dom.tar.gz`

### Вариант C: через rsync с локальной машины

```bash
rsync -avz --exclude node_modules --exclude .next \
  d:/newhome/newhome/milyi-dom/ \
  user@your-server:/var/www/milyi-dom/
```

---

## Шаг 4. Настроить переменные окружения

```bash
cd /var/www/milyi-dom/milyi-dom

# Backend .env
cp apps/backend/.env.example apps/backend/.env
nano apps/backend/.env    # или vi, или редактировать через FastPanel File Manager
```

**Минимальный набор для apps/backend/.env:**

```env
NODE_ENV=production
PORT=4001

DATABASE_URL=postgresql://postgres:ЗАМЕНИТЕ_ПАРОЛЬ@pgbouncer:5432/milyi_dom?schema=public&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres:ЗАМЕНИТЕ_ПАРОЛЬ@db:5432/milyi_dom?schema=public

# Генерируйте командой: openssl rand -base64 48
JWT_SECRET=сюда_вставить_длинную_случайную_строку_минимум_48_символов
JWT_REFRESH_SECRET=другая_длинная_случайная_строка_минимум_48_символов
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

ALLOWED_ORIGINS=https://milyidom.com,https://www.milyidom.com
FRONTEND_URL=https://milyidom.com

STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

REDIS_URL=redis://redis:6379

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_...

TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=замените_на_случайную_строку

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://api.milyidom.com/api/auth/google/callback

VK_CLIENT_ID=
VK_CLIENT_SECRET=
VK_CALLBACK_URL=https://api.milyidom.com/api/auth/vk/callback

S3_BUCKET=
S3_REGION=auto
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
CDN_BASE_URL=

ANTHROPIC_API_KEY=sk-ant-...
```

```bash
# Frontend .env.local
cp apps/frontend/.env.example apps/frontend/.env.local
nano apps/frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_FALLBACK_IMAGE_URL=/images/listing-1.jpg
```

```bash
# .env в корне (build args для docker-compose)
cat > /var/www/milyi-dom/milyi-dom/.env << 'EOF'
NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
GRAFANA_PASSWORD=ваш_пароль_grafana
EOF

# Права только для владельца
chmod 600 apps/backend/.env
chmod 600 apps/frontend/.env.local
chmod 600 .env
```

> **Генерация JWT секретов прямо в терминале:**
> ```bash
> openssl rand -base64 48   # запустите дважды — для JWT_SECRET и JWT_REFRESH_SECRET
> ```

---

## Шаг 5. Создать домены в FastPanel

### 5.1. Frontend (milyidom.com)

1. FastPanel → **Сайты** → **Создать сайт**
2. Домен: `milyidom.com` + `www.milyidom.com`
3. Тип: **Proxy** (или «Обратный прокси»)
4. Адрес прокси: `http://127.0.0.1:3000`
5. SSL: поставить галку **Let's Encrypt** → выпустить автоматически
6. **Сохранить**

### 5.2. Backend API (api.milyidom.com)

1. FastPanel → **Сайты** → **Создать сайт**
2. Домен: `api.milyidom.com`
3. Тип: **Proxy**
4. Адрес прокси: `http://127.0.0.1:4001`
5. SSL: **Let's Encrypt**
6. **Сохранить**

### 5.3. Добавить custom Nginx конфиг для WebSocket и Stripe webhook

FastPanel обычно позволяет добавить дополнительную конфигурацию Nginx через:
**Сайты → api.milyidom.com → Nginx конфигурация (custom / дополнительные директивы)**

Добавьте туда:

```nginx
# WebSocket поддержка (для Socket.io)
location /socket.io/ {
    proxy_pass http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400s;
}

# Stripe webhook — без буферизации тела запроса
location /api/payments/webhook {
    proxy_pass http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_request_buffering off;
}

# Размер загружаемых файлов (изображения объявлений до 10MB + запас)
client_max_body_size 15M;
```

> **Если FastPanel не показывает поле custom Nginx config:**
> Конфиги сайтов FastPanel обычно лежат в `/etc/nginx/sites-enabled/` или
> `/usr/local/fastpanel2/etc/nginx/`.
> Найдите конфиг вашего домена и добавьте блоки вручную, затем `nginx -t && nginx -s reload`.

### 5.4. Grafana (grafana.milyidom.com) — опционально

Аналогично, но proxy → `http://127.0.0.1:3001`.
Рекомендуется ограничить доступ по IP через FastPanel или в custom Nginx config:
```nginx
allow ВАШ_IP;
deny all;
```

---

## Шаг 6. Первый запуск: сборка и БД

```bash
cd /var/www/milyi-dom/milyi-dom

# Создать папку для изображений
mkdir -p images

# Собрать все образы (первый раз ~5-15 минут)
docker compose build

# Запустить только инфраструктуру (БД, Redis, Typesense)
docker compose up -d db redis typesense pgbouncer

# Подождать пока БД поднимется (~15 секунд)
sleep 15

# Применить все миграции
docker compose run --rm \
  -e DATABASE_URL="postgresql://postgres:ЗАМЕНИТЕ_ПАРОЛЬ@db:5432/milyi_dom?schema=public" \
  backend \
  sh -c "npx prisma migrate deploy"

# Запустить всё остальное
docker compose up -d

# Проверить статусы
docker compose ps
```

**Ожидаемый вывод `docker compose ps`:**
```
NAME                    STATUS
milyi_dom_db            Up (healthy)
milyi_dom_redis         Up (healthy)
milyi_dom_typesense     Up (healthy)
milyi_dom_pgbouncer     Up (healthy)
milyi_dom_backend       Up
milyi_dom_frontend      Up
milyi_dom_prometheus    Up
milyi_dom_grafana       Up
```

---

## Шаг 7. Проверка

```bash
# Backend отвечает
curl http://127.0.0.1:4001/api/health
# → {"status":"ok","timestamp":"..."}

# Frontend отвечает
curl -I http://127.0.0.1:3000
# → HTTP/1.1 200 OK

# Через домен (после того как DNS прописан и SSL выпущен)
curl https://api.milyidom.com/api/health
curl -I https://milyidom.com

# Логи при проблемах
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
```

---

## Шаг 8. Обновление (после изменений в коде)

```bash
cd /var/www/milyi-dom/milyi-dom

# Получить новую версию
git pull origin main

# Применить новые миграции (если есть)
docker compose run --rm \
  -e DATABASE_URL="postgresql://postgres:ПАРОЛЬ@db:5432/milyi_dom?schema=public" \
  backend sh -c "npx prisma migrate deploy"

# Пересобрать только изменившиеся сервисы
docker compose build backend frontend

# Перезапустить без остановки БД и Redis
docker compose up -d --no-deps backend frontend

# Очистить старые образы
docker system prune -f
```

---

## Типичные проблемы с FastPanel

### «502 Bad Gateway» после создания proxy-сайта

**Причина:** Docker-контейнер ещё не запущен или слушает не на том порту.

```bash
# Проверить что контейнер запущен
docker compose ps

# Проверить что порт слушается
ss -tlnp | grep 3000   # frontend
ss -tlnp | grep 4001   # backend

# Если порты есть — перезагрузить nginx FastPanel
nginx -t && nginx -s reload
# или через FastPanel UI: Сервисы → Nginx → Перезапустить
```

### FastPanel перезаписывает custom Nginx конфиг

FastPanel может перезаписывать конфиги сайтов при изменении настроек.
**Решение:** Используйте специальный `include`-файл который FastPanel не трогает:

```bash
# Создать файл с кастомными директивами
cat > /etc/nginx/conf.d/milyi-dom-websocket.conf << 'EOF'
# Этот файл не управляется FastPanel
# Кастомные директивы для api.milyidom.com
EOF
```

Или после каждого изменения в FastPanel — проверяйте custom блок через UI.

### SSL сертификат не выдаётся

```bash
# FastPanel выдаёт Let's Encrypt автоматически через веб-интерфейс
# Если не работает — проверить что DNS уже указывает на сервер:
dig milyidom.com +short
dig api.milyidom.com +short

# Порт 80 должен быть открыт (для валидации Let's Encrypt)
curl -I http://milyidom.com   # должен ответить, пусть даже 301/302
```

### Конфликт портов с другими сайтами FastPanel

Контейнеры слушают на `127.0.0.1:3000` и `127.0.0.1:4001`.
Конфликт возможен только если какой-то другой процесс уже занял эти порты.

```bash
ss -tlnp | grep -E '3000|4001'   # должно быть пусто до запуска Docker
```

Если занято — изменить порты в `docker-compose.yml`:
```yaml
ports:
  - '127.0.0.1:13000:3000'   # другой внешний порт
  - '127.0.0.1:14001:4001'
```
И обновить адрес прокси в FastPanel.

### Docker контейнеры не стартуют после перезагрузки сервера

```bash
# Добавить автозапуск docker (обычно уже включён)
systemctl enable docker

# Проверить политику restart в docker-compose.yml
# Все сервисы должны иметь: restart: unless-stopped
# Тогда при перезапуске сервера контейнеры поднимутся автоматически
```

---

## Итоговая схема действий (кратко)

```
1. SSH → установить Docker (если нет)
2. Загрузить проект в /var/www/milyi-dom/
3. Изменить порты в docker-compose.yml → '127.0.0.1:PORT:PORT'
4. Заполнить .env файлы (backend + frontend + корень)
5. docker compose build
6. docker compose up -d db redis typesense pgbouncer
7. Применить миграции (docker compose run ...)
8. docker compose up -d
9. В FastPanel: создать 2 proxy-сайта (frontend:3000, backend:4001) + SSL
10. Добавить custom Nginx config для WebSocket и Stripe webhook
11. Проверить curl и открыть в браузере
```

---

## Что делает FastPanel, что делает Docker

| Задача | Кто делает |
|--------|-----------|
| SSL сертификаты | **FastPanel** (автоматически Let's Encrypt) |
| Nginx reverse proxy | **FastPanel** (через UI создание сайтов) |
| Routing по доменам | **FastPanel** |
| WebSocket / Stripe конфиг | Custom Nginx блок в FastPanel |
| База данных PostgreSQL | **Docker** (отдельный контейнер) |
| Redis, Typesense | **Docker** |
| Backend (NestJS) | **Docker** |
| Frontend (Next.js) | **Docker** |
| Перезапуск при сбое | **Docker** (restart: unless-stopped) |
| Другие ваши сайты | **FastPanel** (не затронуты) |
