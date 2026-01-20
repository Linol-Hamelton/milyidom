## Милый дом — фронтенд

Next.js-приложение (App Router, TypeScript, Tailwind).

### Требования
- Node.js 18+
- pnpm 8+

### Установка и запуск
```bash
pnpm install
pnpm dev
```
Сайт доступен по адресу `http://localhost:3000`.

### Переменные окружения
Создайте `.env.local` на основе `.env.example`.
```env
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

### Полезные команды
- `pnpm dev` — режим разработки.
- `pnpm build && pnpm start` — production-сборка.
- `pnpm lint`, `pnpm test` — линтер и Vitest.

### Статические ресурсы
Публичные изображения и фавиконки находятся в `public/`. Добавляйте собственные ресурсы в эту директорию.
