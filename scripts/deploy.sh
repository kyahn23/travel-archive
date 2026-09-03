#!/usr/bin/env bash

set -eEuo pipefail

: "${SERVER_HOST:?SERVER_HOST=user@host is required}"
: "${APP_VERSION:?APP_VERSION=merge commit SHA is required}"

REMOTE_DIR="${REMOTE_DIR:-travel-archive}"

ssh "$SERVER_HOST" bash -s -- "$REMOTE_DIR" "$APP_VERSION" <<'REMOTE'
set -eEuo pipefail

REMOTE_DIR="$1"
APP_VERSION="$2"
if [[ "$REMOTE_DIR" = /* ]]; then
  cd "$REMOTE_DIR"
else
  cd "$HOME/$REMOTE_DIR"
fi

test -f .env.app
chmod 600 .env.app

PREVIOUS_VERSION=""
if [[ -s .current-version ]]; then
  PREVIOUS_VERSION="$(tr -d '\r\n' < .current-version)"
fi

rollback() {
  local rc=$?
  if [[ -n "$PREVIOUS_VERSION" ]]; then
    echo "deployment failed; restoring $PREVIOUS_VERSION" >&2
    APP_VERSION="$PREVIOUS_VERSION" docker compose --env-file .env.app up -d --no-build || true
  else
    echo "first deployment failed; no previous release exists" >&2
  fi
  exit "$rc"
}
trap rollback ERR INT TERM

export APP_VERSION
docker compose --env-file .env.app config --quiet
docker compose --env-file .env.app build backend frontend
docker compose --env-file .env.app up -d --no-build --wait

docker compose --env-file .env.app exec -T backend curl --fail --silent http://localhost:8080/api/health >/dev/null
docker compose --env-file .env.app exec -T frontend node -e \
  "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
docker compose --env-file .env.app exec -T frontend node -e \
  "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

printf '%s\n' "$APP_VERSION" > .current-version.next
mv .current-version.next .current-version
trap - ERR INT TERM
echo "deployed $APP_VERSION"
REMOTE
