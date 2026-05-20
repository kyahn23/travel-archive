# Travel Archive

개인 여행 기록을 관리하는 풀스택 PWA입니다.

## 소개

Travel Archive는 사용자가 방문한 여행지를 기록하고, 버킷리스트를 관리하며, 지도와 통계로 한눈에 여행 히스토리를 확인할 수 있는 개인 여행 아카이브 서비스입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Spring Boot 4.0.6, Java 25, Gradle 9.5, JPA, Lombok |
| Frontend | Next.js 16.2.6, React 19.2.6, TypeScript, Tailwind CSS |
| Database | PostgreSQL 16 |
| 인증 | JWT (httpOnly cookie) |
| 지도 | Leaflet, @vnedyalk0v/react19-simple-maps, Recharts |

## 프로젝트 구조

```
travel-archive/
├── backend/          # Spring Boot API 서버
│   ├── src/main/java/com/travelarchive/...
│   └── src/main/java/com/travelarchive/common/config/  # SeedDataLoader
├── frontend/         # Next.js 프론트엔드
│   ├── src/app/       # App Router 페이지
│   ├── src/components/ # UI 컴포넌트
│   └── src/lib/       # API 클라이언트, 인증
├── docker-compose.yml # Docker PostgreSQL 설정
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
| Java | 25 | 백엔드 실행 |
| Node.js | 18 이상 | 프론트엔드 실행 |
| Docker | 최신 | PostgreSQL 실행 |

**Docker 설치**

- **Windows**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 (WSL2 백엔드 선택)
- **macOS**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 (Apple Silicon/Intel 모두 지원)
- **Ubuntu**: `sudo apt update && sudo apt install docker.io docker-compose-plugin`

### 3. 데이터베이스 실행 (Docker)

PostgreSQL을 Docker로 실행합니다. 별도 설치 없이 어떤 PC에서도 동일한 환경을 구성할 수 있습니다.

```bash
# 프로젝트 루트에서 실행
docker compose up -d
```

> **참고**:  
> - 일부 오래된 Docker 버전에서는 `docker-compose` (하이픈 포함) 명령어를 사용합니다.  
> - `docker compose`가 안 될 경우 `docker-compose`를 시도하세요.  
> - `.env.example` 파일을 `.env`로 복사하여 포트, 비밀번호 등을 커스터마이징할 수 있습니다.

- PostgreSQL이 `localhost:5432`에서 실행됩니다.
- DB: `travel_archive` / 사용자: `travel_archive` / 비밀번호: `travel_archive`

**Docker PostgreSQL 제어 명령어**

```bash
# 컨테이너 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f postgres

# 컨테이너 중지 (데이터는 유지)
docker compose down

# 컨테이너 중지 + 데이터 초기화 (PostgreSQL 볼륨 초기화)
docker compose down -v

# PostgreSQL 재시작
docker compose restart postgres
```

**포트 충돌이 발생하는 경우**

로컬에 이미 PostgreSQL이 설치되어 있거나 5432 포트를 사용하는 다른 프로그램이 있으면 충돌이 발생합니다. `.env` 파일을 생성하여 포트를 변경하세요:

```bash
# 프로젝트 루트에 .env 파일 생성
echo "POSTGRES_PORT=5433" > .env

# docker-compose.yml 수정 없이 적용
docker compose up -d
```

이 경우 백엔드 실행 시에도 동일한 포트를 지정해야 합니다:

```bash
export DB_URL="jdbc:postgresql://localhost:5433/travel_archive"
./gradlew bootRun
```

### 4. 백엔드 실행

Docker PostgreSQL을 사용하는 기본 profile로 실행합니다:

```bash
cd backend
./gradlew bootRun
```

기본적으로 `http://localhost:8080`에서 실행됩니다.

빠른 로컬 개발을 위해 `dev` profile을 사용할 수 있습니다. 동일한 PostgreSQL을 사용하며 JPA `ddl-auto: update`로 스키마를 자동 관리합니다:

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

프로덕션 빌드는 별도 config 변환 없이 실행됩니다.

```bash
npm run build
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

## 데모 계정

| 항목 | 값 |
|------|-----|
| 이메일 | `demo@example.com` |
| 비밀번호 | `password` |

데모 계정에는 다음 샘플 데이터가 포함되어 있습니다.

- 완료된 국내 여행: 부산 (2024.03.15 ~ 03.17), 서울 (2024.01.10 ~ 01.12)
- 완료된 해외 여행: 오사카 (2024.05.10 ~ 05.14), 방콕 (2024.08.05 ~ 08.10)
- 예정된 해외 여행: 파리 (2025.09.20 ~ 09.27)
- 버킷리스트: 제주도, 방콕/치앙마이, 스위스 알프스 트레킹
- 15개 이상의 지도 좌표 포함 타임라인, 체크리스트, 데모 사진 메타데이터

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
