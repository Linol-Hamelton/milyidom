# ARCHITECTURE.md — Техническая архитектура Милый Дом

**Версия:** 2.0 (актуальное состояние)
**Дата:** 26 февраля 2026
**Статус:** Живой документ — обновляется с каждой фазой

---

## 1. ОБЗОР СИСТЕМЫ

### 1.1 Текущая архитектура (v2 — ~72% complete)

```
Internet / Browser
        │
        ▼
┌─────────────────────────────────────┐
│     Next.js 15 + App Router         │
│     Tailwind CSS + SWR + Zustand    │
│     Port: 3000 (Docker)             │
│     PWA: manifest.json + sw.js      │
└──────────────┬──────────────────────┘
               │ HTTP REST + WebSocket
               ▼
┌─────────────────────────────────────┐
│      NestJS 11 API Server           │
│  22 modules, Prefix: /api           │
│  Port: 4001 (Docker)                │
│  Socket.io Gateway (real-time)      │
└──┬───────────┬──────────────────────┘
   │           │
   ▼           ▼
┌──────┐  ┌──────────────────────────┐
│Redis │  │  PgBouncer (Port 5433)   │
│:6379 │  │  Transaction pooling     │
│BullMQ│  │  25 connections          │
│Queue │  └────────────┬─────────────┘
└──────┘               │
                       ▼
              ┌─────────────────────┐
              │ PostgreSQL 16       │
              │ PostGIS 3.4         │
              │ Port: 5432          │
              │ 17 models           │
              └─────────────────────┘

Monitoring:
┌────────────────────────────────┐
│ Prometheus (Port: 9090)        │
│ Grafana    (Port: 3001)        │
│ Sentry     (frontend+backend)  │
└────────────────────────────────┘

Search:
┌────────────────────────────────┐
│ Typesense 26 (Port: 8108)      │
│ Full-text + facets + geo       │
│ AI: Claude Haiku (Anthropic)   │
└────────────────────────────────┘

Mobile:
┌────────────────────────────────┐
│ Expo SDK 52 (React Native)     │
│ iOS + Android                  │
│ Push: expo-notifications       │
└────────────────────────────────┘
```

### 1.2 Целевая архитектура v3 (Фаза 3, месяц 13-18)

```
Internet
    │
    ▼
Cloudflare (CDN + WAF + DDoS Protection + R2 Storage)
    │
    ▼
Nginx / Traefik Load Balancer (SSL termination, rate limiting)
    │
    ├──► Next.js 15 (3 replicas, Kubernetes)
    │
    └──► NestJS 11 API (5+ replicas, Kubernetes HPA)
              │
              ├──► PostgreSQL 16 + PostGIS (Primary + 2 Read Replicas)
              │
              ├──► Redis 7 Cluster (3 nodes: Cache + Sessions + Queues)
              │
              ├──► Typesense Cluster (Full-text + AI Search)
              │
              ├──► BullMQ Workers (Email, Notifications, Payments)
              │
              └──► Socket.io Cluster (Real-time: Chat + Notifications)

Storage:
    ├──► Cloudflare R2 / AWS S3 + CloudFront (Images, Documents)
    └──► ClickHouse (Analytics — миллиарды событий)

Monitoring:
    ├──► Prometheus + Grafana + Alertmanager
    ├──► Jaeger (Distributed Tracing)
    ├──► Sentry (Errors: frontend + backend)
    └──► ELK Stack (Logs)
```

---

## 2. BACKEND ARCHITECTURE

### 2.1 Структура NestJS модулей (актуальная)

