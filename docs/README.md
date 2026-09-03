# Travel Archive 문서 현황과 권위 지도

이 문서는 현재 작업 트리의 문서와 실제 코드를 대조한 결과다. 특히 N100 홈서버 작업에서는 문서 작성 시점이 아니라 이 문서의 **권위 순서**를 따른다.

검토 기준일: 2026-08-26
검토 기준: 현재 Git 작업 트리(커밋되지 않은 수정·미추적 파일 포함), 현재 Mac Docker의 `travel-archive-db` 읽기 전용 확인

## 결론

- N100의 현재 상태는 서버에서 read-only 조사한 뒤 신규/기존 DB 경로를 선택한다.
- 현재 소스는 disposable PostgreSQL backend 37 tests, frontend clean-install lint/type/50 tests/build, full-stack smoke, backup restore fixture를 통과했다.
- 운영 DB 생성은 검증된 main 커밋을 push하고 `prod` PR gate와 GitHub production secret을 설정한 다음 수행한다.
- `prod` 대상 PR에서는 CI만 실행되고, 해당 PR이 실제 merge될 때만 운영 배포 workflow가 실행된다.
- Mac 로컬 DB의 논리 복제는 보존/비교용 선택지다. 구형 Flyway V1–V5 이력까지 복제한 DB에는 현재 저장소 backend를 연결하면 안 된다.

## 문서 권위 순서

| 순서 | 문서 | 용도 | 현재 판정 |
|---:|---|---|---|
| 1 | `docs/README.md` | 현재 상태, 문서 분류, 작업 순서 | 권위 문서 |
| 2 | `docs/N100_POSTGRES_FROM_LOCAL_DOCKER.md` | N100 신규 PostgreSQL/DB 생성 및 선택적 로컬 snapshot 복제 | DB 권위 runbook |
| 3 | `docs/HOME_SERVER_SETUP.md` | N100 전체 서버 준비와 단계별 gate | 서버 권위 runbook |
| 4 | `docs/OPERATIONS.md` | 배포 후 보안·백업·복구 | 현재 운영 계약 |
| 5 | `docs/NPM_SETUP.md` | Nginx Proxy Manager 연결 | 앱 배포 gate 통과 후 사용 |
| 6 | `docs/MANUAL_DEPLOY.md` | 수동 배포 | 자동 배포 장애 시 폴백 |

`docs/PRODUCTION_DB_PROVISIONING.md`는 이전 Flyway 도입안을 보존한 **폐기 예정 문서**다. 실행 절차로 사용하지 않는다.

## 현재 적용된 작업과 실제 상태

아래의 “존재”는 작업 트리에 파일이나 코드가 있다는 뜻이며, 검증 완료를 뜻하지 않는다.

| 영역 | 작업 트리에 존재하는 변경 | 실제 판정 |
|---|---|---|
| DB 소유권 | `init/01-init.sh`는 role/DB만 생성, Flyway V1–V3가 스키마/기준 데이터 담당 | disposable PostgreSQL 검증 통과 |
| DB 설정 | 기본/dev 모두 `ddl-auto: validate`, Flyway enabled | disposable PostgreSQL 검증 통과 |
| Compose | 공유 `home-postgres`, 앱 stack, 독립 smoke stack 분리 | config와 full-stack smoke 통과 |
| Seed | `SeedDataLoader` 삭제, `V3__reference_data.sql`로 이동 | 문서 다수가 아직 옛 방식을 설명 |
| 컨테이너 빌드 | Java 17/Node 20 multi-stage image | arm64/amd64 build 및 smoke 통과 |
| 배포 | prod PR CI + merged-PR CD + SHA image rollback | GitHub secret/branch protection과 N100 연결은 외부 설정 필요 |
| 백업 | DB dump, uploads, manifest, checksum, restore drill | fixture restore 검증 통과; N100 첫 운영 백업 drill 필요 |
| smoke 검증 | 독립 UUID stack | health/401/CSRF/signup/me 통과 |

## 운영 배포 전 남은 외부 설정

1. 현재 변경을 main에 commit/push한다.
2. 원격 `prod` branch와 required status checks/PR protection을 설정한다.
3. GitHub `production` environment와 SSH/DB/JWT secrets를 등록한다.
4. N100의 기존 container, volume, DB, port를 read-only로 조사한다.
5. 신규 DB면 infrastructure Compose로 role/빈 DB를 만들고 첫 app deploy에서 Flyway V1–V3를 적용한다.
6. NPM을 `travel-archive` network에 연결하고 HTTPS domain을 frontend:3000으로 전달한다.
7. 첫 운영 백업 후 restore drill을 수행한다.

