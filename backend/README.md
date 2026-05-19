# Travel Archive - Backend

Spring Boot 4.0.6 기반 REST API 서버입니다.

## 사전 준비

| 소프트웨어 | 버전 | 설명 |
|---|---|---|
| Java | 25 | Spring Boot 실행 필수 |
| PostgreSQL | 14+ | 기본 profile 사용 시 필요 (Docker로 대체 가능) |
| Gradle | 9.5+ | `./gradlew` wrapper로 대체 가능 |
| Docker | 최신 | PostgreSQL 컨테이너 실행용 |

## 의존성

- Spring Boot Web, Security, Data JPA, Validation
- PostgreSQL Driver
- **Lombok** — 보일러플레이트 제거 (`@Getter`, `@NoArgsConstructor` 등)
- Flyway (DB 마이그레이션)

> **참고**: PostgreSQL을 직접 설치하지 않아도 됩니다. 프로젝트 루트의 `docker-compose.yml`로 Docker PostgreSQL을 실행할 수 있습니다.

## 환경 설정

프로젝트 루트의 `.env.example` 파일을 참고하여 `.env` 파일을 생성할 수 있습니다.

```bash
# 프로젝트 루트에서
cp .env.example .env
# .env 파일을 편집하여 필요한 값 수정
```

> `.env` 파일은 `.gitignore`에 포함되어 있어 git에 커밋되지 않습니다.  
> 각 개발자가 자신의 로컬 환경에 맞게 설정하세요.

## 환경 변수

| 변수 | 설명 | 기본값 | 필수 여부 |
|------|------|--------|----------|
| `DB_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/travel_archive` | 아니오 |
| `DB_USERNAME` | 데이터베이스 사용자 | `travel_archive` | 아니오 |
| `DB_PASSWORD` | 데이터베이스 비밀번호 | `travel_archive` | 아니오 |
| `SERVER_PORT` | 서버 포트 | `8080` | 아니오 |
| `JWT_SECRET` | JWT 서명용 비밀키 (최소 32자) | - | **예** |

### 환경별 설정 예시

**Docker PostgreSQL 사용 (기본)**

```bash
# Docker로 PostgreSQL 실행
docker compose up -d

# JWT_SECRET만 설정하고 실행
export JWT_SECRET="your-32-char-secret-key-here-change-me"
./gradlew bootRun
```

**로컬 PostgreSQL 사용**

```bash
# 환경 변수로 DB 연결 정보 변경
export DB_URL="jdbc:postgresql://localhost:5432/my_database"
export DB_USERNAME="my_user"
export DB_PASSWORD="my_password"
export JWT_SECRET="your-32-char-secret-key-here-change-me"
./gradlew bootRun
```

**Windows PowerShell**

```powershell
$env:JWT_SECRET="your-32-char-secret-key-here-change-me"
./gradlew bootRun
```

### Docker Compose로 PostgreSQL 실행 (권장)

프로젝트 루트의 `docker-compose.yml`을 사용합니다. 별도 설치 없이 어떤 PC에서도 동일한 환경을 구성할 수 있습니다.

```bash
# 프로젝트 루트에서 실행
cd ..  # backend/에서 프로젝트 루트로 이동
docker compose up -d
```

> **참고**: 일부 오래된 Docker 버전에서는 `docker-compose` (하이픈 포함)를 사용합니다.  
> 위 명령어가 안 될 경우: `docker-compose up -d`

**제어 명령어**

```bash
# 상태 확인
docker compose ps

# 중지 (데이터 유지)
docker compose down

# 중지 + 데이터 초기화
docker compose down -v
```

**포트 충돌 시**

로컬 PostgreSQL이 이미 실행 중이면 5432 포트 충돌이 발생합니다. 프로젝트 루트에 `.env` 파일을 생성하여 포트를 변경하세요:

```bash
# 프로젝트 루트에 .env 파일 생성
echo "POSTGRES_PORT=5433" > .env

# Docker 재시작
docker compose down
docker compose up -d
```

이 경우 백엔드도 해당 포트로 연결해야 합니다:

```bash
export DB_URL="jdbc:postgresql://localhost:5433/travel_archive"
./gradlew bootRun
```

### 단일 Docker 컨테이너로 PostgreSQL 실행

Docker Compose 없이 단일 컨테이너만 실행할 수도 있습니다.

```bash
docker run -d \
  --name travel-archive-db \
  -e POSTGRES_DB=travel_archive \
  -e POSTGRES_USER=travel_archive \
  -e POSTGRES_PASSWORD=travel_archive \
  -p 5432:5432 \
  --restart unless-stopped \
  postgres:16-alpine
```

## 실행 방법

### 로컬 개발 모드 (Docker PostgreSQL)

Docker PostgreSQL을 사용하는 dev profile로 실행합니다. JPA가 스키마를 자동 생성합니다.

```bash
./gradlew bootRun --args='--spring.profiles.active=dev'
```

dev profile은 `ddl-auto: create`로 설정되어 있어 앱 실행 시 JPA가 엔티티 기반으로 스키마를 자동 생성합니다.

```bash
./gradlew bootRun
```

기본 profile은 PostgreSQL을 사용하므로 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` 또는 로컬 PostgreSQL이 필요합니다.

### 테스트

```bash
./gradlew test
```

### 프로덕션 빌드

```bash
./gradlew clean bootJar
java -jar build/libs/travel-archive-0.0.1-SNAPSHOT.jar
```

## 문제 해결

| 문제 | 원인 | 해결 방법 |
|---|---|---|
| `docker: command not found` | Docker 미설치 또는 WSL 통합 꺼짐 | Docker Desktop 설치/실행, WSL Integration ON |
| `Bind for 0.0.0.0:5432 failed` | 로컬 PostgreSQL이 포트 점유 중 | `.env`로 `POSTGRES_PORT=5433` 변경 또는 로컬 PostgreSQL 중지 |
| `Connection refused` (DB) | PostgreSQL 컨테이너가 아직 준비되지 않음 | `docker compose ps`로 `healthy` 상태 확인 후 재시도 |
| `Permission denied` (gradlew) | 실행 권한 없음 | `chmod +x ./gradlew` |
| `JWT secret is not configured` | `JWT_SECRET` 미설정 | `export JWT_SECRET="your-32-char-secret-key"` |
| `Connection refused` (DB) | PostgreSQL 컨테이너가 아직 준비되지 않음 | `docker compose ps`로 `healthy` 상태 확인 후 재시도 |
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

JPA/Hibernate가 엔티티 기반으로 스키마를 자동 생성합니다.

| 프로필 | `ddl-auto` | 설명 |
|---|---|---|
| 기본 (운영) | `validate` | 엔티티와 DB 스키마 일치 여부만 검증 |
| dev (로컬) | `create` | 앱 실행 시 스키마를 자동 생성/재생성 |

로컬 개발 시 `docker compose up -d`로 PostgreSQL을 먼저 실행한 후 `./gradlew bootRun --args='--spring.profiles.active=dev'`로 실행하세요.

## 인증 방식

- JWT를 httpOnly 쿠키에 저장 (`access_token`, `refresh_token`)
- Access token 유효기간: 15분
- Refresh token 유효기간: 7일
- 모든 API는 쿠키 기반 인증 필요 (인증 엔드포인트 제외)
