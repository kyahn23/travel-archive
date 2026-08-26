# N100 PostgreSQL 이전: Mac Docker에서 N100으로

이 runbook은 로컬 `travel-archive-db`를 보존하면서 N100에 PostgreSQL 기반을 준비하거나, 승인된 snapshot을 별도 복구 시험하는 절차다. 기존 container, volume, DB에는 사용자 데이터가 있다고 가정하며 자동 초기화하지 않는다.

## 1. 먼저 선택할 경로

- **신규 운영 DB**: N100에 빈 `travel_archive` DB를 만들고 현재 Flyway V1→V2→V3를 적용한다. 로컬 사용자 데이터는 옮기지 않는다.
- **로컬 snapshot 이관**: 로컬 DB의 schema, data, `flyway_schema_history`를 그대로 dump/restore한다. 현재 저장소 migration과 history가 호환되는지 확인하기 전에는 backend를 연결하지 않는다.

두 경로를 같은 DB에 섞지 않는다. 로컬 DB에 기존 V1–V5 history가 있고 저장소의 V1–V3과 이름/checksum이 다르다면 신규 운영 DB에는 로컬 dump를 restore하지 않으며, snapshot은 별도 archive/검증 DB에만 복구한다.

## 2. 변경 전 읽기 전용 조사

Mac:

```bash
docker ps -a --filter name=^/travel-archive-db$ \
  --format 'container={{.Names}} image={{.Image}} status={{.Status}}'
docker inspect travel-archive-db --format '{{json .Mounts}}'
docker exec travel-archive-db psql \
  -U travel_archive -d travel_archive -P pager=off \
  -c 'select installed_rank, version, type, script, checksum, success from flyway_schema_history order by installed_rank'
```

N100:

```bash
docker ps -a --format 'container={{.Names}} image={{.Image}} status={{.Status}}'
docker volume ls --format 'volume={{.Name}}'
docker network ls --format 'network={{.Name}}'
ss -ltn
```

`home-postgres`, 관련 volume, `travel_archive` DB/role, 용도를 모르는 `.env`, 5432 충돌이 있으면 변경하지 않고 중지한다. 다음은 이 문서의 기본 절차에 포함하지 않는다.

```text
docker compose down -v
docker volume prune
docker system prune
flyway repair
flyway_schema_history 수정 또는 삭제
기존 DB drop/recreate
```

## 3. N100 신규 PostgreSQL 기반

root `.env`가 없다면 승인된 secret 관리 경로에서 다음 값을 준비한다. 실제 값은 문서나 작업 로그에 출력하지 않는다.

```dotenv
POSTGRES_ADMIN_PASSWORD=<postgres-admin-password>
DB_PASSWORD=<travel-archive-db-password>
```

현재 `docker-compose.infrastructure.yml`은 host 5432를 publish한다. 같은 `infrastructure` network의 backend는 host publish가 필요 없으므로 운영 기동 전 `ports`를 제거하거나 승인된 loopback으로 제한한다.

기존 자원 없음, secret 준비, port 정책이 확인된 뒤에만 실행한다.

```bash
cd <project-root>
docker compose -f docker-compose.infrastructure.yml config --quiet
docker compose -f docker-compose.infrastructure.yml up -d
docker compose -f docker-compose.infrastructure.yml ps
```

신규 volume의 첫 기동에서 `init/01-init.sh`는 `travel_archive` role과 그 role이 소유한 `travel_archive` DB만 만든다. 테이블과 seed는 만들지 않는다. 기존 volume에서는 init script가 다시 실행되지 않는다.

```bash
docker exec home-postgres psql \
  -U postgres_admin -d postgres -P pager=off \
  -c "select rolname from pg_roles where rolname in ('postgres_admin','travel_archive') order by 1" \
  -c "select datname, pg_get_userbyid(datdba) owner from pg_database where datname='travel_archive'"

docker exec home-postgres psql \
  -U travel_archive -d travel_archive -Atqc \
  "select count(*) from information_schema.tables where table_schema='public'"
```

backend를 한 번도 기동하지 않은 신규 DB의 마지막 결과는 `0`이어야 한다. 다르면 기존 데이터로 취급하고 중지한다.

## 4. 신규 DB에 Flyway 적용

현재 소스 계약은 다음과 같다.

- 기본 `FLYWAY_BASELINE_ON_MIGRATE=false`
- V1: 13개 애플리케이션 테이블
- V2: legacy signature 확인 및 checklist template unique constraint
- V3: 기준 데이터 20 / 17 / 2 / 24 upsert
- Hibernate: `ddl-auto=validate`
- `SeedDataLoader`: 삭제되어 실행되지 않음

빈 DB에는 baseline을 사용하지 않는다. backend 시작 시 V1, V2, V3 SQL migration이 실행되어야 한다. 다만 현재 V2의 `is_nullable` type 처리와 `SchemaMigrationTest`의 BASELINE 기대가 clean DB 계약과 어긋나므로, isolated PostgreSQL 16에서 migration test가 통과한 검증된 build 전에는 N100 DB에 적용하지 않는다.

