# SEED

Seed data guide for backend.

Last synchronized: **2026-03-04**.

## Purpose

Seed scripts create or clear demo data for local/dev/staging validation.

## Commands

From workspace root (`milyi-dom/`):

```bash
# add demo data
pnpm --filter backend prisma:seed

# clear demo data markers
pnpm --filter backend seed:clear
```

From backend folder (`apps/backend/`):

```bash
pnpm prisma:seed
pnpm seed:clear
```

## Production Server Usage

```bash
cd /opt/milyi-dom/milyi-dom

# seed
docker compose exec backend npx pnpm prisma:seed

# clear
docker compose exec backend npx pnpm seed:clear
```

## Safety Notes

- Seed scripts are intended for non-production data workflows.
- Clear script should remove only data marked as seed/demo.
- Always verify affected rows before running clear in shared environments.

## Typical Seed Content

- demo users with role variety,
- demo listings,
- associated media records,
- sample booking/review/notification entities.
