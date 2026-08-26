#!/usr/bin/env bash

set -eEuo pipefail
umask 077

BACKUP_ROOT="${BACKUP_ROOT:-${HOME}/backups/travel-archive}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-home-postgres}"
DB_NAME="${DB_NAME:-travel_archive}"
DB_USER="${DB_USER:-travel_archive}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-travel-archive_uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
STAGING="$BACKUP_ROOT/.${RUN_ID}.partial"
FINAL="$BACKUP_ROOT/$RUN_ID"

mkdir -p "$BACKUP_ROOT"
test ! -e "$STAGING"
test ! -e "$FINAL"
mkdir -m 700 "$STAGING"

cleanup() {
  local rc=$?
  if [[ $rc -ne 0 ]]; then rm -rf "$STAGING"; fi
  exit "$rc"
}
trap cleanup EXIT INT TERM

docker inspect "$POSTGRES_CONTAINER" >/dev/null
docker volume inspect "$UPLOADS_VOLUME" >/dev/null

docker exec "$POSTGRES_CONTAINER" pg_dump \
  -U "$DB_USER" -d "$DB_NAME" \
  --format=custom --no-owner --no-privileges >"$STAGING/database.dump"
test -s "$STAGING/database.dump"

docker run --rm \
  -v "$UPLOADS_VOLUME:/data:ro" \
  -v "$STAGING:/backup" \
  alpine:3.21 tar -C /data -czf /backup/uploads.tar.gz .

APP_VERSION="unknown"
if [[ -s .current-version ]]; then APP_VERSION="$(tr -d '\r\n' < .current-version)"; fi
POSTGRES_VERSION="$(docker exec "$POSTGRES_CONTAINER" postgres --version | tr -d '\r\n')"

cat >"$STAGING/manifest.txt" <<EOF
run_id=$RUN_ID
created_at_utc=$RUN_ID
app_version=$APP_VERSION
postgres_version=$POSTGRES_VERSION
database=$DB_NAME
uploads_volume=$UPLOADS_VOLUME
EOF

(
  cd "$STAGING"
  sha256sum database.dump uploads.tar.gz manifest.txt > SHA256SUMS
)

mv "$STAGING" "$FINAL"
trap - EXIT INT TERM

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
  -name '20[0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z' \
  -mtime "+$RETENTION_DAYS" -exec rm -rf -- {} +

printf 'backup ready: %s\n' "$FINAL"
printf 'verify with: BACKUP_RUN_DIR=%q bash scripts/verify-backup.sh\n' "$FINAL"
