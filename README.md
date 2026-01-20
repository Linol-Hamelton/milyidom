# Милый Дом — современный Airbnb-клон

Милый Дом — это вдохновляющий сервис для короткой аренды жилья. Проект состоит из двух приложений:

- `apps/backend` — Nest.js API, использующий Prisma, PostgreSQL и PostGIS для геопоиска, бронирований, отзывов и уведомлений.
- `apps/frontend` — маркетинговый лендинг на Next.js 14 с Tailwind, рассказывающий о ценностях сервиса и предлагающий подборку уникальных пространств.

## Быстрый старт

```bash
pnpm i
pnpm --filter backend dev
pnpm --filter frontend dev
```

## Основные возможности

- Регистрация и авторизация гостей и хостов, JWT и bcrypt
- Управление объектами: геопоиск, слага, фотогалерея, удобства, статусы
- Бронирования с проверкой пересечений, уведомления для гостей и хозяев
- Избранное, отзывы, диалоги, система уведомлений и оплаты
- Docker-compose для PostgreSQL с расширением PostGIS
- Эстетичный лендинг с подборками локаций и CTA для хостов

## Инструменты

- Backend: Nest.js, Prisma, PostgreSQL, PostGIS, Stripe SDK
- Frontend: Next.js 14, App Router, Tailwind CSS, TypeScript
- Инфраструктура: pnpm workspace, Docker, ESLint, Prettier
