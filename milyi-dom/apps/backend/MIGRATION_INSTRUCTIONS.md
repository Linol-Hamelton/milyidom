# MIGRATION_INSTRUCTIONS

Prisma migration guide for backend.

Last synchronized: **2026-03-04**.

## Development Flow

From workspace root `milyi-dom/`:

```bash
# generate client after schema edits
pnpm --filter backend exec prisma generate

# create + apply new migration locally
pnpm --filter backend exec prisma migrate dev --name <migration_name>
```

## Production / Server Flow

```bash
# apply existing committed migrations only
pnpm --filter backend exec prisma migrate deploy
```

In dockerized server environment, use:

```bash
docker compose exec backend sh -c "cd /monorepo/apps/backend && npx prisma migrate deploy"
```

## Reset (Local only)

Use only for local/dev databases:

```bash
pnpm --filter backend exec prisma migrate reset --force
```

## Best Practices

1. Never edit an applied migration directory manually.
2. Commit both schema and generated migration files together.
3. Run `prisma generate` after any schema change.
4. Verify app start after migration before pushing.
5. Run seed only when needed for local testing.
