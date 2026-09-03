#!/usr/bin/env bash
# Travel Archive backend test-with-postgres.sh
# Brings up an isolated PostgreSQL 16 in a private UUID project, runs the
# backend test suite against it in a byte-copied source tree, and tears it
# all down on exit.
#
# Usage:
#   ./scripts/test-with-postgres.sh --evidence <abs-path> \
#       [--tests <fqcn> [--tests <fqcn> ...]]
#
# Requirements:
#   - docker compose v2 on PATH
#   - no existing ta-test-* project name
#   - no env file (.env*) read; credentials hardcoded for test only

set -euo pipefail

EVIDENCE=""
TESTS=()
TMP_DIR=""

usage() {
  cat <<EOF
Usage: $0 --evidence <abs-path> [--tests <fqcn>...]

Required:
  --evidence <path>   Absolute file path to write command/exit/assertion log.

Optional:
  --tests <fqcn>      Limit gradle test run to specific class. May repeat.
  -h, --help          Show this help.
EOF
  exit 64
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --evidence) EVIDENCE="${2:-}"; shift 2 ;;
    --tests)    [[ $# -ge 2 ]] || usage; TESTS+=("$2"); shift 2 ;;
    -h|--help)  usage ;;
    *) echo "Unknown argument: $1" >&2; usage ;;
  esac
done

if [[ -z "$EVIDENCE" ]]; then echo "ERROR: --evidence is required" >&2; usage; fi
if [[ ! "$EVIDENCE" = /* ]]; then echo "ERROR: --evidence must be absolute" >&2; exit 64; fi

mkdir -p "$(dirname "$EVIDENCE")"
: > "$EVIDENCE"
log() { printf '%s\n' "$*" | tee -a "$EVIDENCE" >&2; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
log "== test-with-postgres.sh =="
log "backend_root=$BACKEND_ROOT"
log "evidence=$EVIDENCE"

if ! command -v docker >/dev/null 2>&1; then
  log "ERROR: docker not found on PATH" >&2
  exit 2
fi
if ! docker info >/dev/null 2>&1; then
  log "ERROR: docker daemon not reachable — start Docker and retry" >&2
  exit 2
fi

TA_RUN_ID="$(uuidgen 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())')"
TA_RUN_ID="$(printf '%s' "$TA_RUN_ID" | tr '[:upper:]' '[:lower:]')"
TA_PROJECT="ta-test-$TA_RUN_ID"
TA_TEST_PORT="$(( (RANDOM % 20000) + 30000 ))"
log "ta_run_id=$TA_RUN_ID"
log "ta_project=$TA_PROJECT"
log "ta_test_port=$TA_TEST_PORT"

export TA_RUN_ID
export TA_TEST_PORT
export COMPOSE_PROJECT_NAME="$TA_PROJECT"
export COMPOSE_DISABLE_ENV_FILE=1

step() {
  local label="$1"; shift
  log "----- $label -----"
  log "\$ $*"
  if "$@" >>"$EVIDENCE" 2>&1; then
    log "[exit 0] $label"
    return 0
  else
    local rc=$?
    log "[exit $rc] $label FAILED"
    return $rc
  fi
}

cleanup() {
  local rc=$?
  log "cleanup: bringing down $TA_PROJECT"
  docker compose -f "$BACKEND_ROOT/docker-compose.test.yml" \
    --project-name "$TA_PROJECT" down -v >>"$EVIDENCE" 2>&1 || true
  if [[ -n "$TMP_DIR" ]]; then
    log "cleanup tmp_dir=$TMP_DIR"
    rm -rf "$TMP_DIR" 2>/dev/null || true
  fi
  exit "$rc"
}
trap cleanup EXIT INT TERM

if docker compose -f "$BACKEND_ROOT/docker-compose.test.yml" \
    --project-name "$TA_PROJECT" ps --quiet 2>/dev/null | grep -q .; then
  log "ERROR: project $TA_PROJECT already has resources — abort" >&2
  exit 3
fi

step "compose up" docker compose \
  -f "$BACKEND_ROOT/docker-compose.test.yml" \
  --project-name "$TA_PROJECT" \
  up -d --wait

step "wait healthy" docker compose \
  -f "$BACKEND_ROOT/docker-compose.test.yml" \
  --project-name "$TA_PROJECT" \
  exec -T postgres pg_isready -U ta_test -d travel_archive_test

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ta-backend-check.XXXXXX")"
log "tmp_dir=$TMP_DIR"

rsync -a \
  --include='.env.example' \
  --exclude='.env*' \
  --exclude='build' \
  --exclude='bin' \
  --exclude='.gradle' \
  --exclude='.classpath' \
  --exclude='.factorypath' \
  --exclude='.project' \
  --exclude='.settings' \
  "$BACKEND_ROOT/" "$TMP_DIR/"

GRADLE_ARGS=(./gradlew --no-daemon clean test)
if [[ ${#TESTS[@]} -gt 0 ]]; then
  for test_name in "${TESTS[@]}"; do
    GRADLE_ARGS+=(--tests "$test_name")
  done
fi

if (
  cd "$TMP_DIR"
  export GRADLE_USER_HOME="$TMP_DIR/gradle-home"
  export DB_URL="jdbc:postgresql://127.0.0.1:${TA_TEST_PORT}/travel_archive_test"
  export DB_USERNAME=ta_test
  export DB_PASSWORD=ta_test_only_password
  export SPRING_PROFILES_ACTIVE=test
  step "gradle clean test" "${GRADLE_ARGS[@]}"
); then
  RC=0
else
  RC=$?
fi
log "gradle_rc=$RC"

exit "$RC"
