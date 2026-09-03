# Production PostgreSQL provisioning

이 문서는 `docker-compose.infrastructure.yml`, `init/01-init.sh`, Spring Boot Flyway 설정을 기준으로 한다. 기존 container, volume, database가 있으면 자동 삭제하거나 재생성하지 않고 중지해 소유권과 데이터를 먼저 확인한다.

## 1. 사전 조건

- PostgreSQL 16
- Docker Compose v2
- root `.env`에 실제 secret을 저장하되 Git에는 추가하지 않음
- `POSTGRES_ADMIN_PASSWORD`, `DB_PASSWORD`는 서로 다른 운영 secret
- 기존 `home-postgres`, PostgreSQL volume, `travel_archive` DB/role, host 5432 사용 여부를 읽기 전용으로 확인

문서와 예시에는 다음처럼 placeholder만 사용한다.

```dotenv
POSTGRES_ADMIN_PASSWORD=<postgres-admin-password>
DB_PASSWORD=<travel-archive-db-password>
JWT_SECRET=<jwt-secret-at-least-32-characters>
NEXT_PUBLIC_API_BASE_URL=<production-api-base-url>
```

현재 Compose는 PostgreSQL 5432를 host 전체에 publish한다. 운영에서는 backend가 external `infrastructure` network의 `home-postgres:5432`를 사용하므로, 기동 전에 `ports`를 제거하거나 승인된 loopback 바인딩으로 제한해야 한다.

## 2. role과 database 생성

신규 volume임과 이름 충돌이 없음을 확인한 경우에만 실행한다.

```bash
docker compose -f docker-compose.infrastructure.yml config --quiet
docker compose -f docker-compose.infrastructure.yml up -d
docker compose -f docker-compose.infrastructure.yml ps
```

PostgreSQL 공식 image는 신규 data directory에서만 `/docker-entrypoint-initdb.d`를 실행한다. `init/01-init.sh`가 만드는 것은 다음뿐이다.

- admin role/database: Compose의 `POSTGRES_USER=postgres_admin`, `POSTGRES_DB=postgres`
- application role: `travel_archive`
- application database: `travel_archive`, owner `travel_archive`

애플리케이션 테이블과 seed 데이터는 여기서 생성하지 않는다. 기존 volume에서는 init script가 재실행되지 않으므로, 누락된 DB/role을 자동 보정한다고 가정하지 않는다.

```bash
docker exec home-postgres psql \
  -U postgres_admin -d postgres -P pager=off \
  -c "select rolname from pg_roles where rolname in ('postgres_admin','travel_archive') order by 1" \
  -c "select datname, pg_get_userbyid(datdba) owner from pg_database where datname='travel_archive'"
```

## 3. 신규 빈 DB에 schema 적용

기본 설정은 `FLYWAY_BASELINE_ON_MIGRATE=false`다. backend 시작 시 Flyway가 V1부터 순서대로 실행하고 Hibernate는 결과를 validate한다.

| migration | 역할 |
|---|---|
| `V1__baseline.sql` | 애플리케이션 테이블 13개와 index 생성 |
| `V2__legacy_reconciliation.sql` | legacy column signature 확인, checklist template unique constraint 확인/추가 |
| `V3__reference_data.sql` | 국가·국내 지역·checklist template 기준 데이터 upsert |

삭제된 `SeedDataLoader`는 실행되지 않는다. 테이블 생성은 Hibernate나 init script가 아니라 Flyway가 담당하고, 기준 데이터는 V3가 담당한다.

현재 소스의 V2 type 처리와 clean DB migration test가 통과하기 전에는 운영 DB에 backend를 시작하지 않는다. 검증된 build에서 적용한 뒤 다음을 확인한다.

```sql
select installed_rank, version, type, script, checksum, success
from flyway_schema_history order by installed_rank;

select 'countries', count(*) from countries
union all select 'domestic_regions', count(*) from domestic_regions
union all select 'travel_checklist_templates', count(*) from travel_checklist_templates
union all select 'travel_checklist_template_items', count(*) from travel_checklist_template_items;
```

신규 빈 DB의 정상 history는 V1/V2/V3 SQL 행이며 BASELINE 행이 아니다.

## 4. 기존 non-empty schema 채택

`flyway_schema_history`가 없고 13개 테이블이 이미 존재하는 지원 대상 legacy DB에만 적용한다.

1. DB와 uploads의 검증된 백업 및 별도 restore drill을 완료한다.
2. maintenance window에 `backend/src/main/resources/db/preflight/legacy_v1_signature.sql`을 실행한다.
3. preflight가 성공한 경우에만 backend에 `FLYWAY_BASELINE_ON_MIGRATE=true`를 한 번 설정한다.
4. Flyway가 version 1 BASELINE을 기록하고 V2/V3를 적용했는지 확인한다.
5. 설정을 즉시 기본값 `false`로 되돌린다.

이 경로에서 V1은 실행되지 않는다. preflight 실패, 기존 Flyway history 존재, migration checksum 불일치 중 하나라도 있으면 중지한다. `repair`, history 직접 수정, 강제 삭제/재생성은 provisioning 절차가 아니다.

## 5. 백업과 복구

현재 `scripts/backup.sh`는 `home-postgres`의 `travel_archive`를 plain SQL로 dump한 뒤 gzip하고 7일 초과 파일을 삭제한다. uploads, manifest, checksum, restore drill은 만들지 않으므로 단독으로 검증된 운영 백업 체인이 아니다.

스크립트 산출물을 복구 후보로 사용할 때는 먼저 별도 checksum을 검증하고, 운영 DB가 아닌 빈 disposable PostgreSQL 16에서 복구 시험한다.

```bash
sha256sum -c <backup-checksum-file>
gzip -dc <travel-archive-backup.sql.gz> | \
  docker exec -i <disposable-postgres-container> \
  psql -v ON_ERROR_STOP=1 --single-transaction \
  -U <restore-role> -d <empty-restore-database>
```

복구 후 Flyway history, 13개 테이블, 기준/사용자 데이터 count, Hibernate validate를 확인한다. production DB 위에 바로 restore하거나 실패한 partial target을 그대로 재사용하지 않는다. uploads는 같은 시점의 별도 archive가 있어야 완전한 서비스 복구가 된다.
