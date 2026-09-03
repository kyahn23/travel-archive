-- V1__baseline.sql
-- Travel Archive baseline schema (13 tables).
-- FK order: parent → child. All FK delete/update actions are NO ACTION
-- (Todo 5 owns explicit child-deletion order in application code).
-- Column types and nullability mirror current JPA entities 1:1 so that
-- Hibernate ddl-auto=validate succeeds against this schema.

SET search_path TO public;

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname      VARCHAR(80)  NOT NULL,
    role          VARCHAR(30)  NOT NULL DEFAULT 'USER',
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL
);

CREATE TABLE countries (
    code_alpha2   VARCHAR(2)     NOT NULL PRIMARY KEY,
    map_key       VARCHAR(3)     NOT NULL UNIQUE,
    name_ko       VARCHAR(100)   NOT NULL,
    name_en       VARCHAR(120)   NOT NULL,
    continent     VARCHAR(60)    NOT NULL,
    display_order INTEGER        NOT NULL
);

CREATE TABLE domestic_regions (
    code          VARCHAR(10)    NOT NULL PRIMARY KEY,
    map_key       VARCHAR(20)    NOT NULL UNIQUE,
    name_ko       VARCHAR(80)    NOT NULL,
    name_en       VARCHAR(120)   NOT NULL,
    region_type   VARCHAR(30)    NOT NULL,
    display_order INTEGER        NOT NULL
);

CREATE TABLE bucket_places (
    id                 BIGSERIAL    PRIMARY KEY,
    user_id            BIGINT       NOT NULL,
    title              VARCHAR(160) NOT NULL,
    travel_scope       VARCHAR(20)  NOT NULL,
    country_id         VARCHAR(2),
    domestic_region_id VARCHAR(10),
    city_name          VARCHAR(120),
    reason             VARCHAR(1000),
    expected_budget    NUMERIC(19,2),
    desired_season     VARCHAR(60),
    companion          VARCHAR(100),
    priority           INTEGER      NOT NULL DEFAULT 3,
    status             VARCHAR(20)  NOT NULL,
    reference_url      VARCHAR(500),
    memo               TEXT,
    created_at         TIMESTAMP    NOT NULL,
    updated_at         TIMESTAMP    NOT NULL,
    CONSTRAINT fk_bucket_places_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_bucket_places_country
        FOREIGN KEY (country_id) REFERENCES countries(code_alpha2) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_bucket_places_region
        FOREIGN KEY (domestic_region_id) REFERENCES domestic_regions(code) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE trips (
    id                  BIGSERIAL    PRIMARY KEY,
    user_id             BIGINT       NOT NULL,
    bucket_place_id     BIGINT,
    title               VARCHAR(160) NOT NULL,
    travel_scope        VARCHAR(20)  NOT NULL,
    country_id          VARCHAR(2),
    domestic_region_id  VARCHAR(10),
    city_name           VARCHAR(120),
    start_date          DATE         NOT NULL,
    end_date            DATE         NOT NULL,
    status              VARCHAR(20)  NOT NULL,
    travel_type         VARCHAR(80),
    companion           VARCHAR(120),
    summary             TEXT,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL,
    CONSTRAINT fk_trips_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_trips_bucket
        FOREIGN KEY (bucket_place_id) REFERENCES bucket_places(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_trips_country
        FOREIGN KEY (country_id) REFERENCES countries(code_alpha2) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_trips_region
        FOREIGN KEY (domestic_region_id) REFERENCES domestic_regions(code) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE trip_days (
    id          BIGSERIAL    PRIMARY KEY,
    trip_id     BIGINT       NOT NULL,
    day_no      INTEGER      NOT NULL,
    travel_date DATE         NOT NULL,
    title       VARCHAR(160),
    memo        TEXT,
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP    NOT NULL,
    CONSTRAINT fk_trip_days_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE trip_timeline_items (
    id              BIGSERIAL    PRIMARY KEY,
    trip_day_id     BIGINT       NOT NULL,
    item_time       TIME,
    title           VARCHAR(160) NOT NULL,
    memo            TEXT,
    place_name      VARCHAR(160),
    address         VARCHAR(300),
    latitude        NUMERIC(9,6),
    longitude       NUMERIC(9,6),
    cost            NUMERIC(12,2),
    category        VARCHAR(20)  NOT NULL,
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL,
    updated_at      TIMESTAMP    NOT NULL,
    CONSTRAINT fk_timeline_items_day
        FOREIGN KEY (trip_day_id) REFERENCES trip_days(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE trip_photos (
    id                  BIGSERIAL    PRIMARY KEY,
    trip_id             BIGINT       NOT NULL,
    timeline_item_id    BIGINT,
    owner_type          VARCHAR(20)  NOT NULL,
    storage_key         VARCHAR(500) NOT NULL,
    file_url            VARCHAR(500),
    original_file_name  VARCHAR(255) NOT NULL,
    content_type        VARCHAR(100) NOT NULL,
    file_size           BIGINT       NOT NULL,
    caption             VARCHAR(500),
    sort_order          INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL,
    CONSTRAINT fk_trip_photos_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_trip_photos_timeline
        FOREIGN KEY (timeline_item_id) REFERENCES trip_timeline_items(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE travel_checklists (
    id             BIGSERIAL    PRIMARY KEY,
    trip_id        BIGINT       NOT NULL,
    title          VARCHAR(160) NOT NULL,
    progress_rate  INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL,
    updated_at     TIMESTAMP    NOT NULL,
    CONSTRAINT fk_checklists_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE travel_checklist_items (
    id           BIGSERIAL    PRIMARY KEY,
    checklist_id BIGINT       NOT NULL,
    category     VARCHAR(80)  NOT NULL,
    content      VARCHAR(300) NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'TODO',
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    due_date     DATE,
    created_at   TIMESTAMP    NOT NULL,
    updated_at   TIMESTAMP    NOT NULL,
    CONSTRAINT fk_checklist_items_checklist
        FOREIGN KEY (checklist_id) REFERENCES travel_checklists(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE travel_checklist_templates (
    id             BIGSERIAL    PRIMARY KEY,
    travel_scope   VARCHAR(20)  NOT NULL,
    title          VARCHAR(160) NOT NULL,
    display_order  INTEGER      NOT NULL DEFAULT 0,
    active         BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE travel_checklist_template_items (
    id          BIGSERIAL    PRIMARY KEY,
    template_id BIGINT       NOT NULL,
    category    VARCHAR(80)  NOT NULL,
    content     VARCHAR(300) NOT NULL,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT fk_template_items_template
        FOREIGN KEY (template_id) REFERENCES travel_checklist_templates(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE refresh_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMP    NOT NULL,
    revoked_at  TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP    NOT NULL,
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trip_days_trip ON trip_days(trip_id);
CREATE INDEX idx_timeline_items_day ON trip_timeline_items(trip_day_id);
CREATE INDEX idx_trip_photos_trip ON trip_photos(trip_id);
CREATE INDEX idx_trip_photos_timeline ON trip_photos(timeline_item_id);
CREATE INDEX idx_checklists_trip ON travel_checklists(trip_id);
CREATE INDEX idx_checklist_items_checklist ON travel_checklist_items(checklist_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
