# Travel Archive - Backend

Spring Boot 4.0.6 기반 REST API 서버입니다.

## 사전 준비

| 소프트웨어 | 버전 | 설명 |
|---|---|---|
| Java | 17 | Spring Boot 빌드/Docker 런타임 기준. README 본문은 Java 17 기준. |
| PostgreSQL | 14+ | `local` profile 대상 DB. Docker로도 대체 가능 (아래 두 lineage 참고) |
| Gradle | 9.5+ | `./gradlew` wrapper로 대체 가능 |
| Docker | 최신 | disposable PostgreSQL 실행용 |

## 의존성

- Spring Boot Web, Security, Data JPA, Validation
- PostgreSQL Driver
- **Lombok** — 보일러플레이트 제거 (`@Getter`, `@NoArgsConstructor` 등)

## 데이터베이스 lineage — 두 개의 지원 경로

backend는 두 개의 profile로 두 lineage를 지원한다. 어느 한 쪽을 골라서 사용한다.

| Profile | 용도 | Flyway | `ddl-auto` | 사용 대상 DB |
|---------|------|--------|------------|--------------|
| `local` (legacy 호환) | 기존 V1–V5 Flyway 이력을 가진 legacy DB에 연결 | **disabled** (`application-local.yml`) | `validate` (`application.yml` 상속) | 기존 Mac `travel-archive-db` (V1–V5 이력) |
| `dev` (fresh / disposable) | 빈 또는 disposable DB에 Flyway로 V1→V3 적용 | **enabled** (`application.yml`) | `validate` (`application-dev.yml`) | `backend/docker-compose.test.yml` disposable PG, `docker-compose.smoke.yml` smoke stack |

- 기본 profile (profile 지정 없음) = `dev`와 동일: Flyway enabled + `ddl-auto: validate`. 빈 DB에 backend를 처음 연결할 때 사용한다.
- `local`은 backend가 Flyway를 끄고 Hibernate `validate`만으로 legacy schema와 entity를 대조한다. schema 변경/생성은 하지 않는다.
- `dev`는 backend가 Flyway V1→V3를 적용하고 Hibernate `validate`로 검증한다. `SeedDataLoader` 같은 별도 seeder는 더 이상 사용하지 않는다 (`V3__reference_data.sql`이 기준 데이터를 소유).
- 어떤 profile이든 `ddl-auto=update`, H2, `SeedDataLoader`, volume/DB 삭제, Flyway history 수정은 사용하지 않는다.

> **참고**: 프로젝트 루트의 `docker-compose.yml`은 외부 `home-postgres`에 연결되는 **프로덕션 앱 스택**이다. 로컬 dev DB를 띄우거나 멈추는 용도가 아니다. 로컬에서 PostgreSQL을 띄울 때는 `backend/docker-compose.test.yml` (UUID project name 기반 disposable PG)을 사용한다.

## 환경 변수

| 변수 | 설명 | 기본값 | 필수 여부 |
|------|------|--------|----------|
| `DB_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/travel_archive` | 아니오 |
| `DB_USERNAME` | 데이터베이스 사용자 | `travel_archive` | 아니오 |
| `DB_PASSWORD` | 데이터베이스 비밀번호 | `travel_archive` | 아니오 |
| `SERVER_PORT` | 서버 포트 | `8080` | 아니오 |
| `JWT_SECRET` | JWT 서명용 비밀키 (최소 32자) | - | **예** |
| `SPRING_PROFILES_ACTIVE` | `local` (legacy) 또는 `dev` (fresh). 생략 시 `dev` | - | 상황에 따라 |

`.env` 파일은 backend에 두지 않는다. `docker-compose.test.yml`은 `.env`를 읽지 않도록 작성되어 있으며 (`COMPOSE_DISABLE_ENV_FILE=1`), `application*.yml`도 `.env` 파일을 참조하지 않는다. JWT secret 등 비밀값은 셸 환경변수 또는 secret 저장소에서 직접 주입한다.

### 환경별 설정 예시

