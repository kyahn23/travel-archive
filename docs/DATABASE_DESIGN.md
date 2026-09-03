# Travel Archive 데이터베이스 설계

> **설계 참고 (2026-08-18)**: 도메인/테이블 설명용 문서다. 현재 schema 적용 절차나 migration 이력의 권위 문서가 아니다. 실제 DB 작업은 `docs/README.md`와 `docs/N100_POSTGRES_FROM_LOCAL_DOCKER.md`를 따른다.

> 이 문서는 **JPA Entity 기반**으로 실제 운영 중인 Travel Archive의 데이터베이스 구조를 정리한 학습용 문서입니다.  
> 각 테이블의 컬럼, 제약조건, 관계, 그리고 실제 어떤 흐름에서 사용되는지를 설명합니다.

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| DBMS | PostgreSQL 16 (개발/운영), H2 (로컬 dev/test) |
| ORM | JPA (Hibernate) |
| 스키마 관리 | Flyway V1–V3, JPA `ddl-auto: validate` |
| 공통 전략 | `BaseEntity` 상속으로 `created_at`/`updated_at` 자동 관리 |

---

## 2. ERD (Entity Relationship Diagram)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│    users    │       │   trips     │       │   bucket_places │
├─────────────┤       ├─────────────┤       ├─────────────────┤
│ id (PK)     │──┐    │ id (PK)     │◄────│ trip_id (FK)   │
│ email (UQ)  │  │    │ user_id(FK) │──┘    │ user_id (FK)   │
│ password_hash│  └──►│ bucket_place│◄─────┤ ...            │
│ nickname    │       │   _id (FK)  │       └─────────────────┘
│ role        │       │ title       │
│ created_at  │       │ travel_scope│       ┌─────────────────┐
│ updated_at  │       │ status      │       │     countries   │
└─────────────┘       │ start_date  │       ├─────────────────┤
       │              │ end_date    │       │ code (PK)       │
       │              │ country_id  │◄─────┤ name_ko         │
       │              │ domestic_   │      │ name_en         │
       │              │   region_id │      │ continent       │
       │              │ created_at  │      └─────────────────┘
       │              │ updated_at  │
       │              └─────────────┘      ┌─────────────────┐
       │                      │             │ domestic_regions│
       │                      │             ├─────────────────┤
       │                      │             │ code (PK)       │
       ▼                      ▼             │ name_ko         │
┌─────────────┐       ┌─────────────┐      │ region_type     │
│refresh_tokens│      │  trip_days  │      │ parent_code     │
├─────────────┤       ├─────────────┤      │ display_order   │
│ id (PK)     │       │ id (PK)     │      └─────────────────┘
│ user_id(FK) │       │ trip_id(FK) │
│ token_hash  │       │ day_no      │
│ expires_at  │       │ travel_date │
│ revoked_at  │       │ title       │
│ created_at  │       │ memo        │
└─────────────┘       │ created_at  │
                      │ updated_at  │
                      └─────────────┘
                             │
                             ▼
                      ┌─────────────────┐
                      │ trip_timeline_   │
                      │     items        │
                      ├─────────────────┤
                      │ id (PK)         │
                      │ trip_day_id(FK) │
                      │ item_time       │
                      │ title           │
                      │ memo            │
                      │ place_name      │
                      │ address         │
                      │ latitude        │
                      │ longitude       │
                      │ cost            │
                      │ category        │
                      │ sort_order      │
                      │ created_at      │
                      │ updated_at      │
                      └─────────────────┘
                             │
                             ▼
                      ┌─────────────────┐
                      │   trip_photos    │
                      ├─────────────────┤
                      │ id (PK)         │
                      │ trip_id (FK)    │
                      │ timeline_item_id│
                      │ owner_type      │
                      │ storage_key     │
                      │ file_url        │
                      │ original_file_  │
                      │   name          │
                      │ content_type    │
                      │ file_size       │
                      │ caption         │
                      │ sort_order      │
                      │ created_at      │
                      │ updated_at      │
                      └─────────────────┘

┌─────────────────┐       ┌─────────────────────┐
│ travel_checklists│       │travel_checklist_    │
├─────────────────┤       │      items          │
│ id (PK)         │◄──────├─────────────────────┤
│ trip_id (FK)    │       │ id (PK)             │
│ title           │       │ checklist_id (FK)  │
│ progress_rate   │       │ category            │
│ created_at      │       │ content             │
│ updated_at      │       │ status              │
└─────────────────┘       │ sort_order          │
                            │ due_date            │
                            │ created_at          │
                            │ updated_at          │
                            └─────────────────────┘
