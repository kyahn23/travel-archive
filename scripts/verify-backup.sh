#!/usr/bin/env bash

set -eEuo pipefail

: "${BACKUP_RUN_DIR:?BACKUP_RUN_DIR=/absolute/path/to/run is required}"
MIN_TABLE_COUNT="${MIN_TABLE_COUNT:-13}"
[[ "$BACKUP_RUN_DIR" = /* ]] || { echo 'BACKUP_RUN_DIR must be absolute' >&2; exit 64; }

for file in database.dump uploads.tar.gz manifest.txt SHA256SUMS; do
  test -f "$BACKUP_RUN_DIR/$file"
done

(
  cd "$BACKUP_RUN_DIR"
  sha256sum -c SHA256SUMS
)
tar -tzf "$BACKUP_RUN_DIR/uploads.tar.gz" >/dev/null
docker run --rm -v "$BACKUP_RUN_DIR:/backup:ro" postgres:16-alpine \
  pg_restore --list /backup/database.dump >/dev/null

RUN_ID="$(uuidgen 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())')"
RUN_ID="$(printf '%s' "$RUN_ID" | tr '[:upper:]' '[:lower:]')"
PG_CONTAINER="ta-restore-$RUN_ID"
UPLOAD_VOLUME="ta-restore-uploads-$RUN_ID"

cleanup() {
  local rc=$?
  docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
  docker volume rm "$UPLOAD_VOLUME" >/dev/null 2>&1 || true
  exit "$rc"
}
trap cleanup EXIT INT TERM

docker run -d --name "$PG_CONTAINER" \
  -e POSTGRES_PASSWORD=restore-only-password \
  -e POSTGRES_DB=travel_archive_restore \
  postgres:16-alpine >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$PG_CONTAINER" pg_isready -U postgres -d travel_archive_restore >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$PG_CONTAINER" pg_isready -U postgres -d travel_archive_restore >/dev/null

docker exec -i "$PG_CONTAINER" pg_restore \
  -U postgres -d travel_archive_restore \
  --no-owner --no-privileges <"$BACKUP_RUN_DIR/database.dump"

TABLE_COUNT="$(docker exec "$PG_CONTAINER" psql -U postgres -d travel_archive_restore -Atqc \
  "select count(*) from information_schema.tables where table_schema='public'")"
test "$TABLE_COUNT" -ge "$MIN_TABLE_COUNT"

docker volume create "$UPLOAD_VOLUME" >/dev/null
docker run --rm \
  -v "$UPLOAD_VOLUME:/restore" \
  -v "$BACKUP_RUN_DIR:/backup:ro" \
  alpine:3.21 tar -C /restore -xzf /backup/uploads.tar.gz

printf 'restore drill passed: tables=%s\n' "$TABLE_COUNT"
