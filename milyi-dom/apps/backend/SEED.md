# Тестовые данные (Seed)

Скрипты для добавления и удаления демо-данных.
Изображения загружаются с **Unsplash CDN** — никакого файлового хранилища не требуется.

---

## Команды

### Добавить тестовые данные

```bash
# Из корня monorepo (milyi-dom/)
npx pnpm --filter backend prisma:seed

# Или из apps/backend/
npx pnpm prisma:seed
```

Скрипт **идемпотентен**: повторный запуск пропускает уже существующие записи,
ничего не дублирует и не удаляет.

---

### Удалить тестовые данные

```bash
# Из корня monorepo (milyi-dom/)
npx pnpm --filter backend seed:clear

# Или из apps/backend/
npx pnpm seed:clear
```

Удаляет **только** записи с маркерами тестовых данных:
- Объявления: ID начинается на `seed_`
- Пользователи: email из списка `@example.com`

**Реальные данные пользователей и контент-менеджеров не затрагиваются.**

---

## На продакшн-сервере

```bash
cd /opt/milyi-dom/milyi-dom

# Добавить тестовые данные
docker compose exec backend npx pnpm prisma:seed

# Удалить тестовые данные (после наполнения реальным контентом)
docker compose exec backend npx pnpm seed:clear
```

---

## Что создаётся

### Пользователи (пароль: `password123`)

| Email | Роль | Имя |
|---|---|---|
| `host@example.com` | HOST (Суперхост) | Елена Морозова |
| `host2@example.com` | HOST (Суперхост) | Наталья Сорокина |
| `guest@example.com` | GUEST | Сергей Иванов |
| `admin@example.com` | ADMIN | Максим Петров |

### Объявления (15 штук)

| ID | Город | Тип | Цена/ночь |
|---|---|---|---|
| `seed_msk_loft` | Москва | Квартира | 4 900 ₽ |
| `seed_msk_city` | Москва | Студия | 5 200 ₽ |
| `seed_msk_house` | Москва | Дом | 12 000 ₽ |
| `seed_spb_nevsky` | Санкт-Петербург | Квартира | 3 600 ₽ |
| `seed_spb_penthouse` | Санкт-Петербург | Квартира | 8 500 ₽ |
| `seed_spb_loft` | Санкт-Петербург | Лофт | 4 200 ₽ |
| `seed_sochi_sea` | Сочи | Квартира | 5 500 ₽ |
| `seed_sochi_villa` | Красная Поляна | Вилла | 18 000 ₽ |
| `seed_kazan_kreml` | Казань | Студия | 2 800 ₽ |
| `seed_kazan_river` | Казань | Квартира | 4 500 ₽ |
| `seed_tbilisi_old` | Тбилиси | Квартира | 2 500 ₽ |
| `seed_yerevan_ararat` | Ереван | Квартира | 2 200 ₽ |
| `seed_ekb_design` | Екатеринбург | Квартира | 3 200 ₽ |
| `seed_kld_baltic` | Светлогорск | Дом | 6 500 ₽ |
| `seed_belgrade_central` | Белград | Квартира | 2 900 ₽ |

Также создаются: 5 бронирований, 5 отзывов, 2 уведомления.

---

## Хранение изображений

Тестовые данные используют **Unsplash CDN URL** напрямую (поле `PropertyImage.url`).
Никакой загрузки файлов на сервер не требуется.

Для реальных объявлений хост загружает фото через интерфейс → они сохраняются
в **Cloudflare R2** (или локально в dev-режиме).

### Yandex Object Storage (используется в продакшне)

Настройка в `apps/backend/.env` на сервере:

```env
S3_BUCKET=milyidom-images
S3_REGION=ru-central1
S3_ENDPOINT=https://storage.yandexcloud.net
S3_ACCESS_KEY_ID=<ключ-сервисного-аккаунта>
S3_SECRET_ACCESS_KEY=<секрет-сервисного-аккаунта>
CDN_BASE_URL=https://milyidom-images.storage.yandexcloud.net
```

Инструкция по созданию бакета и ключей — в `apps/backend/.env.example`.