**Legacy DB (`local` profile)**

```bash
# backend/ 디렉터리에서 실행
cd backend
export DB_URL="jdbc:postgresql://localhost:5432/travel_archive"
export DB_USERNAME="travel_archive"
export DB_PASSWORD="travel_archive"
export JWT_SECRET="your-32-char-secret-key-here-change-me"
./gradlew bootRun --args='--spring.profiles.active=local'
```

**Fresh / disposable DB (`dev` profile, 기본값)**

```bash
# backend/ 디렉터리에서 실행 (disposable PG는 별도 스택에서 기동)
cd backend
export JWT_SECRET="your-32-char-secret-key-here-change-me"
./gradlew bootRun --args='--spring.profiles.active=dev'
```

**Windows PowerShell**

```powershell
$env:JWT_SECRET="your-32-char-secret-key-here-change-me"
./gradlew bootRun --args='--spring.profiles.active=local'
```

### 로컬에서 disposable PostgreSQL 띄우기

`backend/docker-compose.test.yml`은 named volume도 고정 host port도 가지지 않는 UUID 기반 disposable 스택이다. 기동 자체는 `backend/scripts/test-with-postgres.sh`가 담당하지만, psql로 직접 확인만 하고 싶다면 같은 패턴을 그대로 따라 한다.

```bash
# backend/ 디렉터리에서 실행
cd backend
TA_RUN_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
export COMPOSE_PROJECT_NAME="ta-pg-$TA_RUN_ID"
export TA_TEST_PORT="$(( (RANDOM % 20000) + 30000 ))"
docker compose -f docker-compose.test.yml \
  --project-name "$COMPOSE_PROJECT_NAME" up -d --wait
```

기동 후 host에서 psql로 접속한다.

```bash
# backend/ 디렉터리에서 실행
cd backend
PGPASSWORD='ta_test_only_password' psql \
  -h 127.0.0.1 -p "$TA_TEST_PORT" -U ta_test -d travel_archive_test \
  -c '\dt public.*'
```

종료는 PID 기반 cleanup 또는 project 단위 teardown을 사용한다 (`--rmi`나 외부 volume을 건드리지 않는다).

```bash
# backend/ 디렉터리에서 실행
cd backend
# PID 기반 종료 (backend process)
BACKEND_PID="$(pgrep -f 'travel-archive.*bootRun' | head -n1)"
[[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" && wait "$BACKEND_PID" 2>/dev/null

# disposable PG 종료 (UUID project 단위 teardown, 볼륨 포함)
docker compose -f docker-compose.test.yml \
  --project-name "$COMPOSE_PROJECT_NAME" down -v --remove-orphans
```

> **금지**: 다음 명령은 persistent stack이나 legacy DB lineage에서 사용하지 않는다. UUID 기반 disposable stack은 teardown 시 `down -v --remove-orphans`로 볼륨까지 정리할 수 있다.
>
> ```text
> docker compose down -v                              # persistent stack에서만 금지; disposable stack은 위 예시로 정리
> docker volume rm <volume>                           # volume 직접 삭제
> docker run --name travel-archive-db ...             # legacy container를 직접 mutate
> flyway repair                                       # Flyway history 수정
> flyway_schema_history 직접 수정 또는 삭제
> ```
>
> legacy DB가 들어 있는 container (`travel-archive-db`)와 그 volume, host 5432 충돌 회피 외에는 root `docker-compose.yml`로 기동/조작하지 않는다.

## 실행 방법

### 1. read-only 점검 (필수 선행)

backend를 띄우기 전에 대상 DB가 어떤 lineage인지 읽기 전용으로 확인한다. `travel-archive-db`는 mutate하지 않는다.

```bash
# backend/ 디렉터리에서 실행
cd backend
# legacy DB container 상태만 확인 (조작 금지)
docker ps -a --filter name=^/travel-archive-db$ \
  --format 'container={{.Names}} image={{.Image}} status={{.Status}}'

# host 5432 점유 확인
lsof -nP -iTCP:5432 -sTCP:LISTEN || true

# legacy Flyway history 버전만 확인 (DB mutate 없음)
PGPASSWORD='<legacy-db-password>' psql \
  -h 127.0.0.1 -p 5432 -U travel_archive -d travel_archive \
  -c "select installed_rank, version, description, success from flyway_schema_history order by installed_rank"
```

