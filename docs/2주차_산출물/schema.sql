-- ============================================================
-- Travel Archive Database Schema (PostgreSQL 16)
-- ============================================================
-- HISTORICAL DESIGN ARTIFACT: provisioning/migration에 실행하지 않는다.
-- 현재 권위 문서는 docs/README.md와 versioned Flyway migration이다.
-- 설계 방식: JPA/Hibernate 기반 ORM 엔티티 중심 설계
-- 스키마 생성: JPA `ddl-auto: update` (dev) / `validate` (prod)
-- 본 DDL은 실제 JPA 엔티티를 기반으로 수동 정리한 참조용 스키마입니다.
-- 운영 환경에서는 JPA가 엔티티 메타데이터를 기반으로 스키마를
-- 자동 생성/검증하며, Flyway 등 마이그레이션 도구는 현재 미사용.
-- ============================================================

-- --------------------------------------------------------------
-- 1. 참조 데이터 (Reference Data) — Natural Key 기반
-- --------------------------------------------------------------

CREATE TABLE countries (
    code_alpha2 VARCHAR(2) PRIMARY KEY,
    map_key     VARCHAR(3)  NOT NULL UNIQUE,
    name_ko     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(120) NOT NULL,
    continent   VARCHAR(60)  NOT NULL,
    display_order INTEGER NOT NULL
);

COMMENT ON TABLE countries IS '국가 참조 데이터 (ISO 3166-1 alpha-2 코드를 Natural Key로 사용)';
COMMENT ON COLUMN countries.code_alpha2 IS 'ISO 3166-1 alpha-2 국가 코드 (예: KR, JP, US). JPA @Id 어노테이션으로 별도 surrogate key 없이 자연키를 PK로 사용';

CREATE TABLE domestic_regions (
    code          VARCHAR(10) PRIMARY KEY,
    map_key       VARCHAR(20) NOT NULL UNIQUE,
    name_ko       VARCHAR(80)  NOT NULL,
    name_en       VARCHAR(120) NOT NULL,
    region_type   VARCHAR(30)  NOT NULL,  -- SIDO / SIGUNGU
    display_order INTEGER      NOT NULL
);

COMMENT ON TABLE domestic_regions IS '국내 행정구역 참조 데이터 (행정구역 코드를 Natural Key로 사용)';
COMMENT ON COLUMN domestic_regions.code IS '행정표준코드관리체계의 행정구역코드 (예: KR-11, KR-41). JPA @Id로 자연키 사용';

-- --------------------------------------------------------------
-- 2. 사용자 및 인증
-- --------------------------------------------------------------

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(80)  NOT NULL,
    role            VARCHAR(30)  NOT NULL DEFAULT 'USER',
    created_at      TIMESTAMP    NOT NULL,
    updated_at      TIMESTAMP    NOT NULL
);

COMMENT ON TABLE users IS '사용자 정보. JPA @Entity users, @GeneratedValue(IDENTITY)로 auto-increment';
COMMENT ON COLUMN users.password_hash IS 'BCrypt 알고리즘으로 해싱된 비밀번호. 평문 저장 금지';

CREATE TABLE refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(500) NOT NULL UNIQUE,
    expires_at      TIMESTAMP    NOT NULL,
    revoked_at      TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL
);

COMMENT ON TABLE refresh_tokens IS 'JWT Refresh Token 관리. JPA @Entity refresh_tokens';

-- --------------------------------------------------------------
-- 3. 여행 (Trip) — 2주차 핵심 CRUD 대상
-- --------------------------------------------------------------

CREATE TABLE trips (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bucket_place_id     BIGINT       REFERENCES bucket_places(id) ON DELETE SET NULL,
    title               VARCHAR(160) NOT NULL,
    travel_scope        VARCHAR(20)  NOT NULL,  -- DOMESTIC / INTERNATIONAL
    country_id          VARCHAR(2)   REFERENCES countries(code_alpha2),
    domestic_region_id  VARCHAR(10)  REFERENCES domestic_regions(code),
    city_name           VARCHAR(120),
    start_date          DATE         NOT NULL,
    end_date            DATE         NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PLANNED',  -- PLANNED / COMPLETED / CANCELLED
    travel_type         VARCHAR(80),
    companion           VARCHAR(120),
    summary             TEXT,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL,

    CONSTRAINT chk_trip_end_after_start CHECK (end_date >= start_date),
    CONSTRAINT chk_trip_scope_country CHECK (
        (travel_scope = 'INTERNATIONAL' AND country_id IS NOT NULL AND domestic_region_id IS NULL) OR
        (travel_scope = 'DOMESTIC' AND domestic_region_id IS NOT NULL AND country_id IS NULL)
    )
);