## N100 작업 순서

```text
서버/저장소 read-only 조사
  -> 기존 home-postgres/volume/DB 없음 확인
  -> DB 포트 노출 정책 확정
  -> PostgreSQL 16 + 빈 travel_archive DB 생성
  -> locale/role/ownership 검증
  -> 검증된 prod release의 Flyway 적용
  -> corrected Flyway를 빈 DB에 적용
  -> 기준 데이터/권한 검증
  -> backend/frontend/NPM 배포
  -> 백업 + 실제 restore drill
```

구체적인 DB 명령과 중지 조건은 `docs/N100_POSTGRES_FROM_LOCAL_DOCKER.md`만 따른다.

## 전체 docs 분류

### 현재 운영 문서

- `README.md`: 이 문서. 현재 상태와 권위 지도.
- `N100_POSTGRES_FROM_LOCAL_DOCKER.md`: N100 DB 신규 구축의 단일 실행 문서.
- `HOME_SERVER_SETUP.md`: 서버 전체 설정 순서와 gate.
- `OPERATIONS.md`: 배포 후 운영 원칙. 현재 백업 도구 제한 포함.
- `NPM_SETUP.md`: NPM 네트워크/프록시 설정. 앱 배포 전에는 실행하지 않는다.
- `MANUAL_DEPLOY.md`: 자동 배포 장애 시 검증된 SHA를 배포하는 폴백.
- `LOCAL_DEV_DB_SETUP.md`: Mac 로컬의 실제 legacy DB와 새 Compose의 차이를 설명한다.

### 개발/제품 기준 문서

- `travel_archive_prd.md`: 제품 요구사항과 MVP 범위.
- `design-system.md`, `ui_brief.md`: UI 설계 의도와 시안 기준.
- `DATABASE_DESIGN.md`: 도메인 모델 설명. 스키마 적용 명령의 권위 문서는 아니다.
- `DEVELOPER_HANDBOOK.md`: 광범위한 개발 참고서. DB/배포 절은 현재 구현보다 오래됐다.
- `2주차_산출물/API_SPECIFICATION.md`: API 설계 참고. 실제 controller/DTO 계약을 우선한다.

### 역사적/참고 문서

- `COMMAND_LINE_RUNNER.md`: 삭제된 `SeedDataLoader` 방식 설명. 현재 seed 구현에 사용하지 않는다.
- `PRODUCTION_DB_PROVISIONING.md`: 교체 전 Flyway adopt 초안. 실행 금지.
- `2주차_산출물/ERD.md`, `2주차_산출물/schema.sql`: 초기 설계 산출물. `schema.sql`을 DB에 직접 실행하지 않는다.
- `PRESENTATION_FRAMEWORK.md`: 발표 자료.
- `public-home-dashboard-transition.md`: 기능 전환 계획/기록.
- `design/*.png`: 설계 참고 이미지.

## Mac 로컬 DB에서 확인된 기준 snapshot

2026-08-18에 실행 중인 `travel-archive-db`를 읽기 전용으로 확인한 결과다.

| 항목 | 값 |
|---|---|
| PostgreSQL | 16.13, `postgres:16-alpine` |
| DB / role | `travel_archive` / `travel_archive` |
| encoding / collate / ctype | `UTF8` / `en_US.utf8` / `en_US.utf8` |
| public tables | 애플리케이션 13 + `flyway_schema_history` 1 |
| FK / index | 15 / 19 |
| 기준 데이터 | countries 20, domestic regions 17, templates 2, template items 24 |
| 사용자 데이터 | users 1, refresh tokens 1, trips 0 |

이 snapshot은 로컬 DB의 상태 기준이며, 현재 저장소 migration이 이를 그대로 재현한다고 보장하지 않는다.

## N100에 문서를 전달할 때

현재 배포 workflow는 `docs`와 `*.md`를 rsync에서 제외한다. 또한 이 작업 트리의 운영 문서들은 아직 미추적 파일이다. 따라서 N100의 Codex가 문서를 볼 수 있다고 가정하지 말고, 사용할 문서가 실제 서버에 존재하며 이 작업 트리와 같은 내용인지 checksum 또는 diff로 확인한다.
