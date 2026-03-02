# SECURITY.md — Фреймворк безопасности Милый Дом

**Версия:** 1.0
**Дата:** 26 февраля 2026
**Классификация:** Внутренний документ
**Владелец:** Security Lead / CTO

> Цель: Банковский уровень безопасности для платформы, хранящей персональные и платёжные данные пользователей.

---

## 1. THREAT MODEL (Модель угроз)

### 1.1 Активы, требующие защиты

| Актив | Ценность | Последствие компрометации |
|-------|---------|--------------------------|
| Банковские данные (карты) | КРИТИЧЕСКИЙ | Финансовые потери пользователей, регуляторные штрафы |
| Персональные данные (PII) | КРИТИЧЕСКИЙ | GDPR штрафы до €20M, репутационный ущерб |
| JWT токены | ВЫСОКИЙ | Захват аккаунтов |
| Stripe API ключи | КРИТИЧЕСКИЙ | Мошеннические транзакции |
| Пароли пользователей | КРИТИЧЕСКИЙ | Account takeover |
| Паспортные данные | КРИТИЧЕСКИЙ | Кража личности |
| Бизнес-данные (бронирования, выручка) | ВЫСОКИЙ | Конкурентный ущерб |
| Исходный код | СРЕДНИЙ | Раскрытие уязвимостей |

### 1.2 Актеры угроз

| Актёр | Мотивация | Вектор | Вероятность |
|-------|---------|--------|-------------|
| Мошенники (fraud) | Финансовая выгода | Поддельные объявления, chargebacks | Высокая |
| Credential stuffers | Захват аккаунтов | Brute force, list attacks | Высокая |
| Скрейперы | Конкурентная разведка | Automated scraping | Средняя |
| Инсайдеры | Различная | Прямой доступ к БД | Низкая |
| Продвинутые атаки (APT) | Различная | Цепочка уязвимостей | Низкая |
| Случайные хакеры | Публичность | OWASP Top 10 | Высокая |

---

## 2. КРИТИЧЕСКИЕ УЯЗВИМОСТИ (ИСПРАВИТЬ НЕМЕДЛЕННО)

### 2.1 IDOR — Insecure Direct Object Reference

**Уязвимость #1:** Любой аутентифицированный пользователь может изменить чужое объявление

```
Файл: milyi-dom/apps/backend/src/listings/listings.controller.ts
Метод: PATCH /api/listings/:id

Атака:
  1. Alice создаёт объявление #123 (цена $100/ночь)
  2. Bob (злоумышленник) делает PATCH /api/listings/123 с телом {"price": 1}
  3. Объявление Alice теперь стоит $1/ночь → финансовый ущерб

Исправление: Проверять listing.hostId === currentUser.id перед обновлением
Время исправления: 30 минут
Приоритет: P0 — исправить сегодня
```

**Уязвимость #2:** Любой пользователь может изменить статус чужого бронирования

```
Файл: milyi-dom/apps/backend/src/bookings/bookings.controller.ts
Метод: PATCH /api/bookings/:id/status

Атака:
  1. Гость бронирует объект
  2. Другой пользователь меняет статус на CANCELLED
  3. Бронирование отменено без ведома хоста/гостя

Исправление: Проверять booking.guestId === currentUser.id или listing.hostId === currentUser.id
Время исправления: 30 минут
Приоритет: P0 — исправить сегодня
```

### 2.2 Webhook Spoofing (Stripe)

```
Файл: milyi-dom/apps/backend/src/payments/payments.controller.ts
Метод: POST /payments/webhook

Атака:
  1. Злоумышленник отправляет поддельный webhook на /payments/webhook
  2. Сервер принимает событие payment_intent.succeeded
  3. Бронирование подтверждается без реального платежа

Исправление: stripe.webhooks.constructEvent(body, sig, webhookSecret)
Время исправления: 1 час
Приоритет: P0 — исправить сегодня
```

### 2.3 File Upload Attack

```
Уязвимость: Нет валидации загружаемых файлов
Риск: RCE (Remote Code Execution) — загрузка .php/.sh файла под видом .jpg
Атака:
  1. Загрузить file.php с содержимым <?php system($_GET['cmd']); ?>
  2. Запросить URL загруженного файла
  3. Выполнение произвольного кода на сервере

Исправление:
  - Проверять MIME type через file magic bytes (не только расширение)
  - Ограничить: только image/jpeg, image/png, image/webp
  - Ограничить размер: max 10MB
  - Сохранять с UUID именем (не оригинальным)
  - Сканировать через libmagic или ClamAV
  - Лучше всего: загружать напрямую в S3 (не через сервер)

Приоритет: P0
```

