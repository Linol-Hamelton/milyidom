# Милый Дом — Эталонный гайд по деплою на сервер

> **Целевая среда:** Ubuntu 22.04 LTS / 24.04 LTS, VPS от 4 vCPU / 8 GB RAM / 80 GB SSD.
> Все команды выполняются от root или пользователя с `sudo`, если не указано иное.

---

## Оглавление

1. [Подготовка сервера](#1-подготовка-сервера)
2. [DNS и домен](#2-dns-и-домен)
3. [Docker и Docker Compose](#3-docker-и-docker-compose)
4. [SSL-сертификаты (Let's Encrypt)](#4-ssl-сертификаты-lets-encrypt)
5. [Nginx — обратный прокси](#5-nginx--обратный-прокси)
6. [Переменные окружения (production)](#6-переменные-окружения-production)
7. [Клонирование репозитория и первый запуск](#7-клонирование-репозитория-и-первый-запуск)
8. [Миграции базы данных](#8-миграции-базы-данных)
9. [Запуск всех сервисов](#9-запуск-всех-сервисов)
10. [Мониторинг: Prometheus + Grafana](#10-мониторинг-prometheus--grafana)
11. [CI/CD (GitHub Actions)](#11-cicd-github-actions)
12. [Обновление приложения (zero-downtime)](#12-обновление-приложения-zero-downtime)
13. [Резервное копирование](#13-резервное-копирование)
14. [Чеклист после деплоя](#14-чеклист-после-деплоя)
15. [Разбор частых проблем](#15-разбор-частых-проблем)

---

## 1. Подготовка сервера

```bash
# Обновляем систему
apt update && apt upgrade -y

# Минимальный набор утилит
apt install -y curl git ufw fail2ban unzip openssl htop

# Создаём непривилегированного пользователя
adduser deploy
usermod -aG sudo docker deploy   # docker добавим после установки

# Файрвол: только 22, 80, 443
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Защита SSH: отключаем вход по паролю
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl reload sshd

# fail2ban — защита от брутфорса
systemctl enable --now fail2ban
```

> **Важно:** перед отключением пароля убедитесь, что ваш SSH-ключ добавлен в `~deploy/.ssh/authorized_keys`.

---

## 2. DNS и домен

Пропишите A-записи у вашего регистратора (пример для `milyidom.com`):

| Тип | Имя           | Значение      | TTL  |
|-----|---------------|---------------|------|
| A   | `@`           | `<IP сервера>`| 300  |
| A   | `www`         | `<IP сервера>`| 300  |
| A   | `api`         | `<IP сервера>`| 300  |
| A   | `grafana`     | `<IP сервера>`| 300  |

Дождитесь распространения DNS (проверьте: `dig milyidom.com +short`).

---

## 3. Docker и Docker Compose

```bash
# Установка Docker Engine (официальный способ)
curl -fsSL https://get.docker.com | sh

# Добавляем пользователя deploy в группу docker
usermod -aG docker deploy

# Проверка
docker --version          # Docker 26.x.x
docker compose version    # Docker Compose v2.x.x
```

---

## 4. SSL-сертификаты (Let's Encrypt)

```bash
# Certbot через snap (рекомендуется для Ubuntu 22+)
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot

# Выпускаем wildcard-сертификат через DNS-challenge
# (или отдельные сертификаты через standalone)
certbot certonly --standalone \
  -d milyidom.com \
  -d www.milyidom.com \
  -d api.milyidom.com \
  -d grafana.milyidom.com \
  --agree-tos \
  --email admin@milyidom.com

# Certbot автоматически создаёт systemd-таймер для renewal
systemctl status certbot.timer

# Тест авторенewала
certbot renew --dry-run
```

Сертификаты сохранятся в `/etc/letsencrypt/live/milyidom.com/`.

---

## 5. Nginx — обратный прокси

```bash
apt install -y nginx
```

Создайте файл `/etc/nginx/sites-available/milyi-dom`:

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name milyidom.com www.milyidom.com api.milyidom.com grafana.milyidom.com;
    return 301 https://$host$request_uri;
}

# Frontend (Next.js)
server {
    listen 443 ssl http2;
    server_name milyidom.com www.milyidom.com;

    ssl_certificate     /etc/letsencrypt/live/milyidom.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/milyidom.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Загрузка файлов (если нужны большие изображения)
    client_max_body_size 15M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API (NestJS)
server {
    listen 443 ssl http2;
    server_name api.milyidom.com;

    ssl_certificate     /etc/letsencrypt/live/milyidom.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/milyidom.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transportation-Security "max-age=63072000; includeSubDomains; preload" always;

    client_max_body_size 15M;

    # Stripe webhook нужен raw body — не буферизуем
    location /api/payments/webhook {
        proxy_pass         http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
    }

    # WebSocket (Socket.io)
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }

    location / {
        proxy_pass         http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# Grafana (мониторинг — только с авторизацией)
server {
    listen 443 ssl http2;
    server_name grafana.milyidom.com;

    ssl_certificate     /etc/letsencrypt/live/milyidom.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/milyidom.com/privkey.pem;

    # Ограничить доступ только с доверенных IP (офис / VPN)
    # allow 1.2.3.4;
    # deny all;

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/milyi-dom /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 6. Переменные окружения (production)

### Backend: `/srv/milyi-dom/apps/backend/.env`

```bash
# Генерация секретов:
openssl rand -base64 48   # для JWT_SECRET
openssl rand -base64 48   # для JWT_REFRESH_SECRET
```

```env
NODE_ENV=production
PORT=4001

# ── База данных ──────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:STRONG_DB_PASS@pgbouncer:5432/milyi_dom?schema=public&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres:STRONG_DB_PASS@db:5432/milyi_dom?schema=public

# ── JWT (ОБЯЗАТЕЛЬНО заменить!) ──────────────────────────────────────────────
JWT_SECRET=<64+ случайных символов из openssl rand -base64 48>
JWT_REFRESH_SECRET=<другой набор 64+ символов>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=https://milyidom.com,https://www.milyidom.com
FRONTEND_URL=https://milyidom.com

# ── Stripe ───────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── Email (Yandex 360 / Яндекс Почта для домена) ─────────────────────────────
# SMTP_PASS = пароль приложения (Настройки → Безопасность → Пароли приложений)
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=587
SMTP_USER=noreply@milyidom.com
SMTP_PASS=<пароль приложения Яндекс>

# ── Typesense ─────────────────────────────────────────────────────────────────
TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=<сгенерировать: openssl rand -hex 32>

# ── OAuth: Google ─────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=https://api.milyidom.com/api/auth/google/callback

# ── OAuth: VK ─────────────────────────────────────────────────────────────────
VK_CLIENT_ID=12345678
VK_CLIENT_SECRET=abc123...
VK_CALLBACK_URL=https://api.milyidom.com/api/auth/vk/callback

# ── S3 / Cloudflare R2 ────────────────────────────────────────────────────────
S3_BUCKET=milyi-dom-images
S3_REGION=auto
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<R2 Access Key>
S3_SECRET_ACCESS_KEY=<R2 Secret Key>
CDN_BASE_URL=https://cdn.milyidom.com

# ── Anthropic AI ──────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── Sentry ────────────────────────────────────────────────────────────────────
SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
```

### Frontend: `/srv/milyi-dom/apps/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=<UUID ключ из developer.tech.yandex.ru>
NEXT_PUBLIC_FALLBACK_IMAGE_URL=/images/listing-1.jpg
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
```

### Docker Compose override: `/srv/milyi-dom/.env`

```env
# Пробрасываются как build args в docker-compose.yml
NEXT_PUBLIC_API_URL=https://api.milyidom.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=<UUID ключ из developer.tech.yandex.ru>
GRAFANA_PASSWORD=<сильный пароль для Grafana>
```

> **Права доступа к файлам .env:**
> ```bash
> chmod 600 /srv/milyi-dom/apps/backend/.env
> chmod 600 /srv/milyi-dom/apps/frontend/.env.local
> chmod 600 /srv/milyi-dom/.env
> ```

---

## 7. Клонирование репозитория и первый запуск

```bash
# Клонируем (или transfer через rsync/scp)
mkdir -p /srv
cd /srv
git clone https://github.com/your-org/milyi-dom.git milyi-dom
cd milyi-dom/milyi-dom

# Копируем и заполняем env-файлы (из секции 6)
cp apps/backend/.env.example apps/backend/.env
nano apps/backend/.env   # заполнить реальными значениями

cp apps/frontend/.env.example apps/frontend/.env.local
nano apps/frontend/.env.local

# Создаём папку для изображений
mkdir -p images
chown 1001:1001 images   # nextjs user в контейнере
```

---

## 8. Миграции базы данных

Миграции применяются **до** запуска backend, в отдельном одноразовом контейнере, напрямую к PostgreSQL (минуя PgBouncer):

```bash
cd /srv/milyi-dom/milyi-dom

# Применяем все миграции через DIRECT_DATABASE_URL
docker compose run --rm \
  -e DATABASE_URL="postgresql://postgres:STRONG_DB_PASS@db:5432/milyi_dom?schema=public" \
  backend \
  sh -c "npx prisma migrate deploy"
```

> **Если применяете вручную (rare case):**
> ```bash
> # Войти в контейнер db
> docker compose exec db psql -U postgres milyi_dom
> # Выполнить SQL из migrations/*.sql
> \i /path/to/migration.sql
> -- Добавить запись в таблицу миграций:
> INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
>   VALUES (gen_random_uuid(), 'manual', NOW(), '20260228000001_password_changed_at', NULL, NULL, NOW(), 1);
> ```

---

## 9. Запуск всех сервисов

```bash
cd /srv/milyi-dom/milyi-dom

# Сборка и запуск (первый раз ~5-10 минут)
docker compose up -d --build

# Проверяем статус
docker compose ps

# Ожидаемый вывод:
# NAME                    STATUS           PORTS
# milyi_dom_db            Up (healthy)     5432/tcp
# milyi_dom_redis         Up (healthy)     6379/tcp
# milyi_dom_typesense     Up (healthy)     8108/tcp
# milyi_dom_pgbouncer     Up (healthy)     0.0.0.0:5433->5432/tcp
# milyi_dom_backend       Up               0.0.0.0:4001->4001/tcp
# milyi_dom_frontend      Up               0.0.0.0:3000->3000/tcp
# milyi_dom_prometheus    Up               0.0.0.0:9090->9090/tcp
# milyi_dom_grafana       Up               0.0.0.0:3001->3000/tcp

# Логи backend
docker compose logs -f backend

# Логи frontend
docker compose logs -f frontend
```

---

## 10. Мониторинг: Prometheus + Grafana

### Prometheus

Файл `prometheus.yml` уже находится в репозитории. Метрики собираются с backend по пути `/api/metrics` (защищён JWT + ADMIN-ролью).

Для Prometheus без авторизации добавьте отдельный внутренний endpoint, или настройте `bearer_token` в `prometheus.yml`:

```yaml
# prometheus.yml — добавить bearer_token для скрапинга
scrape_configs:
  - job_name: 'milyi-dom-backend'
    static_configs:
      - targets: ['backend:4001']
    metrics_path: '/api/metrics'
    bearer_token: '<ADMIN_JWT_TOKEN>'
```

Для продакшена лучше добавить отдельный `/metrics` endpoint без авторизации, доступный только из internal docker network (не публичный):

```bash
# В docker-compose.yml убрать публикацию портов prometheus/grafana наружу:
# ports: (убрать или заменить на expose)
#   - '9090:9090'  → просто expose: [9090]
```

### Grafana

1. Откройте `https://grafana.milyidom.com`
2. Войдите: `admin` / `<GRAFANA_PASSWORD из .env>`
3. Добавьте Data Source → Prometheus → URL: `http://prometheus:9090`
4. Импортируйте дашборд Node.js (ID: 11159) и NestJS (ID: 18084)

**Обязательно смените дефолтный пароль Grafana в `.env`!**

---

## 11. CI/CD (GitHub Actions)

В репозитории уже есть `.github/workflows/ci.yml` (lint + typecheck + build) и `deploy.yml`.

Добавьте следующие секреты в GitHub → Settings → Secrets → Actions:

| Secret                    | Значение                                   |
|---------------------------|--------------------------------------------|
| `DEPLOY_HOST`             | IP вашего сервера                          |
| `DEPLOY_USER`             | `deploy`                                   |
| `DEPLOY_SSH_KEY`          | Приватный SSH-ключ (PEM формат)            |
| `DEPLOY_PATH`             | `/srv/milyi-dom/milyi-dom`                 |
| `NEXT_PUBLIC_API_URL`     | `https://api.milyidom.com/api`             |
| `NEXT_PUBLIC_STRIPE_KEY`  | `pk_live_...`                              |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | UUID ключ из developer.tech.yandex.ru  |
| `GRAFANA_PASSWORD`        | Пароль от Grafana                          |

Пример `deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd ${{ secrets.DEPLOY_PATH }}
            git pull origin main
            docker compose build --no-cache frontend backend
            docker compose up -d --no-deps frontend backend
            docker compose exec -T backend sh -c "npx prisma migrate deploy"
            docker system prune -f
```

---

## 12. Обновление приложения (zero-downtime)

```bash
cd /srv/milyi-dom/milyi-dom

# 1. Pull новой версии кода
git pull origin main

# 2. Применить новые миграции (если есть)
docker compose run --rm \
  -e DATABASE_URL="postgresql://postgres:PASS@db:5432/milyi_dom?schema=public" \
  backend sh -c "npx prisma migrate deploy"

# 3. Пересобрать и перезапустить только backend и frontend
#    (db, redis, typesense продолжают работать)
docker compose build backend frontend
docker compose up -d --no-deps --build backend frontend

# 4. Убрать старые слои Docker
docker system prune -f --volumes=false
```

> Zero-downtime достигается тем, что `--no-deps` не перезапускает БД/Redis.
> Для полноценного blue-green деплоя используйте Traefik или Kubernetes.

---

## 13. Резервное копирование

### PostgreSQL (ежедневно в 3:00 UTC)

```bash
# Создаём скрипт бэкапа
cat > /usr/local/bin/backup-milyi-dom.sh << 'EOF'
#!/bin/bash
set -e
BACKUP_DIR=/var/backups/milyi-dom
DATE=$(date +%Y-%m-%d_%H-%M)
mkdir -p "$BACKUP_DIR"

# Dump базы данных
docker exec milyi_dom_db pg_dump -U postgres milyi_dom \
  | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Архив загруженных изображений (если используется local storage)
tar -czf "$BACKUP_DIR/images_$DATE.tar.gz" \
  /srv/milyi-dom/milyi-dom/images/

# Удалить бэкапы старше 30 дней
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
EOF
chmod +x /usr/local/bin/backup-milyi-dom.sh

# Cron job
echo "0 3 * * * root /usr/local/bin/backup-milyi-dom.sh >> /var/log/milyi-dom-backup.log 2>&1" \
  > /etc/cron.d/milyi-dom-backup
```

### Удалённый бэкап на S3/R2

```bash
# Установить rclone и настроить remote "r2"
curl https://rclone.org/install.sh | bash
rclone config  # добавить Cloudflare R2

# Добавить в скрипт бэкапа:
rclone copy "$BACKUP_DIR/db_$DATE.sql.gz" r2:milyi-dom-backups/db/
rclone copy "$BACKUP_DIR/images_$DATE.tar.gz" r2:milyi-dom-backups/images/
```

---

## 14. Чеклист после деплоя

### Обязательные проверки

- [ ] `https://milyidom.com` открывается, сертификат валиден (🔒 в браузере)
- [ ] `https://api.milyidom.com/api/health` возвращает `{"status":"ok"}`
- [ ] Регистрация нового пользователя работает, приходит письмо верификации
- [ ] Вход через email/пароль работает
- [ ] Вход через Google OAuth работает (callback URL прописан в Google Console)
- [ ] Вход через VK OAuth работает
- [ ] Создание объявления с загрузкой фото работает
- [ ] Поиск и фильтрация работают
- [ ] Карта объявлений (Яндекс Карты) отображается
- [ ] Бронирование работает end-to-end (Stripe тестовая карта `4242 4242 4242 4242`)
- [ ] WebSocket (real-time сообщения) работает (открыть /messages в двух вкладках)
- [ ] Сброс пароля работает (прийти письмо, ссылка работает)
- [ ] Повторное использование ссылки сброса пароля отклоняется
- [ ] Профиль: экспорт данных (GDPR) работает
- [ ] Профиль: удаление аккаунта работает
- [ ] Панель администратора `/admin` доступна только для ADMIN-роли
- [ ] Webhook от Stripe обрабатывается (`stripe trigger payment_intent.succeeded`)
- [ ] Grafana открывается по `https://grafana.milyidom.com`
- [ ] Метрики в Grafana обновляются

### Безопасность

- [ ] `JWT_SECRET` и `JWT_REFRESH_SECRET` — минимум 48 символов, уникальны
- [ ] Дефолтный пароль Grafana изменён
- [ ] Дефолтный пароль PostgreSQL `postgres` изменён в `.env`
- [ ] Порты 5432, 5433, 6379, 8108, 9090 **не доступны** снаружи (ufw + docker network)
- [ ] `.env` файлы не добавлены в git (`.gitignore` уже настроен)
- [ ] Stripe используется в live-режиме (`sk_live_`, `pk_live_`)
- [ ] Typesense API key изменён с дефолтного `milyi-dom-typesense-dev-key`
- [ ] fail2ban активен: `fail2ban-client status sshd`

### Производительность

- [ ] `docker stats` — нет контейнеров с памятью > 80% лимита
- [ ] `docker compose logs backend | grep -i error` — нет критических ошибок
- [ ] Ответ API `/api/listings` < 500ms (проверить в Network tab)
- [ ] Lighthouse score > 80 на главной странице

---

## 15. Разбор частых проблем

### Backend не стартует: "JWT_SECRET env variable is required in production"

```bash
# Проверить, что .env заполнен
grep JWT_SECRET /srv/milyi-dom/milyi-dom/apps/backend/.env
# Убедиться, что NODE_ENV=production
```

### PgBouncer: "SCRAM authentication requires libpq version 10+"

```bash
# Убедиться, что AUTH_TYPE=scram-sha-256 в docker-compose.yml
# И PostgreSQL использует scram-sha-256 в pg_hba.conf
docker exec milyi_dom_db psql -U postgres -c "SHOW hba_file;"
docker exec milyi_dom_db cat /var/lib/postgresql/data/pg_hba.conf
```

### Frontend: карта не отображается (белый квадрат)

```bash
# Проверить переменную Yandex Maps в сборке
docker inspect milyi_dom_frontend | grep YANDEX
# Пересобрать с правильным ключом:
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=<key> docker compose build --no-cache frontend
docker compose up -d --no-deps frontend
```

### WebSocket не подключается в production

```bash
# Проверить nginx конфиг для /socket.io/
# Убедиться, что ALLOWED_ORIGINS содержит https://milyidom.com
grep ALLOWED_ORIGINS /srv/milyi-dom/milyi-dom/apps/backend/.env

# Проверить логи
docker compose logs backend | grep -i "socket\|gateway\|cors"
```

### Stripe webhook ошибка 400

```bash
# Webhook secret должен совпадать с тем, что в Stripe Dashboard
# Убедиться, что endpoint: https://api.milyidom.com/api/payments/webhook
# Убедиться, что Nginx не буферизует тело запроса (proxy_request_buffering off)
curl -X POST https://api.milyidom.com/api/payments/webhook \
  -H "content-type: application/json" \
  -d '{}' -v
```

### Typesense — поиск не работает (empty results)

```bash
# Переиндексировать объявления после первого деплоя
docker compose exec backend \
  node -e "require('./dist/search/search.service').reindexAll()"
# Или через API admin endpoint (если реализован)
```

### Миграция не применилась

```bash
# Посмотреть историю миграций
docker compose exec db psql -U postgres milyi_dom \
  -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;"

# Применить вручную
docker compose run --rm backend \
  sh -c "DATABASE_URL=postgresql://postgres:PASS@db:5432/milyi_dom npx prisma migrate deploy"
```

---

## Итоговая архитектура production

```
Internet
    │
    ▼
Nginx (80/443) ── SSL termination, reverse proxy
    │
    ├─► :3000 ── milyi_dom_frontend (Next.js standalone)
    │
    └─► :4001 ── milyi_dom_backend (NestJS)
                     │
                     ├─► :5433 ── milyi_dom_pgbouncer ──► :5432 milyi_dom_db (PostgreSQL + PostGIS)
                     ├─► :6379 ── milyi_dom_redis
                     └─► :8108 ── milyi_dom_typesense

Monitoring (internal only):
    milyi_dom_prometheus :9090 ◄── scrapes backend :4001/api/metrics
    milyi_dom_grafana    :3001 ◄── reads from prometheus

External services:
    Stripe API ──────────────── payments & payouts
    Cloudflare R2 ───────────── image storage + CDN
    Resend/SMTP ─────────────── transactional email
    Google/VK OAuth ─────────── social login
    Anthropic API ───────────── AI search & review summaries
    Yandex Maps JS API ──────── interactive maps
    Sentry ──────────────────── error tracking
```

---

**Дата составления:** 28 февраля 2026
**Версия:** Sprint 18 + Security Audit Pass
