# Инструкции по миграции базы данных

## После изменений в схеме Prisma

1. **Создание миграции:**
   ```bash
   pnpm prisma:migrate --name init
   ```

2. **Запуск миграции:**
   ```bash
   pnpm prisma:migrate deploy
   ```

3. **Генерация клиента Prisma:**
   ```bash
   pnpm prisma:generate
   ```

4. **Заполнение тестовыми данными:**
   ```bash
   pnpm prisma:seed
   ```

## Команды для разработки

- `pnpm prisma:generate` - генерация клиента Prisma
- `pnpm prisma:migrate dev` - создание и применение миграции
- `pnpm prisma:db push` - прямая синхронизация схемы (только для разработки)
- `pnpm prisma:studio` - открытие Prisma Studio для просмотра данных

## Важно!

После изменений в `schema.prisma` всегда выполняйте:
1. `pnpm prisma:generate`
2. `pnpm prisma:migrate dev`
3. `pnpm prisma:seed` (если нужно обновить тестовые данные)