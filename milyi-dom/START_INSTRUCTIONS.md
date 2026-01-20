# Быстрый старт проекта «Милый дом»

## 1. Запуск инфраструктуры

### Вариант с Docker
1. Убедитесь, что Docker установлен и запущен.
2. Поднимите контейнер с базой данных:
   ```bash
   cd milyi-dom
   docker-compose up -d db
   ```

### Локальный запуск без Docker
1. Установите PostgreSQL 14+.
2. Создайте базу данных `milyi_dom` и пропишите подключение в `.env` бэкенда.

## 2. Бэкенд (NestJS + Prisma)
```bash
cd milyi-dom/apps/backend
pnpm install
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm start:dev
```
По умолчанию API доступен по адресу `http://localhost:4001/api`.

## 3. Фронтенд (Next.js)
```bash
cd milyi-dom/apps/frontend
pnpm install
pnpm dev
```
Интерфейс доступен по адресу `http://localhost:3000`.

## 4. Переменные окружения

Скопируйте `.env.example` в `.env` (или `.env.local`) и обновите значения при необходимости.

### Бэкенд `apps/backend/.env`
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/milyi_dom"
JWT_SECRET="change-me"
JWT_REFRESH_SECRET="change-me-refresh"
PORT=4001
FRONTEND_URL="http://localhost:3000"
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
```

### Фронтенд `apps/frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

## 5. Полезные команды
- `pnpm prisma studio` — открыть Prisma Studio.
- `pnpm test` / `pnpm lint` — запустить тесты и линтер.
- `docker-compose down` — остановить контейнеры.

## 6. Статические ресурсы
Файлы изображений для сидов хранятся в каталоге `apps/backend/images`. Если запускаете проект в Docker, убедитесь, что этот каталог смонтирован (см. `docker-compose.yml`).