- `flyway_schema_history`에 `V1`–`V5` 행이 보이면 `local` profile로 연결한다.
- 테이블이 비어 있고 history가 없으면 `dev` profile + disposable PostgreSQL로 시작한다.
- V1–V5가 아닌 다른 lineage가 있다면 별도 호환/이관 결정을 한다 (이 문서 범위 밖).

### 2. 기동 (startup)

**Legacy DB 연결 (`local` profile)**

```bash
cd backend
export DB_URL="jdbc:postgresql://localhost:5432/travel_archive"
export DB_USERNAME="travel_archive"
export DB_PASSWORD="<legacy-db-password>"
export JWT_SECRET="your-32-char-secret-key-here-change-me"
./gradlew bootRun --args='--spring.profiles.active=local' > backend.log 2>&1 &
BACKEND_PID=$!
echo "backend_pid=$BACKEND_PID"
```

`backend.pid` 파일을 두면 shutdown-by-PID에 그대로 사용할 수 있다.

```bash
cd backend
echo $BACKEND_PID > backend.pid
```

**Fresh / disposable DB (`dev` profile, 기본값)**

```bash
cd backend
export JWT_SECRET="your-32-char-secret-key-here-change-me"
./gradlew bootRun --args='--spring.profiles.active=dev' > backend.log 2>&1 &
BACKEND_PID=$!
echo "backend_pid=$BACKEND_PID"
```

> **참고**: H2, `ddl-auto=update`, `SeedDataLoader` 경로는 어떤 profile에서도 사용하지 않는다. schema는 Flyway V1→V3 (`dev`) 또는 legacy history (`local`)가 소유하고, Hibernate는 `validate`만 한다.

### 3. 모니터링

backend는 health endpoint를 노출한다.

```bash
# backend/ 디렉터리에서 실행
cd backend
# health (read-only)
curl -fsS http://127.0.0.1:8080/api/health

# bootRun 로그 모니터링 (stdout 리다이렉트 기준)
# bootRun은 기본적으로 stdout으로 로그를 출력한다.
# 별도 터미널에서 기동 중인 프로세스 출력을 보거나,
# 위 기동 예시처럼 ./gradlew bootRun ... > backend.log 2>&1 & 로 리다이렉트한 경우:
tail -n 100 -f backend.log
```

legacy DB의 Flyway history는 backend 기동 중에도 변하지 않는다 (`local` profile은 Flyway disabled). `dev` profile로 띄운 경우에만 Flyway가 `flyway_schema_history`에 V1, V2, V3 성공 행을 추가한다.

```bash
# backend/ 디렉터리에서 실행
cd backend
PGPASSWORD='ta_test_only_password' psql \
  -h 127.0.0.1 -p "$TA_TEST_PORT" -U ta_test -d travel_archive_test \
  -c "select installed_rank, version, description, success from flyway_schema_history order by installed_rank"
```

### 4. 종료 (shutdown-by-PID)

`backend.pid`에 기록한 PID 또는 `pgrep`으로 잡은 PID를 기반으로 종료한다. `kill -9`나 container/DB 삭제는 사용하지 않는다.

```bash
cd backend
if [[ -f backend.pid ]]; then
  BACKEND_PID="$(cat backend.pid)"
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  rm -f backend.pid
fi
# 잔여 프로세스 확인
pgrep -af 'travel-archive.*bootRun' || echo "no backend process"
```

### 5. 격리 migration test (isolated clean-DB)

빈 PostgreSQL에서 Flyway V1→V3과 Hibernate `validate`가 깨끗이 통과하는지 검증한다. 기존 `travel-archive-db`나 `home-postgres`를 건드리지 않고 UUID project name으로 새 스택을 만든다.

