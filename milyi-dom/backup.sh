#!/usr/bin/env bash
# PostgreSQL backup script for Milyi Dom
# Usage: ./backup.sh
# Recommended: add to crontab — runs daily at 03:00
#   0 3 * * * /opt/milyi-dom/milyi-dom/backup.sh >> /var/log/milyi-dom-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/milyi-dom/backups}"
CONTAINER="milyi_dom_db"
DB_NAME="milyi_dom"
DB_USER="postgres"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/milyi_dom_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup → ${BACKUP_FILE}"

# Dump via running PostgreSQL container
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup complete — size: ${SIZE}"

# Remove backups older than RETAIN_DAYS
find "$BACKUP_DIR" -name "milyi_dom_*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
REMAINING=$(find "$BACKUP_DIR" -name "milyi_dom_*.sql.gz" | wc -l)
echo "[$(date -Iseconds)] Retention: kept last ${RETAIN_DAYS} days (${REMAINING} files total)"

# ── Verify backup is readable ─────────────────────────────────────────────────
LINES=$(gunzip -c "$BACKUP_FILE" | wc -l)
if [ "$LINES" -lt 100 ]; then
  echo "[$(date -Iseconds)] ERROR: Backup looks empty (${LINES} lines). Investigate immediately!" >&2
  exit 1
fi
echo "[$(date -Iseconds)] Verification OK — ${LINES} lines in dump"