COMMENT ON TABLE trips IS '여행 기록. JPA @Entity trips. 2주차 핵심 CRUD 구현 대상';
COMMENT ON COLUMN trips.bucket_place_id IS '버킷리스트 -> 여행 전환 시 원본 버킷 ID. optional FK';

CREATE INDEX idx_trips_user_status ON trips(user_id, status);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);

-- --------------------------------------------------------------
-- 4. 여행 날짜 (TripDay)
-- --------------------------------------------------------------

CREATE TABLE trip_days (
    id           BIGSERIAL PRIMARY KEY,
    trip_id      BIGINT       NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_no       INTEGER      NOT NULL,
    travel_date  DATE         NOT NULL,
    title        VARCHAR(160),
    memo         TEXT,
    created_at   TIMESTAMP    NOT NULL,
    updated_at   TIMESTAMP    NOT NULL
);

COMMENT ON TABLE trip_days IS '여행 기간별 일자 관리. 여행 생성 시 start_date~end_date 기간만큼 JPA에서 자동 생성';

-- --------------------------------------------------------------
-- 5. 타임라인 항목 (TripTimelineItem)
-- --------------------------------------------------------------

CREATE TABLE trip_timeline_items (
    id           BIGSERIAL PRIMARY KEY,
    trip_day_id  BIGINT       NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
    item_time    TIME,
    title        VARCHAR(160) NOT NULL,
    memo         TEXT,
    place_name   VARCHAR(160),
    address      VARCHAR(300),
    latitude     NUMERIC(19,2),  -- JPA BigDecimal 기본 매핑. 실제 지도 좌표 사용 시 precision/scale 조정 권장
    longitude    NUMERIC(19,2),
    cost         NUMERIC(19,2),
    category     VARCHAR(20)  NOT NULL,  -- PLACE / FOOD / ACTIVITY / MOVE / MEMO
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL,
    updated_at   TIMESTAMP    NOT NULL
);

COMMENT ON TABLE trip_timeline_items IS '여행 일자별 상세 일정/장소/메모. JPA @Entity trip_timeline_items';
COMMENT ON COLUMN trip_timeline_items.latitude IS 'BigDecimal 기본 매핑 (NUMERIC(19,2)). JPA @Column(precision=10, scale=8) 추가 시 DECIMAL(10,8)로 정밀도 향상 가능';

CREATE INDEX idx_timeline_items_day_sort ON trip_timeline_items(trip_day_id, sort_order);

-- --------------------------------------------------------------
-- 6. 사진 (TripPhoto)
-- --------------------------------------------------------------

CREATE TABLE trip_photos (
    id                  BIGSERIAL PRIMARY KEY,
    trip_id             BIGINT       NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    timeline_item_id    BIGINT       REFERENCES trip_timeline_items(id) ON DELETE SET NULL,
    owner_type          VARCHAR(20)  NOT NULL,  -- TRIP_COVER / TIMELINE_ITEM
    storage_key         VARCHAR(500) NOT NULL,
    file_url            VARCHAR(500),
    original_file_name  VARCHAR(255) NOT NULL,
    content_type        VARCHAR(100) NOT NULL,
    file_size           BIGINT       NOT NULL,
    caption             VARCHAR(500),
    sort_order          INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL
);

COMMENT ON TABLE trip_photos IS '여행 대표 사진 및 타임라인 사진 통합 관리. JPA @Entity trip_photos';
COMMENT ON COLUMN trip_photos.owner_type IS 'TRIP_COVER: 대표 사진 (timeline_item_id null), TIMELINE_ITEM: 타임라인 사진';

-- --------------------------------------------------------------
-- 7. 버킷리스트 (BucketPlace) — 2주차 핵심 CRUD 대상
-- --------------------------------------------------------------