```
src/
├── main.ts                    # Bootstrap, helmet, throttler, CORS, validation
├── instrument.ts              # Sentry instrumentation (загружается первым)
├── app.module.ts              # Root module (импортирует все модули)
├── config/
│   └── configuration.ts      # Typed env config (все переменные среды)
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts  # JWT verification
│   │   └── roles.guard.ts     # RBAC enforcement
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── public.decorator.ts
│   └── dto/
│       └── pagination.dto.ts
├── prisma/
│   └── prisma.service.ts      # DB connection management
│
├── auth/                      # Аутентификация
│   ├── auth.controller.ts     # login, register, refresh, password, OAuth, 2FA
│   ├── auth.service.ts        # bcrypt, JWT, tokens
│   ├── two-factor.service.ts  # TOTP (otplib), QR code setup
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── google.strategy.ts # OAuth Google (passport-google-oauth20)
│   │   └── vk.strategy.ts     # OAuth VK (passport-vkontakte)
│   └── guards/
│       ├── google-auth.guard.ts
│       └── vk-auth.guard.ts
│
├── users/                     # Управление пользователями
├── listings/                  # Объявления (CRUD, поиск, фото, геолокация)
├── bookings/                  # Бронирования + conflict detection
├── payments/                  # Stripe payment intent, Connect, webhook
├── reviews/                   # Отзывы + AI summary
├── messages/                  # Чат (Conversation + Message)
├── notifications/             # Центр уведомлений
├── favorites/                 # Избранное
│
├── email/                     # Email сервис (Nodemailer, SMTP, HTML шаблоны RU)
├── queue/                     # BullMQ очереди
│   ├── email-queue.service.ts # Fire-and-forget email (3 retries, exp backoff)
│   ├── email.processor.ts     # BullMQ worker
│   └── queue.module.ts
│
├── gateway/                   # WebSocket (Socket.io)
│   ├── app.gateway.ts         # JWT auth on connect, personal rooms user:${id}
│   ├── gateway.types.ts       # WS_EVENT constants
│   └── gateway.module.ts
│
├── search/                    # Typesense full-text поиск
│   ├── search.service.ts      # Auto-index + search API
│   ├── search.controller.ts   # GET /search/listings
│   └── search.module.ts
│
├── ai-search/                 # AI-powered поиск (Claude Haiku)
│   ├── ai-search.service.ts   # interpret(), generateReviewSummary(), detectFraud()
│   ├── ai-search.controller.ts
│   └── ai-search.module.ts
│
├── analytics/                 # Аналитика для хостов
│   ├── analytics.service.ts   # 12-мес. выручка, occupancy, per-listing stats
│   ├── analytics.controller.ts# GET /analytics/host, /analytics/admin
│   └── analytics.module.ts
│
├── ical/                      # iCal синхронизация
│   ├── ical.service.ts        # export feed, import external, block dates
│   ├── ical.controller.ts     # GET /ical/feed/:token, POST /ical/sync/:id
│   └── ical.module.ts
│
├── audit/                     # Audit log
│   ├── audit.service.ts       # Запись в AuditLog (immutable)
│   ├── audit.interceptor.ts   # @Audit() декоратор
│   └── audit.module.ts
│
├── metrics/                   # Prometheus метрики
│   ├── metrics.service.ts     # prom-client counters, histograms
│   └── metrics.controller.ts  # GET /api/metrics (prometheus scrape)
│
└── loyalty/                   # Программа лояльности
    ├── loyalty.service.ts     # Earn/redeem points, tier management
    └── loyalty.module.ts
```

### 2.2 Текущие известные проблемы архитектуры

#### Проблема 1: Нет Response DTOs (утечка внутренней структуры)
**Текущее состояние:** API возвращает Prisma модели напрямую.
**Проблема:** Изменение схемы БД ломает API контракт. Чувствительные поля (password hash, 2FA secret) могут утекать.
**Решение (следующий спринт):** Добавить Response DTOs + ClassSerializerInterceptor + @Exclude() декораторы.

#### Проблема 2: Нет Redis кеширования на уровне GET запросов
**Текущее состояние:** Redis используется только для BullMQ очередей. GET /listings → всегда в PostgreSQL.
**Решение:** Добавить CacheInterceptor с Redis + умная инвалидация.

```typescript
// Целевой подход:
@UseInterceptors(CacheInterceptor)
@CacheTTL(300) // 5 минут для деталей объявления
async findOne(id: string) { ... }

// Инвалидация при обновлении:
await this.cacheManager.del(`listing:${id}`);
await this.cacheManager.del('listings:featured');
```

#### Проблема 3: N+1 запросы в listings.service
**Текущее состояние:** Некоторые запросы подгружают связанные данные неэффективно.
**Решение:** Добавить covering indexes + оптимизировать include в Prisma запросах.

#### Проблема 4: Отсутствует Global Exception Filter
**Текущее состояние:** NestJS дефолтный error handling.
**Решение:**

