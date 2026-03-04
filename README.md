# Милый Дом — Платформа аренды жилья №1

> Превосходим Airbnb и Booking по качеству, UX, безопасности и AI-функциям.

**Стек:** NestJS 11 · Next.js 15 · PostgreSQL 16 + PostGIS · Stripe · Redis · Typesense · Socket.io · Expo · Docker
**Готовность:** ~72% (Фазы 0-2 завершены — см. [ROADMAP.md](ROADMAP.md))
**Статус безопасности:** 🟡 Критических уязвимостей нет. Следующий приоритет: PII шифрование + GDPR

---

## Структура репозитория

```
newhome/
├── milyi-dom/                # Основное приложение (pnpm workspace)
│   ├── apps/
│   │   ├── backend/          # NestJS 11 API (Port 4001)
│   │   ├── frontend/         # Next.js 15 App Router (Port 3000)
│   │   └── mobile/           # Expo SDK 52 (React Native)
│   ├── docker-compose.yml    # Полный production стек
│   ├── prometheus.yml        # Prometheus конфигурация
│   └── package.json          # pnpm workspace root
├── ROADMAP.md                # 18-месячный план к лидерству на рынке
├── ARCHITECTURE.md           # Техническая архитектура + ADRs
└── SECURITY.md               # Требования безопасности (PCI DSS, GDPR, ФЗ-152)
```

## Быстрый старт (Docker — рекомендуется)

```bash
cd milyi-dom

# Запустить весь стек одной командой
docker compose up -d

# Сервисы будут доступны на:
# Frontend:    http://localhost:3000
# Backend API: http://localhost:4001/api
# Grafana:     http://localhost:3001  (admin / milyi-dom-grafana)
# Prometheus:  http://localhost:9090
# Typesense:   http://localhost:8108
```

## Быстрый старт (локальная разработка)

```bash
# 1. Инфраструктура
cd milyi-dom
docker compose up -d db redis typesense pgbouncer

# 2. Backend
cd apps/backend
cp .env.example .env        # Заполнить переменные
npx pnpm install
npx prisma migrate deploy --schema=prisma/schema.prisma
npx pnpm start:dev          # http://localhost:4001

# 3. Frontend (в другом терминале)
cd apps/frontend
cp .env.example .env.local  # Заполнить NEXT_PUBLIC_MAPBOX_TOKEN и др.
npx pnpm install
npx pnpm dev                # http://localhost:3000

# 4. Mobile (опционально)
cd apps/mobile
npx pnpm install
npx expo start
```

## Технологический стек

| Слой | Технология | Версия | Статус |
|------|-----------|--------|--------|
| Backend | NestJS | 11.x | ✅ |
| Frontend | Next.js (App Router) | 15.x | ✅ |
| Mobile | Expo (React Native) | SDK 52 | ✅ MVP |
| Database | PostgreSQL + PostGIS | 16 + 3.4 | ✅ |
| ORM | Prisma | 6.x | ✅ |
| Connection Pool | PgBouncer | latest | ✅ |
| Auth | JWT + Passport + 2FA + OAuth | — | ✅ |
| Payments | Stripe SDK + Connect | 18.x | ✅ |
| Search | Typesense | 26 | ✅ |
| AI | Claude API (Anthropic) | Haiku | ✅ |
| Real-time | Socket.io | 4.x | ✅ |
| Queue | BullMQ + Redis | 7.x | ✅ |
| Email | Nodemailer + SMTP | — | ✅ |
| Styling | Tailwind CSS | 3.x | ✅ |
| State | Zustand + SWR | — | ✅ |
| Map | MapBox GL | — | ✅ |
| PWA | sw.js + manifest | — | ✅ |
| Monitoring | Prometheus + Grafana | — | ✅ |
| Error tracking | Sentry | — | ✅ |
| CI/CD | GitHub Actions | — | ✅ |
| Containerization | Docker Compose | — | ✅ |

## Ключевые функции

### Для гостей
- **AI Smart Search** — поиск на естественном языке ("уютная квартира у моря для двоих")
- **Map-first интерфейс** — MapBox GL с ценами на маркерах, 3 вида (список/карта/split)
- **Полный booking flow** — бронирование → Stripe оплата → подтверждение по email
- **Real-time чат** — WebSocket мессенджер с хостами
- **AI-резюме отзывов** — Claude суммаризирует все отзывы по объявлению
- **Push уведомления** — в браузере (PWA) и в мобильном приложении
- **OAuth** — вход через Google или VK
- **2FA** — TOTP (Google Authenticator)

### Для хостов
- **Аналитика** — 12-месячная выручка, occupancy rate, per-listing stats
- **iCal синхронизация** — синхронизация с Airbnb, VRBO, Google Calendar
- **Stripe Connect** — быстрые выплаты с историей транзакций
- **Блокировка дат** — ручная и через iCal
- **Управление объявлениями** — статусы, фото, описания

### Безопасность
- IDOR защита на всех endpoints
- Rate limiting (100 req/min)
- Helmet.js HTTP headers
- Stripe webhook HMAC верификация
- Audit log всех критических операций
- bcrypt cost=12 для паролей

## Переменные среды

### Backend (apps/backend/.env)
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/milyi_dom
DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/milyi_dom
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
STRIPE_SECRET_KEY=sk_test_...
ANTHROPIC_API_KEY=<для AI функций>
TYPESENSE_API_KEY=milyi-dom-typesense-dev-key
SMTP_HOST=smtp.resend.com
SMTP_PASS=<Resend API key>
GOOGLE_CLIENT_ID=<для OAuth>
VK_CLIENT_ID=<для OAuth>
```

### Frontend (apps/frontend/.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4001/api
NEXT_PUBLIC_WS_URL=http://localhost:4001
NEXT_PUBLIC_MAPBOX_TOKEN=<обязателен для карты>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Документация

- **[ROADMAP.md](ROADMAP.md)** — 18-месячный план, текущий прогресс, следующие приоритеты
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — технические решения, схема БД, ADRs
- **[SECURITY.md](SECURITY.md)** — требования безопасности (PCI DSS, GDPR, ФЗ-152)
- **[milyi-dom/plans.md](milyi-dom/plans.md)** — детальные планы по фазам разработки

## Статус сервисов (Docker)

| Сервис | Порт | Назначение |
|--------|------|-----------|
| Frontend | 3000 | Next.js SSR приложение |
| Backend | 4001 | NestJS REST API + WebSocket |
| PostgreSQL | 5432 | Основная БД + PostGIS |
| PgBouncer | 5433 | Connection pooling |
| Redis | 6379 | Cache + BullMQ очереди |
| Typesense | 8108 | Full-text поиск |
| Prometheus | 9090 | Метрики |
| Grafana | 3001 | Дашборды (admin/milyi-dom-grafana) |

## Release Update 2026-03-04

Stability and security fixes delivered:
- Fixed protected flow around host bookings page rendering: no host API call before role guard allows content.
- Hardened realtime chat client socket endpoint resolution for production environments.
- Hardened /messages send action to avoid duplicate submits and ensure click-triggered send path.
- Improved mobile responsiveness of listings view-mode controls (no horizontal overflow on narrow screens).
- Listing creation path remains protected by idempotency key support and extended frontend timeout.
- Favorites and coordinates validation regressions remain covered by tests.

Canonical deployment and smoke-check steps are documented in [DEPLOY_CANONICAL_2026-03-04.md](DEPLOY_CANONICAL_2026-03-04.md).