### 2.4 No Rate Limiting

```
Уязвимость: Нет ограничений на количество запросов
Риск: Brute force паролей, DoS, credential stuffing, спам

Атаки:
  - Перебор паролей: /api/auth/login без ограничений
  - Регистрация фейков: /api/auth/register без ограничений
  - Скрейпинг: /api/listings без throttling

Исправление: @nestjs/throttler
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 запросов/мин
  @Post('login')

Дополнительно: Redis-based rate limiting для распределённого окружения

Приоритет: P0
```

### 2.5 CORS Misconfiguration

```
Уязвимость: CORS origins захардкожены (только localhost)
Файл: milyi-dom/apps/backend/src/main.ts

Риск в prod:
  - Если origins не обновить → production CORS blocked (все запросы с фронта провалятся)
  - Если случайно поставить '*' → любой сайт может делать запросы

Исправление:
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000']

Приоритет: P0 (перед prod запуском)
```

---

## 3. СТАНДАРТЫ БЕЗОПАСНОСТИ

### 3.1 Аутентификация

#### JWT (текущее) — требования:
```
✅ Уже реализовано:
  - JWT access token (короткоживущий)
  - JWT refresh token (долгоживущий)
  - bcrypt для паролей

❌ Нужно добавить:
  - bcrypt cost factor явно = 12 (не дефолт)
  - JWT secret rotation (ротация каждые 24 часа)
  - Refresh token rotation (каждый refresh выдаёт новый)
  - Refresh token revocation list (Redis)
  - Access token blacklist при logout
  - Проверка аудитории (aud) и издателя (iss) в JWT
```

#### Пароли — требования:
```
Минимальная длина:  8 символов
Максимальная длина: 72 символа (bcrypt limit)
Требования:         Uppercase + Lowercase + Number
Запрет:             Top 10,000 популярных паролей (HaveIBeenPwned API)
Хранение:           bcrypt с cost=12 (НИКОГДА plaintext, md5, sha1)
```

#### 2FA — план реализации (Фаза 1):
```
Метод 1: TOTP (Google Authenticator, Authy) — приоритет
  Library: otpauth (npm)
  Flow:
    1. Генерируем totp.Secret → QR-код для сканирования
    2. Пользователь подтверждает 6-значным кодом
    3. Сохраняем secret (зашифрованный AES-256) в User.twoFactorSecret
    4. При логине: если 2FA включена → require token после пароля

Метод 2: SMS OTP (Twilio) — для тех, у кого нет authenticator
  Срок действия: 5 минут
  Длина: 6 цифр
  Rate limit: 3 попытки / 10 минут

Backup codes:
  Генерировать 10 одноразовых кодов
  Хранить как bcrypt hashes
  Показывать пользователю один раз
```

#### OAuth 2.0 (Фаза 1):
```
Провайдеры:
  - Google (приоритет — крупнейшая аудитория)
  - Apple ID (обязательно для iOS app)
  - VK / Яндекс (для российской аудитории)

Flow: Authorization Code + PKCE (не implicit!)
Scope: openid, email, profile
Token storage: Только access token в памяти (не localStorage!)
```

### 3.2 Авторизация (RBAC)

```
Роли:
  GUEST       — Может искать, просматривать, бронировать
  HOST        — Всё что GUEST + управление своими объявлениями
  ADMIN       — Модерация, управление пользователями, аналитика
  SUPER_ADMIN — Всё + управление другими ADMIN (только для основателей)

Правила объектного доступа:
  Listing CRUD:
    CREATE  → только HOST
    READ    → всё (публичные), owner/admin (черновики)
    UPDATE  → только owner (listing.hostId === user.id)
    DELETE  → owner или ADMIN
    PUBLISH → owner или ADMIN

  Booking:
    CREATE  → только GUEST (не HOST своих объявлений)
    READ    → guest или host этого бронирования
    STATUS  → CONFIRM/REJECT → только host
    CANCEL  → guest (до check-in) или host
    REFUND  → только ADMIN

  Review:
    CREATE  → только GUEST со статусом COMPLETED booking
    UPDATE  → только author (в течение 48 часов)
    DELETE  → author или ADMIN
    FEATURE → только ADMIN

  Message:
    SEND   → участники conversation
    READ   → участники conversation
    DELETE → sender или ADMIN
```