```typescript
// Целевой формат ошибки:
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Validation failed",
  "details": [...],
  "requestId": "uuid",
  "timestamp": "ISO8601"
}
```

---

## 3. БАЗА ДАННЫХ

### 3.1 Схема (актуальная, 17 моделей)

```
User ──────── Profile (1:1)
     ──────── Listing[] (1:N, как хост)
     ──────── Booking[] (1:N, как гость)
     ──────── Favorite[] (M:N через Favorite)
     ──────── Review[] (1:N, как автор)
     ──────── Message[] (1:N, отправитель + получатель)
     ──────── Notification[] (1:N)
     ──────── LoyaltyAccount (1:1)
     ──────── Conversation[] (как хост + как гость)

Listing ───── PropertyImage[] (1:N)
        ───── ListingAmenity[] → Amenity (M:N)
        ───── Booking[] (1:N)
        ───── Review[] (1:N)
        ───── Favorite[] (1:N)
        ───── Conversation[] (1:N)
        ───── BlockedDate[] (1:N — iCal + manual blocks)

Booking ───── Payment (1:1)
        ───── Review (1:1)

LoyaltyAccount ─── LoyaltyTransaction[] (1:N)

AuditLog ── standalone (immutable, никогда не удалять)
```

### 3.2 Ключевые индексы

```sql
-- Листинги: статус + featured для главной страницы
@@index([status, featured])
@@index([city])
@@index([country])

-- PostGIS пространственный индекс на location (GIST)
-- Создаётся миграцией 20260226000002_phase2_ical

-- Уведомления: быстрый поиск непрочитанных
@@index([userId, readAt])

-- Аудит лог: поиск по разным осям
@@index([userId])
@@index([action])
@@index([createdAt])
@@index([resourceType, resourceId])

-- Блокировки дат: быстрая проверка доступности
@@index([listingId, date])

-- Лояльность: история транзакций
@@index([accountId, createdAt])
```

### 3.3 Connection Pooling (PgBouncer)

```
Режим: transaction (совместимо с serverless и short-lived connections)
Max client connections: 200
Default pool size: 25
Reserve pool: 5
Auth type: scram-sha-256 (PostgreSQL 16 default)

DATABASE_URL  → pgbouncer:5432  (для app queries через пул)
DIRECT_URL    → db:5432         (для Prisma migrations — минует пул)
```

---

## 4. FRONTEND ARCHITECTURE

### 4.1 Структура Next.js App Router

```
src/app/
├── layout.tsx                 # Root layout (PWA meta, fonts, providers)
├── page.tsx                   # Главная страница
├── globals.css
├── auth/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── oauth-callback/page.tsx # OAuth токен → localStorage
├── listings/
│   ├── page.tsx               # Map-first поиск (3 режима: list/map/split)
│   └── [id]/page.tsx          # Детальная страница + бронирование
├── bookings/
│   └── [id]/page.tsx
├── payments/
│   ├── [bookingId]/page.tsx   # Stripe Elements checkout
│   └── success/page.tsx       # Confirmation
├── host/
│   └── dashboard/page.tsx     # Analytics + iCal + listing management
├── profile/page.tsx
├── messages/page.tsx
├── notifications/page.tsx
├── favorites/page.tsx
├── admin/                     # ❌ Не реализована
└── offline/page.tsx           # PWA offline fallback

src/components/
├── listings/
│   ├── listing-card.tsx       # Card с skeleton
│   ├── booking-panel.tsx      # Виджет бронирования (sticky)
│   └── listings-map.tsx       # MapBox GL (dynamic import)
├── reviews/
│   └── reviews-section.tsx    # Список отзывов + AI summary
├── host/
│   └── ical-sync.tsx          # iCal feed + sync URL управление
└── ui/
    ├── ai-search-bar.tsx      # AI поиск (natural language)
    ├── notification-bell.tsx  # Live badge (WebSocket)
    ├── revenue-chart.tsx      # SVG bar chart (12 мес.)
    ├── two-factor-setup.tsx   # TOTP QR + token form
    └── service-worker-registrar.tsx
```

### 4.2 Состояние и запросы данных

