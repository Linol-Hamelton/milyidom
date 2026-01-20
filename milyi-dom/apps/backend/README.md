## Милый дом — бэкенд

NestJS-приложение, обслуживающее REST API и работу с PostgreSQL через Prisma.

### Требования
- Node.js 18+
- pnpm 8+
- PostgreSQL 14+ или Docker

### Установка и запуск
```bash
pnpm install
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm start:dev
```
API доступно по адресу `http://localhost:4001/api`.

### Переменные окружения
Создайте `.env` на основе `.env.example`.
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/milyi_dom"
JWT_SECRET="change-me"
JWT_REFRESH_SECRET="change-me-refresh"
PORT=4001
FRONTEND_URL="http://localhost:3000"
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
```

### Полезные команды
- `pnpm start:dev` — режим разработки.
- `pnpm build && pnpm start:prod` — production-сборка.
- `pnpm test`, `pnpm test:e2e` — тесты.
- `pnpm prisma studio` — интерфейс управления БД.

### Статические ресурсы
Изображения для сидов: `apps/backend/images`. При работе в Docker смонтируйте каталог (см. `docker-compose.yml`).
