# Mac 로컬 개발 DB 설정

이 문서는 현재 소스의 두 지원 DB lineage와 그에 맞는 profile을 설명한다. 기존 `travel-archive-db`와 그 volume에는 사용자 데이터가 있을 수 있으므로 삭제, 초기화, Flyway history 수정 없이 보존한다.

## 두 지원 lineage — `local` vs `dev`

backend는 두 개의 profile로 두 lineage를 지원한다. 어느 한 쪽을 골라서 사용한다.

| Profile | 용도 | Flyway | `ddl-auto` | 대상 DB |
|---------|------|--------|------------|---------|
| `local` (legacy 호환) | 기존 V1–V5 Flyway 이력을 가진 legacy DB 연결 | **disabled** (`application-local.yml`) | `validate` (`application.yml` 상속) | 기존 Mac `travel-archive-db` (V1–V5 이력) |
| `dev` (fresh / disposable, 기본값) | 빈 또는 disposable DB에 Flyway V1→V3 적용 | **enabled** (`application.yml`) | `validate` (`application-dev.yml`) | `backend/docker-compose.test.yml` disposable PG, `docker-compose.smoke.yml` smoke stack |

- 기본 profile (profile 지정 없음) = `dev`와 동일: Flyway enabled + `ddl-auto: validate`. 빈 DB에 backend를 처음 연결할 때 사용한다.
- `local`은 backend가 Flyway를 끄고 Hibernate `validate`만으로 legacy schema와 entity를 대조한다. schema 변경/생성은 하지 않는다.
- `dev`는 backend가 Flyway V1→V3를 적용하고 Hibernate `validate`로 검증한다. `SeedDataLoader` 같은 별도 seeder는 더 이상 사용하지 않는다 (`V3__reference_data.sql`이 기준 데이터를 소유).
- 두 lineage 모두에서 `ddl-auto=update`, H2, `SeedDataLoader`, volume/DB 삭제, Flyway history 수정은 사용하지 않는다.

## 소스 기준 계약

- `backend/src/main/resources/application.yml`: Flyway `enabled=true`, `baseline-on-migrate=false`(기본값), `baseline-version=1`. `ddl-auto=validate`
- `backend/src/main/resources/application-local.yml`: `spring.flyway.enabled=false` (legacy 호환용, 다른 항목은 `application.yml` 상속)
- `backend/src/main/resources/application-dev.yml`: `ddl-auto=validate` 명시 재확인 (Flyway 설정은 `application.yml` 상속)
- `backend/src/main/resources/db/migration/V1__baseline.sql`: 애플리케이션 테이블 13개 생성
- `V2__legacy_reconciliation.sql`: legacy signature 확인과 checklist template unique constraint 보정 (현재 `is_nullable`/`data_type`을 TEXT로 받아 비교 — 이미 보정된 형태)
- `V3__reference_data.sql`: countries 20개, domestic regions 17개, checklist templates 2개와 items 24개 upsert
- `init/01-init.sh`: PostgreSQL role과 database만 생성. 테이블과 기준 데이터는 생성하지 않음
- 삭제된 `SeedDataLoader`: 실행되지 않음. 기준 데이터 소유자는 V3 migration임

V2의 legacy 가정은 현재 코드 기준으로 보정되어 있다. 새 DB/기존 DB에 backend를 연결할 때 V2 자체를 다시 의심하지 않는다.

## 기존 로컬 DB 보호

먼저 이름과 상태만 확인한다. 다음 명령은 container나 volume을 변경하지 않는다.

```bash
# backend/ 디렉터리에서 실행
cd backend
docker ps -a --filter name=^/travel-archive-db$ \
  --format 'container={{.Names}} image={{.Image}} status={{.Status}}'
docker inspect travel-archive-db --format '{{json .Mounts}}' 2>/dev/null || true

# host 5432 점유 확인
lsof -nP -iTCP:5432 -sTCP:LISTEN || true

# legacy Flyway history 버전만 확인 (DB mutate 없음)
PGPASSWORD='<travel-archive-db-password>' psql \
  -h 127.0.0.1 -p 5432 -U travel_archive -d travel_archive \
  -c "select installed_rank, version, description, success from flyway_schema_history order by installed_rank"
```

판정:

- `flyway_schema_history`에 `V1`–`V5` 행이 보이면 → `local` profile로 연결한다 (아래 §legacy DB 기동).
- 테이블이 비어 있고 history가 없으면 → disposable PostgreSQL + `dev` profile로 시작한다 (아래 §fresh / disposable).
- 그 외 lineage가 있으면 별도 호환/이관 결정을 한다.

`travel-archive-db`, 연결 volume 또는 host 5432가 이미 존재하면 새 Compose를 겹쳐 실행하지 않는다. 특히 다음 명령은 기존 개발 DB에 사용하지 않는다.