적용 후에는 다음을 읽기 전용으로 확인한다.

```bash
docker exec home-postgres psql \
  -U travel_archive -d travel_archive -P pager=off \
  -c 'select installed_rank, version, type, script, checksum, success from flyway_schema_history order by installed_rank' \
  -c "select count(*) from information_schema.tables where table_schema='public'" \
  -c "select 'countries',count(*) from countries union all select 'domestic_regions',count(*) from domestic_regions union all select 'travel_checklist_templates',count(*) from travel_checklist_templates union all select 'travel_checklist_template_items',count(*) from travel_checklist_template_items"
```

기대값은 public table 14개(애플리케이션 13개 + Flyway history), V1/V2/V3 성공, 기준 데이터 20/17/2/24다.

## 5. 로컬 snapshot 생성

로컬 `travel-archive-db`는 변경하지 않고 custom-format dump를 host에 만든다. 파일명과 경로에는 secret을 넣지 않는다.

```bash
umask 077
cd <local-backup-path>
docker exec travel-archive-db pg_dump \
  -U travel_archive -d travel_archive \
  --format=custom --no-owner --no-privileges \
  > travel_archive.dump

shasum -a 256 travel_archive.dump > travel_archive.dump.sha256
```

`scripts/backup.sh`를 사용하면 산출물은 custom dump가 아니라 `travel_archive_<timestamp>.sql.gz`이다. 이 스크립트는 uploads/checksum/manifest/restore drill을 만들지 않고 7일 초과 dump를 삭제하므로, N100 이관의 유일한 백업으로 간주하지 않는다.

dump와 checksum을 승인된 암호화 전송 수단으로 N100의 `<n100-import-path>`에 전달하고, 복구 전에 확인한다.

```bash
cd <n100-import-path>
sha256sum -c travel_archive.dump.sha256
```

## 6. snapshot 복구 시험

snapshot은 현재 운영 `travel_archive` 위에 복구하지 않는다. PostgreSQL 16의 별도 빈 disposable DB/container를 준비하고 대상이 비어 있음을 확인한 뒤 실행한다.

```bash
docker exec <disposable-postgres-container> psql \
  -U <restore-admin-role> -d <restore-database> -Atqc \
  "select count(*) from information_schema.tables where table_schema='public'"

docker exec -i <disposable-postgres-container> pg_restore \
  --exit-on-error --single-transaction \
  --no-owner --no-privileges \
  -U <restore-role> -d <restore-database> \
  < <n100-import-path>/travel_archive.dump
```

첫 명령의 결과가 `0`이 아니면 restore하지 않는다. 실패 시 같은 target에 덮어 재시도하지 않고 상태를 조사한다.

복구 후 다음을 검증한다.

- dump의 Flyway version/script/checksum과 복구 DB history 일치
- 애플리케이션 테이블 13개와 예상 데이터 count
- users, refresh token, trip, photo 등 사용자 데이터의 포함 범위
- 별도 uploads archive와 DB snapshot의 시점 일치
- 해당 history와 연결할 backend build의 Flyway validate 성공

plain SQL gzip인 `scripts/backup.sh` 산출물을 시험할 때는 빈 disposable DB에 다음처럼 복구한다.

```bash
gzip -dc <travel-archive-backup.sql.gz> | \
  docker exec -i <disposable-postgres-container> \
  psql -v ON_ERROR_STOP=1 --single-transaction \
  -U <restore-role> -d <restore-database>
```

## 7. 기존 non-empty production schema baseline

local dump restore와는 다른 경로다. `flyway_schema_history`가 없지만 지원 대상 13개 테이블이 있는 DB만 `legacy_v1_signature.sql` preflight 대상이다.

```bash
docker compose -f docker-compose.infrastructure.yml exec -T \
  -e PGPASSWORD='<travel-archive-db-password>' postgres \
  psql -h 127.0.0.1 -U travel_archive -d travel_archive \
  -v ON_ERROR_STOP=1 \
  < backend/src/main/resources/db/preflight/legacy_v1_signature.sql
```

검증된 DB/uploads 백업과 maintenance window가 있고 preflight가 성공한 경우에만 backend에 `FLYWAY_BASELINE_ON_MIGRATE=true`를 한 번 설정한다. Flyway는 version 1 BASELINE을 기록해 V1을 건너뛰고 V2/V3를 적용한다. 완료 후 `false`로 되돌린다.

이미 Flyway V1–V5 history가 있는 로컬 snapshot에는 baseline을 사용하지 않는다.

## 8. 운영 백업 전제

현재 스크립트만으로는 복구 가능한 운영 백업 체인이 완성되지 않는다. 운영 데이터 입력 전 최소한 다음이 필요하다.

- PostgreSQL dump와 SHA-256
- 같은 시점의 uploads archive
- DB/app version과 artifact 목록을 기록한 manifest
- source host와 분리된 copy
- disposable PostgreSQL 16에서의 실제 restore 및 application validation evidence

복구 완료 판정은 파일 존재가 아니라 checksum, restore 성공, Flyway history, schema/data count, uploads 일치까지 포함한다.
