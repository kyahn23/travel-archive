#!/usr/bin/env bash

set -eEuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TA_SMOKE_RUN_ID="$(uuidgen 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())')"
TA_SMOKE_RUN_ID="$(printf '%s' "$TA_SMOKE_RUN_ID" | tr '[:upper:]' '[:lower:]')"
TA_SMOKE_PORT="$(( (RANDOM % 20000) + 30000 ))"
TA_SMOKE_PROJECT="ta-smoke-$TA_SMOKE_RUN_ID"
EVIDENCE="${EVIDENCE:-${TMPDIR:-/tmp}/travel-archive-smoke-$TA_SMOKE_RUN_ID.txt}"
JAR="$(mktemp "${TMPDIR:-/tmp}/ta-smoke-cookie.XXXXXX")"

export TA_SMOKE_RUN_ID TA_SMOKE_PORT

cleanup() {
  local rc=$?
  docker compose -f "$ROOT/docker-compose.smoke.yml" --project-name "$TA_SMOKE_PROJECT" down -v >>"$EVIDENCE" 2>&1 || true
  rm -f "$JAR"
  exit "$rc"
}
trap cleanup EXIT INT TERM

run() {
  printf '$ %q ' "$@" >>"$EVIDENCE"
  printf '\n' >>"$EVIDENCE"
  "$@" >>"$EVIDENCE" 2>&1
}

: >"$EVIDENCE"
run docker compose -f "$ROOT/docker-compose.smoke.yml" --project-name "$TA_SMOKE_PROJECT" up -d --build --wait

BASE_URL="http://127.0.0.1:$TA_SMOKE_PORT"
test "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/")" = 200
test "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/health")" = 200
test "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/auth/me")" = 401

curl -fsS -c "$JAR" "$BASE_URL/api/auth/csrf" >/dev/null
CSRF_TOKEN="$(awk '$6 == "XSRF-TOKEN" {print $7}' "$JAR" | tail -1)"
test -n "$CSRF_TOKEN"

EMAIL="smoke-$TA_SMOKE_RUN_ID@example.test"
SIGNUP_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' -b "$JAR" -c "$JAR" \
  -H 'Content-Type: application/json' -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"Smoke-password-123!\",\"nickname\":\"smoke\"}" \
  "$BASE_URL/api/auth/signup")"
test "$SIGNUP_STATUS" = 200
test "$(curl -sS -o /dev/null -w '%{http_code}' -b "$JAR" "$BASE_URL/api/auth/me")" = 200

printf 'PASS base=%s signup=%s me=200\n' "$BASE_URL" "$SIGNUP_STATUS" | tee -a "$EVIDENCE"
