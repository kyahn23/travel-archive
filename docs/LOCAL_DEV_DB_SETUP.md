# Mac 로컬 개발 DB 설정

이 문서는 현재 소스의 PostgreSQL/Flyway 계약을 설명한다. 기존 `travel-archive-db`와 그 volume에는 사용자 데이터가 있을 수 있으므로 삭제, 초기화, Flyway history 수정 없이 보존한다.

## 소스 기준 계약

- `backend/src/main/resources/application.yml`: Flyway 활성화, `baseline-on-migrate=false`(기본값), baseline version 1
- `backend/src/main/resources/application-dev.yml`: Hibernate `ddl-auto=validate`
- `backend/src/main/resources/db/migration/V1__baseline.sql`: 애플리케이션 테이블 13개 생성
- `V2__legacy_reconciliation.sql`: legacy signature 확인과 checklist template unique constraint 보정
- `V3__reference_data.sql`: countries 20개, domestic regions 17개, checklist templates 2개와 items 24개 upsert
- `init/01-init.sh`: PostgreSQL role과 database만 생성. 테이블과 기준 데이터는 생성하지 않음
- 삭제된 `SeedDataLoader`: 실행되지 않음. 기준 데이터 소유자는 V3 migration임

현재 V2는 `information_schema.columns.is_nullable`의 문자열을 Boolean 변수로 받으므로 실제 PostgreSQL에서 실패할 수 있다. V2와 clean migration 검증이 통과하기 전에는 새 DB나 기존 DB에 backend를 연결하지 않는다.

## 기존 로컬 DB 보호

먼저 이름과 상태만 확인한다. 다음 명령은 container나 volume을 변경하지 않는다.

```bash
docker ps -a --filter name=^/travel-archive-db$ \
  --format 'container={{.Names}} image={{.Image}} status={{.Status}}'
docker inspect travel-archive-db --format '{{json .Mounts}}'
```

`travel-archive-db`, 연결 volume 또는 host 5432가 이미 존재하면 새 Compose를 겹쳐 실행하지 않는다. 특히 다음 명령은 기존 개발 DB에 사용하지 않는다.

```text
docker compose down -v
docker volume rm <volume>
flyway repair
flyway_schema_history 직접 수정 또는 삭제
```

root `.env`가 없는 현재 상태에서는 `docker-compose.infrastructure.yml`을 기동하지 않는다. 이 Compose는 `POSTGRES_ADMIN_PASSWORD`와 `DB_PASSWORD`가 필요하며 5432를 고정 publish한다. 값은 실제 secret 저장소에서 주입하고 문서나 명령 이력에는 `<postgres-admin-password>`, `<travel-archive-db-password>` 같은 placeholder만 남긴다.

## 신규 빈 개발 DB

신규 DB가 필요하면 기존 container/volume/5432와 분리된 disposable PostgreSQL을 사용한다. 저장소에는 이를 위한 `backend/docker-compose.test.yml`과 UUID별 자원을 정리하는 `backend/scripts/test-with-postgres.sh`가 있다.

```bash
cd backend
./scripts/test-with-postgres.sh \
  --evidence <absolute-evidence-path> \
  --tests com.travelarchive.SchemaMigrationTest
```

이 경로는 운영/개발용 `travel-archive-db`나 `home-postgres`를 대상으로 하지 않는다. 단, 현재 V2 문제와 `SchemaMigrationTest`의 BASELINE 기대값이 기본 clean DB 동작과 맞지 않으므로 성공을 전제하지 않는다.

정상 clean migration의 기대 history는 BASELINE 행이 아니라 V1, V2, V3 SQL migration이다. 빈 DB에서는 `baseline-on-migrate`를 켜지 않는다. 성공 후 기대 상태는 다음과 같다.

- 애플리케이션 테이블 13개와 `flyway_schema_history`
- V1, V2, V3 성공 행
- 기준 데이터 count 20 / 17 / 2 / 24
- Hibernate schema validation 성공

## 기존 non-empty DB 채택

기존 schema에 `flyway_schema_history`가 없을 때만 가능한 별도 절차다. 먼저 검증된 DB 및 uploads 백업을 확보하고, 아래 preflight를 읽기 전용으로 실행한다.

```bash
docker compose -f docker-compose.infrastructure.yml exec -T \
  -e PGPASSWORD='<travel-archive-db-password>' postgres \
  psql -h 127.0.0.1 -U travel_archive -d travel_archive \
  -v ON_ERROR_STOP=1 \
  < backend/src/main/resources/db/preflight/legacy_v1_signature.sql
```

preflight가 성공한 maintenance window에 한해서만 backend 프로세스에 `FLYWAY_BASELINE_ON_MIGRATE=true`를 일시 설정한다. Flyway는 version 1 BASELINE 행을 기록하고 V1을 실행하지 않은 뒤 V2와 V3를 적용한다. 적용 후 즉시 기본값 `false`로 되돌린다.

이미 Flyway V1–V5 같은 다른 history가 있는 DB에는 이 채택 절차를 사용하지 않는다. history가 현재 migration 이름/checksum과 다르면 repair나 강제 baseline으로 맞추지 말고 별도 호환/이관 결정을 한다.