### 3.3 Шифрование данных

#### В транзите (TLS):
```
Версия:       TLS 1.3 (TLS 1.2 deprecated)
Сертификаты:  Let's Encrypt (автообновление) или AWS ACM
HSTS:         Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
HPKP:         Не использовать (устарело)
```

#### В покое (at rest):
```
БД (PostgreSQL):
  - Диск: AES-256 на уровне cloud provider (AWS EBS encryption)
  - Поля PII: Дополнительное шифрование на уровне приложения

Поля, требующие шифрования на уровне приложения:
  User.phone                → AES-256-GCM (ищем по hash)
  Profile.bio               → Не шифровать (публичное)
  User.twoFactorSecret      → AES-256-GCM (ОБЯЗАТЕЛЬНО)

Ключи шифрования:
  Хранить в AWS KMS или HashiCorp Vault
  Никогда в .env файлах
  Ротировать ежегодно

Банковские данные:
  НИКОГДА не хранить PAN, CVV, expiry date
  Использовать только Stripe Payment Method ID (pm_...)
  PCI DSS compliance — всё через Stripe, не через наши серверы
```

#### Redis:
```
Пароль обязателен: requirepass ${REDIS_PASSWORD}
TLS: requireTLS yes (в production)
Sensitive data TTL: Sessions 7 дней, OTP 5 минут
```

### 3.4 HTTP Security Headers

```typescript
// Добавить в main.ts:
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-${nonce}'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind inline styles
      imgSrc: ["'self'", "data:", "https://cdn.milyidom.com", "https://*.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

Заголовки, которые нужно добавить:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: (настроить по CSP builder)
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 3.5 Input Validation & Sanitization

```typescript
// Уже используется: class-validator + ValidationPipe
// Нужно усилить:

// 1. Whitelist (уже enabled ✅)
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,          // Удаляет неизвестные поля ✅
  forbidNonWhitelisted: true, // Ошибка на неизвестные поля (добавить!)
  transform: true,          // ✅
  transformOptions: { enableImplicitConversion: true }
}));

// 2. SQL Injection — Prisma защищает через parameterized queries ✅
// НО: Не использовать $queryRaw без параметризации!
// НЕПРАВИЛЬНО: prisma.$queryRaw(`SELECT * WHERE city = '${city}'`)
// ПРАВИЛЬНО:   prisma.$queryRaw`SELECT * WHERE city = ${city}`

// 3. XSS — Sanitize HTML input (для description, bio)
// Добавить: DOMPurify на фронте, strip-tags на бэке

// 4. Path Traversal в file uploads
// Всегда генерировать новое имя файла: uuidv4() + extension
// Никогда не использовать user-supplied filename

// 5. Regex DoS (ReDoS) — проверить все regex в validators
// Использовать validator.js вместо кастомных regex
```

---

## 4. PCI DSS COMPLIANCE

### 4.1 Что требует PCI DSS Level 1

PCI DSS (Payment Card Industry Data Security Standard) обязателен при хранении, обработке или передаче данных карт.

**Наш подход: Scope Reduction через Stripe**

```
Стратегия: НЕ хранить и НЕ обрабатывать данные карт самостоятельно.
Все платёжные данные идут через Stripe.js → Stripe серверы → Stripe → нам только Payment ID.

Что это даёт:
  - PCI DSS scope сужается до SAQ A (минимальный)
  - Не нужно проходить полный PCI DSS аудит
  - Stripe берёт на себя compliance уровня L1

Что мы ДОЛЖНЫ соблюдать даже с Stripe:
  ✓ TLS для всего трафика
  ✓ Не логировать данные карт (даже случайно!)
  ✓ Периодически тестировать безопасность
  ✓ Хранить политику безопасности
  ✓ Ограничить доступ к production среде
```

### 4.2 Checklist PCI DSS для нашего контекста

```
Сеть:
  [ ] Firewall на production серверах (Security Groups в AWS)
  [ ] Никаких default vendor passwords
  [ ] WAF (Cloudflare)

Данные карт:
  [x] Не хранить PAN (Stripe handles)
  [x] Не хранить CVV (запрещено!)
  [x] Не хранить PIN (запрещено!)
  [ ] Логи не должны содержать данные карт