```bash
cd backend
./scripts/test-with-postgres.sh \
  --evidence "$HOME/.cache/travel-archive/test-with-postgres.$(date +%Y%m%d-%H%M%S).log" \
  --tests com.travelarchive.SchemaMigrationTest
```

성공 시 기대 상태:

- 13개 application table + `flyway_schema_history` 존재
- `flyway_schema_history`에 V1, V2, V3 SQL success 행
- Hibernate schema validation 성공
- disposable PG는 스크립트 종료 시 UUID project 단위로 자동 teardown

> **참고**: `V2__legacy_reconciliation.sql`의 legacy 가정은 현재 코드 기준으로 보정되어 있어 clean DB에서도 V1→V3 마이그레이션이 깨끗이 통과한다. evidence log로 결과를 확인한다.

### 6. 격리 smoke (isolated full-stack smoke)

disposable PG + backend + frontend를 UUID project name으로 띄우고 health/401/CSRF/signup/me를 검증한다.

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
curl -fsS "http://127.0.0.1:${TA_SMOKE_PORT}/"
curl -fsS "http://127.0.0.1:${TA_SMOKE_PORT}/api/health" 2>/dev/null || \
  docker compose -f docker-compose.smoke.yml \
    --project-name "ta-smoke-$TA_SMOKE_RUN_ID" \
    exec -T backend curl --fail --silent http://localhost:8080/api/health
```

종료는 UUID project 단위로만:

```bash
cd "$(git rev-parse --show-toplevel)"
docker compose -f docker-compose.smoke.yml \
  --project-name "ta-smoke-$TA_SMOKE_RUN_ID" down -v --remove-orphans
unset TA_SMOKE_RUN_ID TA_SMOKE_PORT
```

> **금지**: smoke stack은 UUID project에서만 기동/종료한다. legacy DB가 들어 있는 container (`travel-archive-db`)나 root production stack (`docker-compose.yml`의 `travel-archive-backend`/`travel-archive-frontend`)을 mutate하지 않는다.

### 테스트

```bash
# backend/ 디렉터리에서 실행
cd backend
./gradlew test
```

### 프로덕션 빌드

```bash
# backend/ 디렉터리에서 실행
cd backend
./gradlew clean bootJar
java -jar build/libs/travel-archive-0.0.1-SNAPSHOT.jar
```

## 문제 해결

| 문제 | 원인 | 해결 방법 |
|---|---|---|
| `docker: command not found` | Docker 미설치 또는 WSL 통합 꺼짐 | Docker Desktop 설치/실행, WSL Integration ON |
| `Bind for 0.0.0.0:5432 failed` | disposable PG port가 host에 점유됨 | `TA_TEST_PORT` 또는 `TA_SMOKE_PORT`를 다른 값으로 재지정 (legacy DB port는 변경 금지) |
| `Connection refused` (DB) | disposable PostgreSQL이 아직 준비되지 않음 | `docker compose ... ps`로 `healthy` 확인 후 재시도 |
| `Permission denied` (gradlew) | 실행 권한 없음 | `chmod +x ./gradlew` |
| `JWT secret is not configured` | `JWT_SECRET` 미설정 | `export JWT_SECRET="your-32-char-secret-key"` |
| `Schema-validation: missing column [...]` | legacy DB schema가 entity와 불일치 | `local` profile에서 발생. legacy DB migration 결정 후 별도 호환 작업으로 처리. `dev` profile에서는 Flyway가 schema를 소유하므로 발생하지 않음 |
| `FlywayException: Validate failed: ...` | disposable DB가 Flyway history와 맞지 않음 | UUID project 단위로 teardown 후 `test-with-postgres.sh` 재실행. legacy DB에는 `flyway repair` 사용 금지 |
| `npm install`이 느림 | 네트워크 또는 레지스트리 문제 | `npm config set registry https://registry.npmjs.org` |

## API 개요