CREATE TABLE bucket_places (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(160) NOT NULL,
    travel_scope        VARCHAR(20)  NOT NULL,  -- DOMESTIC / INTERNATIONAL
    country_id          VARCHAR(2)   REFERENCES countries(code_alpha2),
    domestic_region_id  VARCHAR(10)  REFERENCES domestic_regions(code),
    city_name           VARCHAR(120),
    reason              VARCHAR(1000),
    expected_budget     NUMERIC(19,2),
    desired_season      VARCHAR(60),
    companion           VARCHAR(100),
    priority            INTEGER      NOT NULL DEFAULT 3,
    status              VARCHAR(20)  NOT NULL DEFAULT 'WANT_TO_GO',  -- WANT_TO_GO / PLANNING / BOOKED / VISITED / ON_HOLD
    reference_url       VARCHAR(500),
    memo                TEXT,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL
);

COMMENT ON TABLE bucket_places IS '버킷리스트(가고 싶은 여행지). JPA @Entity bucket_places. 2주차 핵심 CRUD 구현 대상';

CREATE INDEX idx_bucket_user_status ON bucket_places(user_id, status);

-- --------------------------------------------------------------
-- 8. 체크리스트
-- --------------------------------------------------------------

CREATE TABLE travel_checklists (
    id            BIGSERIAL PRIMARY KEY,
    trip_id       BIGINT       NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title         VARCHAR(160) NOT NULL,
    progress_rate INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL
);

COMMENT ON TABLE travel_checklists IS '여행별 체크리스트. JPA @Entity travel_checklists';

CREATE TABLE travel_checklist_items (
    id            BIGSERIAL PRIMARY KEY,
    checklist_id  BIGINT       NOT NULL REFERENCES travel_checklists(id) ON DELETE CASCADE,
    category      VARCHAR(80)  NOT NULL,
    content       VARCHAR(300) NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'TODO',  -- TODO / DONE
    sort_order    INTEGER      NOT NULL DEFAULT 0,
    due_date      DATE,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL
);

COMMENT ON TABLE travel_checklist_items IS '체크리스트 항목. JPA @Entity travel_checklist_items';

-- --------------------------------------------------------------
-- 9. 체크리스트 템플릿 (시스템 참조 데이터)
-- --------------------------------------------------------------

CREATE TABLE travel_checklist_templates (
    id             BIGSERIAL PRIMARY KEY,
    travel_scope   VARCHAR(20)  NOT NULL,  -- DOMESTIC / INTERNATIONAL
    title          VARCHAR(160) NOT NULL,
    display_order  INTEGER      NOT NULL DEFAULT 0,
    active         BOOLEAN      NOT NULL DEFAULT true,
    created_at     TIMESTAMP    NOT NULL,
    updated_at     TIMESTAMP    NOT NULL
);

COMMENT ON TABLE travel_checklist_templates IS '체크리스트 템플릿. 여행 생성 시 travel_scope 기반으로 자동 적용. SeedDataLoader로 초기 데이터 주입';

CREATE TABLE travel_checklist_template_items (
    id          BIGSERIAL PRIMARY KEY,
    template_id BIGINT       NOT NULL REFERENCES travel_checklist_templates(id) ON DELETE CASCADE,
    category    VARCHAR(80)  NOT NULL,
    content     VARCHAR(300) NOT NULL,
    sort_order  INTEGER      NOT NULL DEFAULT 0
);

COMMENT ON TABLE travel_checklist_template_items IS '체크리스트 템플릿 항목. JPA @Entity travel_checklist_template_items';

-- ============================================================
-- 설계 특이사항 (JPA 기반)
-- ============================================================
-- 1. 모든 주요 엔티티는 BaseEntity (@MappedSuperclass)를 상속받아
--    created_at, updated_at을 자동 관리합니다.
-- 2. PK는 Surrogate Key (BIGSERIAL)를 기본으로 사용하며, 참조 데이터
--    (countries, domestic_regions)만 Natural Key를 PK로 사용합니다.
-- 3. Enum 타입은 @Enumerated(EnumType.STRING)으로 문자열 컬럼에 매핑됩니다.
-- 4. 연관관계는 JPA @ManyToOne으로 매핑되며, FK 제약조건과 CASCADE
--    정책이 함께 적용됩니다.
-- 5. dev profile에서 JPA ddl-auto: update로 스키마를 자동 관리하며,
--    본 DDL 파일은 설계 검토 및 문서화 목적으로 작성되었습니다.
-- ============================================================