Уязвимости:
  [ ] Antivirus на серверах
  [ ] Регулярные security patches (автоматически в K8s)
  [ ] Quarterly vulnerability scans
  [ ] Annual penetration test

Доступ:
  [ ] Уникальные учётные записи для каждого разработчика
  [ ] MFA для всех admin доступов
  [ ] Принцип минимальных привилегий
  [ ] Audit log всего доступа к production

Мониторинг:
  [ ] Логировать все доступы к cardholder data
  [ ] IDS/IPS
  [ ] SIEM (в фазе 2)

Политики:
  [ ] Политика безопасности информации (написать!)
  [ ] Incident Response Plan (написать!)
  [ ] Data Retention Policy (написать!)
```

---

## 5. GDPR & ФЗ-152 COMPLIANCE

### 5.1 GDPR (EU General Data Protection Regulation)

```
Применимость: При обслуживании пользователей из ЕС

Основные требования:

1. Законное основание обработки:
   - Регистрация: Согласие пользователя (checkbox при регистрации)
   - Бронирование: Исполнение договора
   - Email маркетинг: Явное согласие (opt-in)
   - Аналитика: Согласие или легитимный интерес

2. Права субъектов данных (реализовать в фазе 1):
   [ ] Право на доступ: GET /api/users/me/data-export
   [ ] Право на исправление: PATCH /api/users/me
   [ ] Право на удаление: DELETE /api/users/me (soft delete → hard delete через 30 дней)
   [ ] Право на переносимость: JSON/CSV экспорт
   [ ] Право на ограничение обработки

3. Privacy by Design:
   - Минимизация данных (собирать только необходимое)
   - Псевдонимизация где возможно
   - Шифрование по умолчанию

4. Breach Notification:
   - Уведомить регулятора в течение 72 часов
   - Уведомить пользователей без излишней задержки

5. DPA (Data Processing Agreement):
   - Заключить со Stripe, AWS, Sentry, Resend
```

### 5.2 ФЗ-152 (Россия)

```
Применимость: При обработке персональных данных граждан РФ

Ключевые требования:

1. Локализация данных:
   Персональные данные граждан РФ должны хранится на серверах в РФ

   Решение:
   - Основная БД: Russian region (AWS eu-central-1 или Yandex.Cloud)
   - Backups: Также в РФ

2. Согласие на обработку:
   - Конкретное, информированное согласие при регистрации
   - Отдельное согласие на каждую цель обработки

3. Регистрация в Роскомнадзоре:
   - Уведомить РКН об обработке персональных данных
   - Назначить ответственного за обработку ПДн

4. Политика конфиденциальности:
   - Публично доступна на сайте
   - На русском языке
   - Содержит все обязательные элементы по ФЗ-152
```

---

## 6. INCIDENT RESPONSE PLAN

### 6.1 Классификация инцидентов

| Уровень | Описание | Время реакции | Эскалация |
|---------|---------|---------------|-----------|
| SEV-1 | Данные карт скомпрометированы | 15 минут | CEO + CTO + Legal |
| SEV-1 | Production не отвечает > 5 минут | 15 минут | CTO + DevOps |
| SEV-2 | Утечка PII данных | 30 минут | CTO + Legal |
| SEV-2 | Несанкционированный доступ к аккаунтам | 30 минут | Security + CTO |
| SEV-3 | Мошеннические транзакции | 1 час | Security + Finance |
| SEV-4 | Поддельные объявления | 4 часа | Trust & Safety |

### 6.2 Playbook для утечки данных

```
Фаза 1: Обнаружение и сдерживание (0-1 час)
  1. Изолировать компрометированную систему
  2. Сохранить логи (не удалять!)
  3. Сменить все секреты и ключи
  4. Отозвать все активные JWT токены
  5. Уведомить команду безопасности

Фаза 2: Оценка ущерба (1-4 часа)
  6. Определить объём утечки (какие данные, сколько пользователей)
  7. Проанализировать вектор атаки
  8. Зафиксировать временную шкалу инцидента

Фаза 3: Уведомления (4-72 часа)
  9. Уведомить Роскомнадзор (72 часа по ФЗ-152)
  10. Уведомить GDPR регулятора если затронуты EU пользователи (72 часа)
  11. Уведомить затронутых пользователей
  12. Уведомить Stripe при компрометации платёжных данных

