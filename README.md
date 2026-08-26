# Travel Archive

개인 여행 기록을 관리하는 반응형 풀스택 웹 서비스입니다.

## 소개

Travel Archive는 사용자가 방문한 여행지를 기록하고, 버킷리스트를 관리하며, 지도와 통계로 한눈에 여행 히스토리를 확인할 수 있는 개인 여행 아카이브 서비스입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Spring Boot 4.0.6, Java 17, Gradle 9.5, JPA, Lombok |
| Frontend | Next.js 16.2.7, React 19.2.7, TypeScript, Tailwind CSS |
| Database | PostgreSQL 16 |
| 인증 | JWT (httpOnly cookie) |
| 지도 | Leaflet, @vnedyalk0v/react19-simple-maps, Recharts |

## 프로젝트 구조

```
travel-archive/
├── backend/          # Spring Boot API 서버
│   ├── src/main/java/com/travelarchive/...
│   └── src/main/resources/db/migration/  # Flyway schema/reference data
├── frontend/         # Next.js 프론트엔드
│   ├── src/app/       # App Router 페이지
│   ├── src/components/ # UI 컴포넌트
│   └── src/lib/       # API 클라이언트, 인증
├── docker-compose.infrastructure.yml # 공유 PostgreSQL
├── docker-compose.yml # 애플리케이션 스택
└── README.md
```

## 빠른 시작

### 1. 저장소 클론

```bash
git clone <repository-url>
cd travel-archive
```

### 2. 사전 준비

| 소프트웨어 | 버전 | 용도 |
|---|---|---|
| Java | 17 | 백엔드 실행 |
| Node.js | 20 이상 | 프론트엔드 실행 |
| Docker | 최신 | PostgreSQL 실행 |

**Docker 설치**

- **Windows**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 (WSL2 백엔드 선택)
- **macOS**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 (Apple Silicon/Intel 모두 지원)
- **Ubuntu**: `sudo apt update && sudo apt install docker.io docker-compose-plugin`

### 3. 데이터베이스

PostgreSQL은 `docker-compose.infrastructure.yml`, 앱은 `docker-compose.yml`로 분리되어 있습니다. 기존 container, volume, DB는 사용자 데이터일 수 있으므로 새 환경임이 확인되기 전에 기동·초기화하지 마십시오. `docker compose down -v`, volume/DB 삭제, Flyway history 수정은 기본 절차가 아닙니다.

신규 전용 DB를 준비할 때는 먼저 [로컬 DB 가이드](docs/LOCAL_DEV_DB_SETUP.md)를 따르고, root `.env`에는 실제 비밀값을 직접 설정합니다. 문서의 `<postgres-admin-password>`, `<database-password>`, `<jwt-secret>`은 placeholder입니다.

DB 생성 계약은 다음과 같습니다.

- `init/01-init.sh`: PostgreSQL data directory의 최초 초기화 때 role과 빈 `travel_archive` DB만 생성
- Flyway `V1__baseline.sql`: 빈 DB에 13개 application table 생성
- Flyway `V2__legacy_reconciliation.sql`: 지원하는 schema signature와 template unique constraint 조정
- Flyway `V3__reference_data.sql`: 국가·국내 지역·체크리스트 template 기준 데이터 입력

`V1__baseline.sql`의 이름에서 baseline은 초기 schema를 뜻합니다. `baseline-on-migrate`의 기본값은 `false`이며, 기존 non-empty schema를 자동 채택하지 않습니다. 테이블과 기준 데이터는 backend 기동 시 Flyway가 V1→V3 순서로 적용하며, `SeedDataLoader`는 사용하지 않습니다.

### 4. 백엔드 실행

Docker PostgreSQL을 사용하는 기본 profile로 실행합니다:

```bash
cd backend
./gradlew bootRun
```

기본적으로 `http://localhost:8080`에서 실행됩니다.

`dev` profile도 Flyway로 schema를 적용하고 JPA `ddl-auto: validate`로 일치 여부만 확인합니다:

```bash
./gradlew bootRun --args='--spring.profiles.active=dev'
```

### 5. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

기본적으로 `http://localhost:3000`에서 실행됩니다.

프로덕션 빌드에서 Next.js 서버의 backend 대상은 `API_ORIGIN`으로 지정합니다.

```bash
API_ORIGIN=http://localhost:8080 npm run build
```

## 환경별 특이사항

### Windows (WSL2)

- WSL2에서 `docker` 명령어가 안 될 경우: Docker Desktop → Settings → Resources → WSL Integration → Ubuntu 토글 ON
- 백슬래시(`\`) 대신 슬래시(`/`)를 사용하거나 WSL 터미널에서 실행하세요.
- 파일 경로 문제가 발생하면 프로젝트를 WSL 파일 시스템(`~/projects/`)에 클론하세요.

### macOS

- Apple Silicon(M1/M2/M3)에서도 `postgres:16-alpine` 이미지가 정상 작동합니다.
- Docker Desktop 메뉴 바 아이콘 → Settings → Resources에서 메모리/CPU 할당량을 조절할 수 있습니다.
- `localhost` 대신 `host.docker.internal`을 사용할 필요는 없습니다 (백엔드를 호스트에서 직접 실행하므로).

### Ubuntu (Native)

- Docker 설치 후 사용자를 docker 그룹에 추가해야 `sudo` 없이 실행할 수 있습니다:
  ```bash
  sudo usermod -aG docker $USER
  # 로그아웃 후 다시 로그인
  ```
- 포트 5432가 이미 시스템 PostgreSQL에 점유된 경우가 많습니다. `.env` 파일로 포트를 변경하세요.

## 문제 해결

| 문제 | 원인 | 해결 방법 |
|---|---|---|
| `docker: command not found` | Docker가 설치되지 않았거나 WSL 통합이 꺼져 있음 | Docker Desktop 설치/실행, WSL Integration 활성화 |
| `docker-compose: command not found` | Docker Compose v1 사용 중 | `docker compose` (v2)로 변경하거나 별도 설치 |
| `Bind for 0.0.0.0:5432 failed` | 로컬 PostgreSQL이 이미 5432 포트 사용 중 | `.env` 파일로 `POSTGRES_PORT=5433` 설정 후 재시작 |
| `Connection to localhost:5432 refused` | PostgreSQL 컨테이너가 아직 준비되지 않음 | `docker compose ps`로 상태 확인, `healthy` 될 때까지 대기 |
| `./gradlew: Permission denied` | Gradle wrapper에 실행 권한 없음 | `chmod +x ./gradlew` |
| 백엔드에서 401 Unauthorized | JWT_SECRET이 설정되지 않음 | `export JWT_SECRET="your-32-char-secret-key"` |
| 프론트엔드 빌드 실패 | `node_modules` 누락 | `cd frontend && npm install` |

## 상세 가이드

- [백엔드 설정 가이드](backend/README.md)
- [프론트엔드 설정 가이드](frontend/README.md)

## 주요 기능

- 공개 홈 (비로그인 미리보기 — 샘플 데이터 기반 지도/통계 미리보기)
- 여행 CRUD 및 상태 관리 (계획 / 완료 / 취소)
- 버킷리스트 관리 및 여행 전환
- 일자별 타임라인 및 지도 마커
- 체크리스트 (템플릿 기반 자동 생성)
- 사진 업로드 및 관리
- 세계 지도 / 대한민국 지도 집계
- 통계 대시보드 (월별, 지역별)

## 라이선스

MIT