| 영역 | 엔드포인트 | 설명 |
|------|-----------|------|
| 인증 | `POST /api/auth/signup` | 회원가입 |
| 인증 | `POST /api/auth/login` | 로그인 |
| 인증 | `POST /api/auth/refresh` | 토큰 갱신 |
| 인증 | `POST /api/auth/logout` | 로그아웃 |
| 인증 | `GET /api/auth/me` | 현재 사용자 정보 |
| 여행 | `GET /api/trips` | 여행 목록 |
| 여행 | `POST /api/trips` | 여행 생성 |
| 여행 | `GET /api/trips/{id}` | 여행 상세 |
| 여행 | `PATCH /api/trips/{id}` | 여행 수정 |
| 여행 | `DELETE /api/trips/{id}` | 여행 삭제 |
| 여행 | `PATCH /api/trips/{id}/status` | 상태 변경 |
| 버킷 | `GET /api/buckets` | 버킷리스트 목록 |
| 버킷 | `POST /api/buckets` | 버킷리스트 생성 |
| 버킷 | `GET /api/buckets/{id}` | 버킷리스트 상세 |
| 버킷 | `PATCH /api/buckets/{id}` | 버킷리스트 수정 |
| 버킷 | `DELETE /api/buckets/{id}` | 버킷리스트 삭제 |
| 버킷 | `POST /api/buckets/{id}/convert-to-trip` | 여행으로 전환 |
| 체크리스트 | `GET /api/trips/{tripId}/checklists` | 체크리스트 조회/생성 |
| 체크리스트 | `PATCH /api/checklist-items/{id}` | 항목 토글 |
| 체크리스트 | `DELETE /api/checklist-items/{id}` | 항목 삭제 |
| 타임라인 | `GET /api/trips/{tripId}/timeline` | 타임라인 조회 |
| 타임라인 | `POST /api/trips/{tripId}/timeline-items` | 타임라인 항목 생성 |
| 타임라인 | `PATCH /api/timeline-items/{id}` | 타임라인 항목 수정 |
| 타임라인 | `DELETE /api/timeline-items/{id}` | 타임라인 항목 삭제 |
| 사진 | `POST /api/trips/{tripId}/cover-image` | 커버 이미지 업로드 |
| 사진 | `POST /api/timeline-items/{id}/photos` | 타임라인 사진 업로드 |
| 사진 | `GET /api/files/{photoId}` | 사진 조회 |
| 지도 | `GET /api/maps/world` | 세계 지도 집계 |
| 지도 | `GET /api/maps/domestic` | 국내 지도 집계 |
| 지도 | `GET /api/maps/regions/{mapKey}` | 지역 상세 |
| 통계 | `GET /api/statistics/summary` | 요약 통계 |
| 통계 | `GET /api/statistics/monthly` | 월별 통계 |
| 통계 | `GET /api/statistics/top-regions` | 인기 지역 |

## 파일 저장 위치

업로드된 사진은 웹 루트 외부에 저장됩니다.

```
backend/storage/uploads/{userId}/{tripId}/
```

## 데이터베이스 스키마

| Profile | Flyway | `ddl-auto` | Schema 소유 |
|---------|--------|------------|-------------|
| `local` (legacy 호환) | disabled | `validate` | legacy DB가 소유 (`flyway_schema_history`에 이미 V1–V5 존재) |
| `dev` (fresh / disposable, 기본값) | enabled | `validate` | Flyway V1 (`baseline.sql`), V2 (`legacy_reconciliation.sql`), V3 (`reference_data.sql`) |
| prod (운영) | enabled | `validate` | Flyway V1–V3 |

Hibernate는 어느 profile에서든 `validate`만 수행한다. `ddl-auto=update`, H2, `SeedDataLoader`는 사용하지 않는다 — 모두 legacy/구현 이전 상태다 (현재 코드 기준 권장되지 않음).

## 인증 방식

- JWT를 httpOnly 쿠키에 저장 (`access_token`, `refresh_token`)
- Access token 유효기간: 15분
- Refresh token 유효기간: 7일
- 모든 API는 쿠키 기반 인증 필요 (인증 엔드포인트 제외)