Фаза 4: Восстановление (параллельно)
  13. Патч уязвимости
  14. Проверить другие потенциальные векторы
  15. Провести forensics анализ
  16. Написать post-mortem
```

---

## 7. SECURITY MONITORING & AUDIT LOG

### 7.1 События для обязательного логирования

```typescript
// Все эти события должны писаться в audit_log таблицу:

enum AuditEvent {
  // Auth
  USER_LOGIN = 'user.login',
  USER_LOGIN_FAILED = 'user.login_failed',
  USER_LOGOUT = 'user.logout',
  USER_REGISTER = 'user.register',
  PASSWORD_CHANGED = 'user.password_changed',
  PASSWORD_RESET_REQUESTED = 'user.password_reset_requested',
  TWO_FACTOR_ENABLED = 'user.2fa_enabled',
  TWO_FACTOR_DISABLED = 'user.2fa_disabled',

  // Access
  LISTING_UPDATED = 'listing.updated',
  LISTING_DELETED = 'listing.deleted',
  BOOKING_STATUS_CHANGED = 'booking.status_changed',
  BOOKING_CANCELLED = 'booking.cancelled',

  // Payments
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_ISSUED = 'payment.refunded',

  // Admin
  USER_BANNED = 'admin.user_banned',
  LISTING_APPROVED = 'admin.listing_approved',
  LISTING_REJECTED = 'admin.listing_rejected',

  // Security
  RATE_LIMIT_EXCEEDED = 'security.rate_limit',
  INVALID_TOKEN = 'security.invalid_token',
  FORBIDDEN_ACCESS = 'security.forbidden',
}

// Схема записи:
model AuditLog {
  id        String    @id @default(cuid())
  event     String    // AuditEvent
  userId    String?   // Кто сделал (null если anon)
  targetId  String?   // На кого/что
  ip        String    // IP адрес
  userAgent String    // Browser/client
  data      Json?     // Дополнительный контекст
  createdAt DateTime  @default(now())

  @@index([userId, createdAt])
  @@index([event, createdAt])
  @@index([ip, createdAt])
}
```

### 7.2 Алерты безопасности (Prometheus Rules)

```yaml
# Правила для Alertmanager:

groups:
  - name: security
    rules:
      # > 10 неудачных логинов с одного IP за 5 минут
      - alert: BruteForceDetected
        expr: rate(auth_login_failed_total[5m]) > 10
        for: 1m
        annotations:
          summary: "Brute force detected from {{ $labels.ip }}"

      # > 100 запросов в секунду от одного IP
      - alert: DDoSDetected
        expr: rate(http_requests_total[1m]) > 100
        for: 30s
        annotations:
          summary: "Potential DDoS from {{ $labels.ip }}"

      # Ошибки payment processing
      - alert: PaymentFailureRate
        expr: rate(payment_failed_total[5m]) / rate(payment_total[5m]) > 0.1
        for: 2m
        annotations:
          summary: "Payment failure rate > 10%"

      # Необычный рост количества регистраций (бот-регистрация)
      - alert: RegistrationSpike
        expr: rate(user_register_total[10m]) > 50
        for: 5m
        annotations:
          summary: "Registration spike detected (possible bot)"
```

---

## 8. SECRETS MANAGEMENT

### 8.1 Что является секретом

```
КРИТИЧЕСКИЕ (никогда в git, только в secrets manager):
  JWT_SECRET
  JWT_REFRESH_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  DATABASE_URL (с паролем)
  REDIS_URL (с паролем)
  AWS_SECRET_ACCESS_KEY
  TWO_FACTOR_ENCRYPTION_KEY

ВАЖНЫЕ (не в git, в .env):
  RESEND_API_KEY
  MAPBOX_TOKEN
  SENTRY_DSN
  EMAIL_FROM

НЕЙТРАЛЬНЫЕ (можно в репо):
  PORT
  NODE_ENV
  JWT_EXPIRES_IN
  NEXT_PUBLIC_API_URL (только URL без credentials)
```

### 8.2 Правила работы с секретами

```
✅ Правильно:
  - .env файл только на локальной машине (в .gitignore!)
  - Производственные секреты только в AWS Parameter Store / Vault
  - Ротировать JWT секреты каждые 30 дней в prod
  - Разные секреты для dev/staging/prod

❌ Категорически запрещено:
  - Хранить секреты в git (даже в private репо)
  - Логировать секреты (даже случайно)
  - Передавать секреты через мессенджеры
  - Хранить prod секреты на локальной машине разработчика
  - Использовать одни секреты для dev и prod