```text
docker compose down -v
docker volume rm <volume>
docker run --name travel-archive-db ...
flyway repair
flyway_schema_history 직접 수정 또는 삭제
```

root `.env`가 없는 현재 상태에서는 `docker-compose.infrastructure.yml`을 기동하지 않는다. 이 Compose는 `POSTGRES_ADMIN_PASSWORD`와 `DB_PASSWORD`가 필요하며 5432를 고정 publish한다. 값은 실제 secret 저장소에서 주입하고 문서나 명령 이력에는 `<postgres-admin-password>`, `<travel-archive-db-password>` 같은 placeholder만 남긴다.

root `docker-compose.yml`은 외부 `home-postgres`에 연결되는 **프로덕션 앱 스택**이다. 로컬 dev DB를 띄우거나 멈추는 용도가 아니다.

## 운영 명령어 — read-only / startup / monitoring / shutdown / migration-test / smoke

모든 명령은 실행 디렉터리를 첫 줄에 명시한다. 임시 자원(Compose project, port, evidence 경로)은 UUID 기반 이름을 사용한다.

### 1. read-only 점검 (필수 선행)

backend를 띄우기 전에 대상 DB가 어떤 lineage인지 읽기 전용으로 확인한다.

```bash
# backend/ 디렉터리에서 실행
cd backend
docker ps -a --filter name=^/travel-archive-db$ \
  --format 'container={{.Names}} image={{.Image}} status={{.Status}}'
docker inspect travel-archive-db --format '{{json .Mounts}}' 2>/dev/null || true
lsof -nP -iTCP:5432 -sTCP:LISTEN || true
PGPASSWORD='<travel-archive-db-password>' psql \
  -h 127.0.0.1 -p 5432 -U travel_archive -d travel_archive \
  -c "select installed_rank, version, description, success from flyway_schema_history order by installed_rank"
```

### 2. 기동 (startup)

**Legacy DB 연결 — `local` profile**

```bash
# backend/ 디렉터리에서 실행
cd backend
export DB_URL="jdbc:postgresql://localhost:5432/travel_archive"
export DB_USERNAME="travel_archive"
export DB_PASSWORD="<travel-archive-db-password>"
export JWT_SECRET="<jwt-secret-at-least-32-chars>"
./gradlew bootRun --args='--spring.profiles.active=local' &
BACKEND_PID=$!
echo "backend_pid=$BACKEND_PID"
echo "$BACKEND_PID" > backend.pid
```

**Fresh / disposable DB — `dev` profile (기본값)**

```bash
# backend/ 디렉터리에서 실행 (disposable PG는 별도 스택에서 기동)
cd backend
export JWT_SECRET="<jwt-secret-at-least-32-chars>"
./gradlew bootRun --args='--spring.profiles.active=dev' &
BACKEND_PID=$!
echo "backend_pid=$BACKEND_PID"
echo "$BACKEND_PID" > backend.pid
```

backend를 띄우기 전 disposable PG가 필요한 경우 다음 절차로 함께 띄운다 (UUID project name).

```bash
# backend/ 디렉터리에서 실행
cd backend
TA_RUN_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
export COMPOSE_PROJECT_NAME="ta-pg-$TA_RUN_ID"
export TA_TEST_PORT="$(( (RANDOM % 20000) + 30000 ))"
docker compose -f docker-compose.test.yml \
  --project-name "$COMPOSE_PROJECT_NAME" up -d --wait
```

### 3. 모니터링

```bash
# backend/ 디렉터리에서 실행
cd backend
# health (read-only)
curl -fsS http://127.0.0.1:8080/api/health

# backend 로그 tail (다른 터미널)
tail -n 100 -f build/tmp/bootRun.log 2>/dev/null || true

# disposable PG의 Flyway history 확인 (`dev` profile 사용 시 V1, V2, V3 success 행)
PGPASSWORD='ta_test_only_password' psql \
  -h 127.0.0.1 -p "$TA_TEST_PORT" -U ta_test -d travel_archive_test \
  -c "select installed_rank, version, description, success from flyway_schema_history order by installed_rank"
```

legacy DB의 Flyway history는 backend 기동 중에도 변하지 않는다 (`local` profile은 Flyway disabled).

### 4. 종료 (shutdown-by-PID)

`backend.pid`에 기록한 PID를 기반으로 종료한다. `kill -9`, container/DB 삭제, `docker compose down -v`는 사용하지 않는다.

```bash
# backend/ 디렉터리에서 실행
cd backend
if [[ -f backend.pid ]]; then
  BACKEND_PID="$(cat backend.pid)"
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  rm -f backend.pid
fi
pgrep -af 'travel-archive.*bootRun' || echo "no backend process"

# disposable PG 종료 (UUID project 단위 teardown, --remove-orphans 만 사용)
docker compose -f docker-compose.test.yml \
  --project-name "$COMPOSE_PROJECT_NAME" down --remove-orphans
unset COMPOSE_PROJECT_NAME TA_TEST_PORT
```