```typescript
// Глобальное состояние: Zustand (auth store)
useAuthStore → { user, token, refreshToken, login(), logout() }

// Серверные данные: SWR (stale-while-revalidate)
useSWR('/api/listings', fetcher)
useSWR(`/api/listings/${id}`, fetcher)

// Real-time: Socket.io (singleton)
useSocket() → { socket, connected }
socket.on(WS_EVENTS.NOTIFICATION_NEW, handler)
socket.on(WS_EVENTS.MESSAGE_NEW, handler)
```

### 4.3 PWA конфигурация

```
public/manifest.json  → app name, icons, theme_color, display: standalone
public/sw.js          → Cache-first для статики, Network-first для навигации
                       → Push notification handler
app/offline/page.tsx  → Кастомная offline страница
```

---

## 5. МОБИЛЬНОЕ ПРИЛОЖЕНИЕ (Expo SDK 52)

### 5.1 Структура

```
apps/mobile/
├── app/
│   ├── _layout.tsx            # Root stack (auth check)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Tab navigator
│   │   ├── index.tsx          # Главная (featured listings)
│   │   ├── search.tsx         # Поиск
│   │   ├── bookings.tsx       # Мои бронирования
│   │   └── profile.tsx        # Профиль
│   ├── listing/[id].tsx       # Детальная страница
│   └── booking/[id].tsx       # Создание бронирования
├── src/
│   ├── services/
│   │   ├── api.ts             # Axios + token refresh interceptor
│   │   ├── listings.ts        # Listing типы и запросы
│   │   ├── bookings.ts
│   │   ├── auth.ts
│   │   └── notifications.ts   # Push token registration
│   ├── store/
│   │   └── auth.store.ts      # Zustand + AsyncStorage
│   └── components/
│       └── ListingCard.tsx    # Reusable listing card
└── constants/
    └── Colors.ts
```

---

## 6. ИНФРАСТРУКТУРА И DEVOPS

### 6.1 Docker Compose (текущий — dev/staging)

| Сервис | Image | Port | Статус |
|--------|-------|------|--------|
| db | postgis/postgis:16-3.4 | 5432 | ✅ |
| redis | redis:7-alpine | 6379 | ✅ (healthy) |
| typesense | typesense/typesense:26.0 | 8108 | ✅ (healthy) |
| pgbouncer | edoburu/pgbouncer:latest | 5433 | ✅ (healthy) |
| backend | milyi-dom-backend | 4001 | ✅ |
| frontend | milyi-dom-frontend | 3000 | ✅ |
| prometheus | prom/prometheus:v2.52.0 | 9090 | ✅ |
| grafana | grafana/grafana:11.0.0 | 3001 | ✅ |

### 6.2 CI/CD Pipeline (GitHub Actions)

```
.github/workflows/
├── ci.yml      # При каждом PR: lint → typecheck → test → build (параллельно)
└── deploy.yml  # При merge в main: build Docker → push → deploy staging → prod
```

### 6.3 Переменные среды (обязательные)

**Backend (.env):**
```
DATABASE_URL        → через PgBouncer
DIRECT_DATABASE_URL → напрямую к PostgreSQL (для migrations)
JWT_SECRET          → min 32 chars
JWT_REFRESH_SECRET  → min 32 chars
REDIS_URL           → redis://redis:6379
TYPESENSE_HOST/PORT/API_KEY
GOOGLE_CLIENT_ID/SECRET → placeholder для dev
VK_CLIENT_ID/SECRET     → placeholder для dev
STRIPE_SECRET_KEY       → sk_test_... или sk_live_...
SMTP_HOST/PORT/USER/PASS → Resend или другой SMTP
ANTHROPIC_API_KEY        → для AI Search + Review Summary
SENTRY_DSN              → для error tracking
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL              → http://localhost:4001/api
NEXT_PUBLIC_WS_URL               → http://localhost:4001
NEXT_PUBLIC_MAPBOX_TOKEN         → обязателен для карты
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → pk_test_...
NEXT_PUBLIC_SENTRY_DSN
```

---

## 7. БЕЗОПАСНОСТЬ

### 7.1 Реализованные меры (актуально)

