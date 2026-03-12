# Milyi Dom — Secrets Inventory & Rotation

Server: `62.217.178.117` | Secrets file: `/opt/milyi-dom/milyi-dom/apps/backend/.env`

---

## Inventory

| Secret | Env Var | Type | Rotation Cadence | Last Rotated |
|--------|---------|------|-----------------|--------------|
| JWT signing key | `JWT_SECRET` | 64-byte random | Every 90 days | — |
| JWT refresh key | `JWT_REFRESH_SECRET` | 64-byte random | Every 90 days | — |
| YooKassa secret | `YOOKASSA_SECRET_KEY` | API key | On compromise / yearly | 2026-03 |
| YooKassa payout | `YOOKASSA_PAYOUT_TOKEN` | API key | On compromise / yearly | 2026-03 |
| Yandex Cloud SMTP user | `SMTP_USER` | Static key ID | On compromise | 2026-03 |
| Yandex Cloud SMTP pass | `SMTP_PASS` | Static key was shared in dev chat — rotate before first real users | Before launch | — |
| S3 access key | `S3_ACCESS_KEY_ID` | Static key ID | On compromise / yearly | 2026-03 |
| S3 secret key | `S3_SECRET_ACCESS_KEY` | Static key secret | On compromise / yearly | 2026-03 |
| Typesense API key | `TYPESENSE_API_KEY` | API key | On compromise | 2026-03 |
| DeepSeek API key | `DEEPSEEK_API_KEY` | API key | On compromise | 2026-03 |
| Google OAuth secret | `GOOGLE_CLIENT_SECRET` | OAuth secret | On compromise / yearly | 2026-03 |
| VK OAuth secret | `VK_CLIENT_SECRET` | OAuth secret | On compromise / yearly | 2026-03 |
| DB password | in `DATABASE_URL` | Postgres password | On compromise | 2026-03 |

---

## Before First Real Users

### Rotate Yandex Cloud SMTP static key

The static key `YCAJEeqPtUVt_Ru5w2DAoJdOq` was shared in a dev session.
Rotate before going live with real users. Procedure:

```bash
# 1. Create new static key in Yandex Cloud IAM
#    Console → Service Accounts → milyi-dom-mailer → Access Keys → Create

# 2. Recalculate SMTP password (HMAC-SHA256 of "postbox" using new secret key)
#    Python:
python3 -c "
import hmac, hashlib, base64
key_secret = 'YOUR_NEW_SECRET_KEY_HERE'
msg = 'postbox'
sig = hmac.new(key_secret.encode(), msg.encode(), hashlib.sha256).digest()
print(base64.b64encode(sig).decode())
"

# 3. Update .env on server
nano /opt/milyi-dom/milyi-dom/apps/backend/.env
# Set: SMTP_USER=<new_key_id>
# Set: SMTP_PASS=<new_derived_password>

# 4. Restart backend
cd /opt/milyi-dom/milyi-dom
docker compose restart backend

# 5. Test email delivery
curl -s -X POST https://api.milyidom.com/api/auth/resend-verification \
  -H "Authorization: Bearer <your-token>"
```

---

## JWT Rotation Procedure

Rotate JWT secrets without log-outs (requires refresh token flow):

```bash
# 1. Generate new secrets
openssl rand -hex 64  # new JWT_SECRET
openssl rand -hex 64  # new JWT_REFRESH_SECRET

# 2. Update .env
# JWT_SECRET=<new>
# JWT_REFRESH_SECRET=<new>

# 3. Restart — existing refresh tokens are invalidated
docker compose restart backend
# All users will need to re-login after their current access token expires (15m)
```

---

## Rotation Reminders (cron)

Add to server crontab to get monthly email reminders:

```bash
# Monthly reminder on 1st of each month at 09:00
echo "0 9 1 * * root echo 'Milyi Dom: check secrets rotation schedule → /opt/milyi-dom/milyi-dom/SECRETS_ROTATION.md' | mail -s '[milyidom] Monthly secrets check' admin@example.com" \
  > /etc/cron.d/milyi-dom-secrets-reminder
```

---

## Secret Generation

```bash
# 64-byte random secret (JWT, etc.)
openssl rand -hex 64

# 32-byte random secret
openssl rand -hex 32

# Check .env has no placeholder values before deploy
grep -E '<[A-Z_]+>|PLACEHOLDER|your_.*_here|changeme|secret123' \
  /opt/milyi-dom/milyi-dom/apps/backend/.env && echo "PLACEHOLDER FOUND — fix before deploy" || echo "OK"
```