### 5. 격리 migration test (isolated clean-DB)

빈 PostgreSQL에서 Flyway V1→V3과 Hibernate `validate`가 깨끗이 통과하는지 검증한다. 기존 `travel-archive-db`나 `home-postgres`를 건드리지 않고 UUID project name으로 새 스택을 만든다.

```bash
# backend/ 디렉터리에서 실행
cd backend
./scripts/test-with-postgres.sh \
  --evidence "$HOME/.cache/travel-archive/test-with-postgres.$(date +%Y%m%d-%H%M%S).log" \
  --tests com.travelarchive.SchemaMigrationTest
```

성공 시 기대 상태:

- 애플리케이션 테이블 13개와 `flyway_schema_history` 존재
- `flyway_schema_history`에 V1, V2, V3 SQL success 행
- 기준 데이터 count 20 / 17 / 2 / 24
- Hibernate schema validation 성공
- disposable PG는 스크립트 종료 시 UUID project 단위로 자동 teardown

### 6. 격리 smoke (isolated full-stack smoke)

disposable PG + backend + frontend를 UUID project name으로 띄우고 health/401/CSRF/signup/me를 검증한다. `docker-compose.smoke.yml`은 backend에 `SPRING_PROFILES_ACTIVE=dev`를 주입하므로 `dev` lineage로 동작한다.

```bash
# 프로젝트 루트에서 실행
cd "$(git rev-parse --show-toplevel)"
TA_SMOKE_RUN_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
export TA_SMOKE_RUN_ID
export TA_SMOKE_PORT="$(( (RANDOM % 10000) + 40000 ))"
docker compose -f docker-compose.smoke.yml \
  --project-name "ta-smoke-$TA_SMOKE_RUN_ID" up -d --wait
```

검증:

```bash
# 프로젝트 루트에서 실행
cd "$(git rev-parse --show-toplevel)"
curl -fsS "http://127.0.0.1:${TA_SMOKE_PORT}/"
docker compose -f docker-compose.smoke.yml \
  --project-name "ta-smoke-$TA_SMOKE_RUN_ID" \
  exec -T backend curl --fail --silent http://localhost:8080/api/health
```

종료는 UUID project 단위로만:

```bash
# 프로젝트 루트에서 실행
cd "$(git rev-parse --show-toplevel)"
docker compose -f docker-compose.smoke.yml \
  --project-name "ta-smoke-$TA_SMOKE_RUN_ID" down --remove-orphans
unset TA_SMOKE_RUN_ID TA_SMOKE_PORT
```

> **금지**: smoke stack은 UUID project에서만 기동/종료한다. legacy DB가 들어 있는 container (`travel-archive-db`)나 root production stack (`docker-compose.yml`의 `travel-archive-backend`/`travel-archive-frontend`)을 mutate하지 않는다.

## 신규 빈 개발 DB

신규 DB가 필요하면 기존 container/volume/5432와 분리된 disposable PostgreSQL을 사용한다. 저장소에는 이를 위한 `backend/docker-compose.test.yml`과 UUID별 자원을 정리하는 `backend/scripts/test-with-postgres.sh`가 있다. 위 §격리 migration test 절차를 그대로 따른다.

정상 clean migration의 기대 history는 BASELINE 행이 아니라 V1, V2, V3 SQL migration이다. 빈 DB에서는 `baseline-on-migrate`를 켜지 않는다.

## 기존 non-empty DB 채택 (Flyway history가 없는 경우에만)

기존 schema에 `flyway_schema_history`가 없을 때만 가능한 별도 절차다. 먼저 검증된 DB 및 uploads 백업을 확보하고, 아래 preflight를 읽기 전용으로 실행한다.

```bash
# 프로젝트 루트에서 실행
cd "$(git rev-parse --show-toplevel)"
docker compose -f docker-compose.infrastructure.yml exec -T \
  -e PGPASSWORD='<travel-archive-db-password>' postgres \
  psql -h 127.0.0.1 -U travel_archive -d travel_archive \
  -v ON_ERROR_STOP=1 \
  < backend/src/main/resources/db/preflight/legacy_v1_signature.sql
```

preflight가 성공한 maintenance window에 한해서만 backend 프로세스에 `FLYWAY_BASELINE_ON_MIGRATE=true`를 일시 설정한다. Flyway는 version 1 BASELINE 행을 기록하고 V1을 실행하지 않은 뒤 V2와 V3를 적용한다. 적용 후 즉시 기본값 `false`로 되돌린다.

이미 Flyway V1–V5 같은 다른 history가 있는 DB에는 이 채택 절차를 사용하지 않는다 — 그 경우는 §legacy DB 기동 (`local` profile)을 따른다. history가 현재 migration 이름/checksum과 다르면 repair나 강제 baseline으로 맞추지 말고 별도 호환/이관 결정을 한다.