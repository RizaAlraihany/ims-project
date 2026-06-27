#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${IMS_BACKUP_DIR:-/var/backups/ims-project}"
RETENTION_DAYS="${IMS_BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DATABASE="${DB_DATABASE:?DB_DATABASE is required}"
USERNAME="${DB_USERNAME:?DB_USERNAME is required}"
PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
HOST="${DB_HOST:-127.0.0.1}"
PORT="${DB_PORT:-3306}"
OUTPUT="${BACKUP_DIR}/${DATABASE}-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"
umask 077

mysqldump \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --host="${HOST}" \
  --port="${PORT}" \
  --user="${USERNAME}" \
  --password="${PASSWORD}" \
  "${DATABASE}" | gzip -9 > "${OUTPUT}"

find "${BACKUP_DIR}" -type f -name "${DATABASE}-*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "Backup created: ${OUTPUT}"
