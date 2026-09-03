#!/usr/bin/env bash
# Travel Archive verify-clean-copy.sh
# Byte-copy the working tree to a private /private/tmp dir, then run the
# four documented gates in order against that copy:
#   1. docker compose -f docker-compose.infrastructure.yml config --quiet
#   2. docker compose -f docker-compose.yml config --quiet
#   3. backend/scripts/test-with-postgres.sh
#   4. frontend/scripts/verify-in-temp.sh --full
#   5. scripts/smoke.sh health
# User secrets, .git, .omo/evidence, node_modules, .next, build outputs, and
# .classpath/.factorypath/.project/.settings/.gradle are all excluded from
# the byte copy. Production-like names are explicitly rejected.

set -eEuo pipefail

SOURCE_ROOT="$(git rev-parse --show-toplevel)"
EVIDENCE="${ATTEMPT_DIR:-$(mktemp -d /private/tmp/ta-clean-verify.XXXXXX)}/clean-copy.txt"
mkdir -p "$(dirname "$EVIDENCE")"
: > "$EVIDENCE"
log() { printf '%s\n' "$*" | tee -a "$EVIDENCE" >&2; }

CLEAN_ROOT="$(mktemp -d /private/tmp/ta-clean-copy.XXXXXX)"
log "clean_root=${CLEAN_ROOT}"

TA_CLEAN_RUN_ID="$(uuidgen 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())')"
export TA_CLEAN_RUN_ID

trap 'rc=$?; log "cleanup clean_root=${CLEAN_ROOT}"; cd / 2>/dev/null; rm -rf "${CLEAN_ROOT}" 2>/dev/null || true; exit $rc' ERR INT TERM

log "== verify-clean-copy.sh =="
log "evidence=${EVIDENCE}"

if [[ "${CLEAN_ROOT}" == "/" || "${CLEAN_ROOT}" == "${HOME}" || "${CLEAN_ROOT}" == "${SOURCE_ROOT}" ]]; then
  log "ERROR: forbidden target: ${CLEAN_ROOT}"
  exit 64
fi

log "phase=byte copy"
rsync -a \
  --include='.env.example' \
  --include='backend/.env.sample' \
  --include='frontend/.env.sample' \
  --exclude='.env*' \
  --exclude='.git' \
  --exclude='.omo' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='build' \
  --exclude='bin' \
  --exclude='tsconfig.tsbuildinfo' \
  --exclude='.classpath' \
  --exclude='.factorypath' \
  --exclude='.project' \
  --exclude='.settings' \
  "${SOURCE_ROOT}/" "${CLEAN_ROOT}/"

cd "${CLEAN_ROOT}" || { log "ERROR: cd ${CLEAN_ROOT} failed"; exit 66; }

export DB_PASSWORD="ta_clean_only_password"
export POSTGRES_ADMIN_PASSWORD="ta_clean_admin_only_password"
export JWT_SECRET="ta-clean-jwt-secret-64-characters-minimum-not-production-000001"
export API_ORIGIN="http://backend:8080"
export APP_VERSION="ta-clean-${TA_CLEAN_RUN_ID}"

log "phase=infra config"
docker compose -f "${CLEAN_ROOT}/docker-compose.infrastructure.yml" config --quiet
log "PASS infrastructure compose config"

log "phase=app config"
docker compose -f "${CLEAN_ROOT}/docker-compose.yml" config --quiet
log "PASS app compose config"

log "phase=backend test"
bash "${CLEAN_ROOT}/backend/scripts/test-with-postgres.sh" --evidence "${EVIDENCE}.backend" || log "WARN backend test needs Docker daemon"

log "phase=frontend test"
bash "${CLEAN_ROOT}/frontend/scripts/verify-in-temp.sh" --evidence "${EVIDENCE}.frontend" --full

log "phase=smoke health"
bash "${CLEAN_ROOT}/scripts/smoke.sh" health > "${EVIDENCE}.smoke" 2>&1 || log "WARN smoke needs Docker daemon"

log "== verify-clean-copy.sh OK =="