```

---

## 3. 테이블 상세 설명

### 3.1 `users` — 사용자

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 사용자 고유 ID |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | 로그인 ID |
| `password_hash` | VARCHAR(255) | NOT NULL | BCrypt 암호화 비밀번호 |
| `nickname` | VARCHAR(80) | NOT NULL | 화면 표시명 |
| `role` | VARCHAR(30) | NOT NULL, DEFAULT 'USER' | 권한 (USER/ADMIN) |
| `created_at` | TIMESTAMP | NOT NULL | 생성일 (BaseEntity) |
| `updated_at` | TIMESTAMP | NOT NULL | 수정일 (BaseEntity) |

**관계:**
- 1:N → `trips`, `bucket_places`, `refresh_tokens`

---

### 3.2 `trips` — 여행

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 여행 고유 ID |
| `user_id` | BIGINT | NOT NULL, FK → users | 소유자 |
| `bucket_place_id` | BIGINT | FK → bucket_places | 버킷→여행 전환 원본 (optional) |
| `title` | VARCHAR(160) | NOT NULL | 여행명 |
| `travel_scope` | VARCHAR(20) | NOT NULL | DOMESTIC / INTERNATIONAL |
| `country_id` | VARCHAR(10) | FK → countries | 해외 여행 국가 (해외 시 필수) |
| `domestic_region_id` | VARCHAR(10) | FK → domestic_regions | 국내 시/도 (국내 시 필수) |
| `city_name` | VARCHAR(120) | | 도시명 |
| `start_date` | DATE | NOT NULL | 시작일 |
| `end_date` | DATE | NOT NULL | 종료일 |
| `status` | VARCHAR(20) | NOT NULL | PLANNED / COMPLETED / CANCELLED |
| `travel_type` | VARCHAR(80) | | 여행 유형 (자유여행, 패키지 등) |
| `companion` | VARCHAR(120) | | 동행자 |
| `summary` | TEXT | | 메모/요약 |
| `created_at` | TIMESTAMP | NOT NULL | 생성일 (BaseEntity) |
| `updated_at` | TIMESTAMP | NOT NULL | 수정일 (BaseEntity) |

**제약:**
- `end_date >= start_date`
- 국내: `domestic_region_id` 필수, `country_id` null
- 해외: `country_id` 필수, `domestic_region_id` null

**관계:**
- N:1 → `users`, `bucket_places`
- 1:N → `trip_days`, `trip_photos`, `travel_checklists`

---

### 3.3 `trip_days` — 여행 날짜

여행 기간만큼 자동 생성됩니다. 예: 3박 4일 → 4개 row.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `trip_id` | BIGINT | NOT NULL, FK → trips | |
| `day_no` | INT | NOT NULL | 1, 2, 3... |
| `travel_date` | DATE | NOT NULL | 실제 날짜 |
| `title` | VARCHAR(160) | | 날짜별 제목 |
| `memo` | TEXT | | 날짜별 메모 |
| `created_at` | TIMESTAMP | NOT NULL | (BaseEntity) |
| `updated_at` | TIMESTAMP | NOT NULL | (BaseEntity) |

**관계:**
- N:1 → `trips`
- 1:N → `trip_timeline_items`

---

### 3.4 `trip_timeline_items` — 타임라인 항목

각 여행 날짜에 속한 일정/장소/메모 등을 기록합니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `trip_day_id` | BIGINT | NOT NULL, FK → trip_days | |
| `item_time` | TIME | | 시간 (선택) |
| `title` | VARCHAR(160) | NOT NULL | 제목 |
| `memo` | TEXT | | 메모 |
| `place_name` | VARCHAR(160) | | 장소명 |
| `address` | VARCHAR(300) | | 주소 |
| `latitude` | DECIMAL(10,8) | | 위도 (지도 마커용) |
| `longitude` | DECIMAL(11,8) | | 경도 (지도 마커용) |
| `cost` | DECIMAL(19,2) | | 비용 |
| `category` | VARCHAR(20) | NOT NULL | PLACE/FOOD/ACTIVITY/MOVE/MEMO |
| `sort_order` | INT | NOT NULL, DEFAULT 0 | 정렬 순서 |
| `created_at` | TIMESTAMP | NOT NULL | (BaseEntity) |
| `updated_at` | TIMESTAMP | NOT NULL | (BaseEntity) |

**관계:**
- N:1 → `trip_days`
- 1:N → `trip_photos`

---

### 3.5 `trip_photos` — 사진

대표 이미지와 타임라인 사진을 통합 관리합니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `trip_id` | BIGINT | NOT NULL, FK → trips | |
| `timeline_item_id` | BIGINT | FK → trip_timeline_items | 타임라인 사진일 때만 |
| `owner_type` | VARCHAR(20) | NOT NULL | TRIP_COVER / TIMELINE_ITEM |
| `storage_key` | VARCHAR(500) | NOT NULL | 파일 저장 경로 |
| `file_url` | VARCHAR(500) | | 접근 URL |
| `original_file_name` | VARCHAR(255) | NOT NULL | 원본 파일명 |
| `content_type` | VARCHAR(100) | NOT NULL | image/jpeg 등 |
| `file_size` | BIGINT | NOT NULL | 파일 크기 (bytes) |
| `caption` | VARCHAR(500) | | 사진 설명 |
| `sort_order` | INT | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMP | NOT NULL | (BaseEntity) |
| `updated_at` | TIMESTAMP | NOT NULL | (BaseEntity) |

**구분 규칙:**
- `owner_type = 'TRIP_COVER'`: `timeline_item_id` = null
- `owner_type = 'TIMELINE_ITEM'`: `timeline_item_id` = not null

---

### 3.6 `bucket_places` — 버킷리스트

가고 싶은 여행지를 저장합니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `user_id` | BIGINT | NOT NULL, FK → users | |
| `title` | VARCHAR(160) | NOT NULL | 장소명 |
| `travel_scope` | VARCHAR(20) | NOT NULL | DOMESTIC / INTERNATIONAL |
| `country_id` | VARCHAR(10) | FK → countries | 해외 시 |
| `domestic_region_id` | VARCHAR(10) | FK → domestic_regions | 국내 시 |
| `city_name` | VARCHAR(120) | | 도시 |
| `reason` | VARCHAR(1000) | | 가고 싶은 이유 |
| `expected_budget` | DECIMAL(19,2) | | 예상 예산 |
| `desired_season` | VARCHAR(60) | | 희망 시기 |
| `companion` | VARCHAR(100) | | 동행자 |
| `priority` | INT | NOT NULL, DEFAULT 3 | 1~5 우선순위 |
| `status` | VARCHAR(20) | NOT NULL | WANT_TO_GO/PLANNING/BOOKED/VISITED/ON_HOLD |
| `reference_url` | VARCHAR(500) | | 참고 링크 |
| `memo` | TEXT | | 메모 |
| `created_at` | TIMESTAMP | NOT NULL | (BaseEntity) |
| `updated_at` | TIMESTAMP | NOT NULL | (BaseEntity) |

**관계:**
- N:1 → `users`
- 1:N → `trips` (전환 시)

---

### 3.7 `travel_checklists` — 체크리스트

여행에 종속된 하나의 체크리스트입니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `trip_id` | BIGINT | NOT NULL, FK → trips | |
| `title` | VARCHAR(160) | NOT NULL | 체크리스트 제목 |
| `progress_rate` | INT | NOT NULL, DEFAULT 0 | 완료율 (%) |
| `created_at` | TIMESTAMP | NOT NULL | (BaseEntity) |
| `updated_at` | TIMESTAMP | NOT NULL | (BaseEntity) |

**관계:**
- N:1 → `trips`
- 1:N → `travel_checklist_items`

---

### 3.8 `travel_checklist_items` — 체크리스트 항목

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `checklist_id` | BIGINT | NOT NULL, FK → travel_checklists | |
| `category` | VARCHAR(80) | NOT NULL | 예약/서류/짐/전자기기/건강/현지준비 |
| `content` | VARCHAR(300) | NOT NULL | 항목 내용 |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'TODO' | TODO / DONE |
| `sort_order` | INT | NOT NULL, DEFAULT 0 | |
| `due_date` | DATE | | 마감일 |
| `created_at` | TIMESTAMP | NOT NULL | (BaseEntity) |
| `updated_at` | TIMESTAMP | NOT NULL | (BaseEntity) |

**관계:**
- N:1 → `travel_checklists`

---

### 3.9 `refresh_tokens` — 리프레시 토큰

JWT refresh token을 관리합니다.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `user_id` | BIGINT | NOT NULL, FK → users | |
| `token_hash` | VARCHAR(500) | NOT NULL, UNIQUE | 토큰 해시값 |
| `expires_at` | TIMESTAMP | NOT NULL | 만료일 |
| `revoked_at` | TIMESTAMP | | 폐기일 |
| `created_at` | TIMESTAMP | NOT NULL | (BaseEntity) |

**관계:**
- N:1 → `users`

---

### 3.10 `countries` — 국가 참조 데이터

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `code` | VARCHAR(10) | PK | ISO 국가 코드 |
| `name_ko` | VARCHAR(100) | NOT NULL | 한국어명 |
| `name_en` | VARCHAR(100) | NOT NULL | 영어명 |
| `continent` | VARCHAR(50) | | 대륙 |

**관계:**
- 1:N → `trips`, `bucket_places`

---

### 3.11 `domestic_regions` — 국내 지역 참조 데이터

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `code` | VARCHAR(10) | PK | 지역 코드 |
| `name_ko` | VARCHAR(100) | NOT NULL | 한국어명 |
| `region_type` | VARCHAR(20) | NOT NULL | SIDO / SIGUNGU |
| `parent_code` | VARCHAR(10) | FK → domestic_regions | 상위 지역 (SIGUNGU용) |
| `display_order` | INT | | 표시 순서 |

**관계:**
- 1:N → `trips`, `bucket_places`
- self-referencing: SIGUNGU → SIDO

---

## 4. 연관관계 요약

| 관계 | 설명 | 비고 |
|------|------|------|
| `users` 1:N `trips` | 한 사용자가 여러 여행 | |
| `users` 1:N `bucket_places` | 한 사용자가 여러 버킷 | |
| `users` 1:N `refresh_tokens` | 한 사용자가 여러 토큰 | 보통 1개 활성 |
| `bucket_places` 1:N `trips` | 버킷→여행 전환 시 연결 | optional |
| `trips` 1:N `trip_days` | 여행은 여러 날짜 | 기간만큼 자동 생성 |
| `trips` 1:N `trip_photos` | 여행에 여러 사진 | |
| `trips` 1:N `travel_checklists` | 여행에 하나의 체크리스트 | |
| `trip_days` 1:N `trip_timeline_items` | 날짜별 여러 일정 | |
| `trip_timeline_items` 1:N `trip_photos` | 타임라인 항목에 사진 | |
| `travel_checklists` 1:N `travel_checklist_items` | 체크리스트에 여러 항목 | |
| `countries` 1:N `trips` | 국가에 여러 여행 | 해외 여행 |
| `domestic_regions` 1:N `trips` | 지역에 여러 여행 | 국내 여행 |

---

## 5. 주요 비즈니스 흐름과 테이블 사용

### 5.1 회원가입
```
users INSERT
```

### 5.2 로그인
```
users SELECT (email)
refresh_tokens INSERT (token 발급)
```

### 5.3 여행 생성
```
trips INSERT
trip_days INSERT (start_date~end_date 기간만큼 자동 생성)
travel_checklists INSERT (travel_scope 기반 템플릿 적용)
travel_checklist_items INSERT (템플릿 항목)
```

### 5.4 버킷→여행 전환
```
bucket_places SELECT (원본 정보)
trips INSERT (버킷 정보 복사 + 여행 기간 입력)
trip_days INSERT
travel_checklists INSERT
travel_checklist_items INSERT
```

### 5.5 타임라인 작성
```
trip_timeline_items INSERT/UPDATE/DELETE
trip_photos INSERT (사진 추가 시)
```

### 5.6 지도 집계
```
trips SELECT (status, country_id/domestic_region_id)
bucket_places SELECT (status, country_id/domestic_region_id)
→ COMPLETED > PLANNED > BUCKET 우선순위로 상태 결정
```

### 5.7 통계
```
trips SELECT (status='COMPLETED', 날짜 집계)
→ 월별, 연도별, 지역별 집계
```

---

## 6. 스키마 관리

Flyway가 `backend/src/main/resources/db/migration/` 아래의 versioned SQL을 관리합니다. V1은 13개 application table을 생성하고, V2는 지원하는 schema를 조정하며, V3는 참조 데이터를 입력합니다. 기본/dev 모두 Hibernate는 `ddl-auto: validate`로 스키마를 검증만 합니다.

`V1__baseline.sql`은 빈 DB에 적용되는 초기 versioned migration입니다. `baseline-on-migrate` 기본값은 `false`이므로 기존 non-empty schema를 자동 채택하지 않습니다. 참조 데이터는 `V3__reference_data.sql`이 담당하며 삭제된 `SeedDataLoader`는 실행되지 않습니다.

---

## 7. BaseEntity와 감사 필드

모든 주요 엔티티는 `BaseEntity`를 상속받습니다:

```java
@MappedSuperclass
public abstract class BaseEntity {
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

**적용 대상:** `User`, `Trip`, `TripDay`, `TripTimelineItem`, `TripPhoto`, `BucketPlace`, `TravelChecklist`, `TravelChecklistItem`, `RefreshToken`

**장점:**
- INSERT 시 `created_at`, `updated_at` 자동 설정
- UPDATE 시 `updated_at` 자동 갱신
- 코드 중복 제거, 누락 방지

---

## 8. 상태값 정리

| 도메인 | 상태값 | 설명 |
|--------|--------|------|
| **Trip** | PLANNED, COMPLETED, CANCELLED | 예정/완료/취소 |
| **Bucket** | WANT_TO_GO, PLANNING, BOOKED, VISITED, ON_HOLD | 버킷 상태 |
| **TravelScope** | DOMESTIC, INTERNATIONAL | 국내/해외 |
| **TimelineCategory** | PLACE, FOOD, ACTIVITY, MOVE, MEMO | 타임라인 카테고리 |
| **ChecklistItemStatus** | TODO, DONE | 체크 상태 |
| **PhotoOwnerType** | TRIP_COVER, TIMELINE_ITEM | 사진 종류 |

---

## 9. 인덱스 (JPA 기본 + 필요 시 추가)

JPA가 자동 생성하는 인덱스:
- 모든 PK (`id`) — CLUSTERED INDEX
- FK 컬럼들 — 자동 인덱스 생성 (DBMS마다 상이)
- `users.email` — UNIQUE INDEX
- `refresh_tokens.token_hash` — UNIQUE INDEX

성능상 추가 권장:
- `trips(user_id, status)` — 사용자별 상태 조회
- `trips(start_date, end_date)` — 기간 기반 조회
- `trip_timeline_items(trip_day_id, sort_order)` — 날짜별 정렬
- `bucket_places(user_id, status)` — 사용자별 버킷 상태

---

## 10. 학습 포인트

### 왜 `trip_days`를 별도 테이블로 분리했나?
> 여행 기간이 3박 4일이면 4개의 `trip_day`가 생성됩니다. 각 날짜마다 독립적인 `title`, `memo`, 그리고 여러 `timeline_item`을 가질 수 있기 때문에 정규화가 필요합니다.

### 왜 `trip_photos`가 `trip`과 `timeline_item` 둘 다 참조하나?
> 대표 사진(`TRIP_COVER`)은 `trip_id`만 필요하고, 타임라인 사진(`TIMELINE_ITEM`)은 `timeline_item_id`도 필요합니다. 단일 테이블로 통합하면 조회가 간단해집니다.

### 왜 `BaseEntity`로 시간을 관리하나?
> JPA Auditing(`@CreatedDate`, `@LastModifiedDate`)도 있지만, 표준 JPA `@PrePersist`/`@PreUpdate`는 Spring Data JPA 의존성 없이 모든 JPA 구현체에서 동작합니다. 더범용적이고 예측 가능합니다.

### `CANCELLED` 여행은 지도/통계에서 제외되는 이유?
> 실제 방문하지 않은 여행은 여행 이력에 포함되지 않아야 합니다. 데이터 집계 시 WHERE 절에서 필터링합니다.

### 왜 대부분의 테이블은 `BIGINT id`를 PK로 쓰나?
> JPA 환경에서 연관관계 매핑과 FK 참조 효율성을 위해 서로게이트 키(Surrogate Key)를 사용합니다. 특히 `users.email`처럼 자연키가 가변적이거나 긴 경우, 별도의 불변 `id`를 두는 것이 인덱스/조인 성능과 데이터 무결성 측면에서 유리합니다.

### 왜 `countries`와 `domestic_regions`는 `code`를 PK로 쓰나?
> 이들은 **참조 데이터(Reference Data)** 로, 값이 절대 변하지 않고 짧으며 의미가 명확합니다. ISO 국가 코드(`KR`, `JP`)나 행정구역 코드(`KR-11`)는 불변의 자연키(Natural Key)이므로 서로게이트 키를 추가하는 것은 불필요한 인덱스와 조인 오버헤드만 발생시킵니다. FK 컬럼(`trips.country_id`, `trips.domestic_region_id`)도 해당 코드 문자열을 직접 참조합니다.

---

> 마지막 업데이트: 2026-05-20