```

### 8.3 Процедура ротации секретов

```
При подозрении на компрометацию (немедленно):
  1. Войти в AWS KMS / Vault
  2. Сгенерировать новый секрет
  3. Обновить в production environment
  4. Перезапустить backend pods (rolling restart)
  5. Старый секрет автоматически становится невалидным
  6. Все активные JWT токены аннулированы → пользователи перелогиниваются

По расписанию:
  JWT_SECRET:         30 дней (не аннулирует активные токены)
  STRIPE_SECRET_KEY:  По требованию Stripe
  DB_PASSWORD:        90 дней
```

---

## 9. PENETRATION TESTING PLAN

### 9.1 Область тестирования

```
В scope:
  ✓ Web Application (frontend.milyidom.com)
  ✓ API (api.milyidom.com)
  ✓ Admin Panel
  ✓ Mobile PWA

Вне scope:
  ✗ Физическая безопасность
  ✗ Social engineering (только с разрешения)
  ✗ Stripe/AWS инфраструктура
```

### 9.2 OWASP Top 10 — Чеклист

```
A01: Broken Access Control
  [ ] IDOR тестирование (приоритет #1)
  [ ] RBAC bypass тесты
  [ ] Horizontal privilege escalation
  [ ] JWT manipulation

A02: Cryptographic Failures
  [ ] TLS конфигурация (testssl.sh)
  [ ] Незашифрованные sensitive поля
  [ ] Слабые алгоритмы (MD5, SHA1)

A03: Injection
  [ ] SQL Injection (через Prisma защищено, но проверить $queryRaw)
  [ ] NoSQL Injection
  [ ] XSS (Stored, Reflected, DOM)
  [ ] SSTI

A04: Insecure Design
  [ ] Бизнес-логика: бронирование своего объявления
  [ ] Race conditions в booking
  [ ] Negative price attacks

A05: Security Misconfiguration
  [ ] Дефолтные credentials
  [ ] Stack traces в production errors
  [ ] Debug endpoints доступны

A06: Vulnerable Components
  [ ] npm audit (автоматически в CI)
  [ ] Trivy container scanning

A07: Authentication Failures
  [ ] Brute force (rate limiting)
  [ ] Credential stuffing
  [ ] Session fixation
  [ ] Password reset token expiry

A08: SSRF
  [ ] Webhook URL validation
  [ ] Image upload URL (при fetch by URL)

A09: Security Logging Failures
  [ ] Audit log completeness
  [ ] Log injection

A10: CSRF
  [ ] State-changing actions защищены
  [ ] SameSite cookie attribute
```

---

## 10. SECURITY ROADMAP

```
Фаза 0 (Немедленно — до публичного запуска):
  P0: Исправить IDOR в listings + bookings
  P0: Добавить Stripe webhook verification
  P0: Добавить rate limiting
  P0: Валидация файлов при загрузке
  P0: Исправить CORS для production
  P0: Добавить Helmet.js
  P1: Добавить Audit Log таблицу
  P1: Вынести секреты из кода

Фаза 1 (Месяц 1-3):
  [ ] 2FA (TOTP)
  [ ] OAuth 2.0 (Google, Apple)
  [ ] WAF (Cloudflare)
  [ ] Автоматическое CVE сканирование в CI
  [ ] Security headers полный набор
  [ ] Encryption at rest для PII полей
  [ ] Первый penetration test (внешний)
  [ ] Incident Response Plan (документ)

Фаза 2 (Месяц 4-9):
  [ ] HashiCorp Vault для secrets
  [ ] Верификация личности (Stripe Identity)
  [ ] Stripe Radar (ML fraud detection)
  [ ] GDPR compliance tooling (right to erasure)
  [ ] ФЗ-152 локализация данных
  [ ] SOC 2 Type II подготовка
  [ ] Bug Bounty программа

Фаза 3 (Месяц 10-18):
  [ ] SOC 2 Type II сертификация
  [ ] ISO 27001 подготовка
  [ ] Red Team exercises
  [ ] SIEM система
  [ ] Zero-trust architecture
```

---

*Этот документ должен обновляться после каждого security инцидента и penetration test.*
*Контакт для security disclosure: security@milyidom.com (создать!)*
*Bug bounty: Планируется в Фазе 2*