| Мера | Статус | Детали |
|------|--------|--------|
| IDOR защита | ✅ | Ownership checks в listings + bookings |
| Stripe webhook HMAC | ✅ | constructEvent() верификация |
| Rate limiting | ✅ | @nestjs/throttler, 100 req/min |
| Helmet.js | ✅ | HTTP security headers |
| CORS | ✅ | Из env ALLOWED_ORIGINS |
| Input validation | ✅ | class-validator + whitelist + forbidNonWhitelisted |
| File upload | ✅ | MIME type + size validation |
| bcrypt | ✅ | cost=12 |
| JWT | ✅ | Access 15min + Refresh 7 days |
| 2FA (TOTP) | ✅ | otplib, QR setup |
| OAuth | ✅ | Google + VK |
| Audit Log | ✅ | Immutable записи критических событий |
| Self-booking prevention | ✅ | Хост не может бронировать свои объявления |

### 7.2 Незакрытые уязвимости (следующий спринт)

| Уязвимость | Серьёзность | Решение |
|-----------|-------------|---------|
| PII не зашифрованы в БД | 🟠 Высокая | AES-256 field encryption |
| Нет GDPR права на удаление | 🟠 Высокая | /users/me DELETE endpoint |
| JWT не ротируются | 🟡 Средняя | Автоматическая ротация secrets |
| Нет WAF | 🟠 Высокая | Cloudflare |
| Response DTOs отсутствуют | 🟡 Средняя | @Exclude() на чувствительных полях |
| Нет CVE scanning | 🟡 Средняя | Snyk/Trivy в CI |

---

## 8. ПРОИЗВОДИТЕЛЬНОСТЬ

### 8.1 Текущие оптимизации

- **PgBouncer** — connection pooling, transaction mode, 25 connections
- **Typesense** — full-text поиск без нагрузки на PostgreSQL
- **Redis/BullMQ** — асинхронная обработка email/уведомлений
- **Next.js Standalone** — минимальный production bundle
- **PostGIS** — индексированные геопространственные запросы

### 8.2 Планируемые оптимизации

- **Redis cache** — GET /listings/:id TTL 5 мин
- **N+1 elimination** — select specific fields + covering indexes
- **Image optimization** — WebP/AVIF + Cloudflare Image Resizing
- **GraphQL** — для сложных запросов с гибкими проекциями
- **Kubernetes HPA** — auto-scaling при пиковых нагрузках

---

## 9. ADR (Architecture Decision Records)

### ADR-001: pnpm Workspaces (монорепо)
**Дата:** Февраль 2026
**Статус:** Принято
**Контекст:** Нужно единое управление зависимостями для backend + frontend + mobile.
**Решение:** pnpm workspace. Единый `pnpm-lock.yaml` в корне `milyi-dom/`.
**Последствия:** Docker build context = monorepo root; `--shamefully-hoist` для backend.

### ADR-002: PgBouncer вместо прямых подключений
**Дата:** Февраль 2026
**Статус:** Принято
**Контекст:** NestJS создаёт много коротких подключений, PostgreSQL ограничен `max_connections`.
**Решение:** PgBouncer transaction mode перед PostgreSQL. Prisma `directUrl` для migrations.
**Последствия:** Нельзя использовать prepared statements через пул; `?pgbouncer=true` в URL.

### ADR-003: Single-stage Docker для backend
**Дата:** Февраль 2026
**Статус:** Принято
**Контекст:** pnpm создаёт symlinks в `node_modules/.pnpm` — они не работают при multi-stage copy.
**Решение:** Один stage с `--shamefully-hoist` (flat node_modules, как npm).
**Последствия:** Чуть больше размер образа, зато все transitive deps доступны.

### ADR-004: Typesense вместо Elasticsearch
**Дата:** Февраль 2026
**Статус:** Принято
**Контекст:** Нужен full-text поиск с фасетами и геопоиском.
**Решение:** Typesense 26 — проще в управлении, меньше памяти, быстрее для нашего масштаба.
**Последствия:** Если объявлений > 10M → потребуется кластер Typesense или переход на Elasticsearch.

### ADR-005: Claude Haiku для AI функций
**Дата:** Февраль 2026
**Статус:** Принято
**Контекст:** Нужен LLM для AI Search + Review Summary + Fraud Detection.
**Решение:** `claude-haiku-4-5` — быстрый и дешёвый, при этом достаточно умный для наших задач.
**Последствия:** При сложных запросах можно переключиться на Sonnet/Opus через env var.

---

*Документ обновлён: 26 февраля 2026*
*Следующее обновление: после Спринта 1 (Admin Panel + Хост-календарь)*
