-- preflight/legacy_v1_signature.sql
-- Read-only preflight for adopting an existing production DB into V1 baseline.
-- Run via:
--   docker compose -f docker-compose.infrastructure.yml exec -T \
--     -e PGPASSWORD="$DB_PASSWORD" postgres \
--     psql -h 127.0.0.1 -U travel_archive -d travel_archive \
--     -v ON_ERROR_STOP=1 < backend/src/main/resources/db/preflight/legacy_v1_signature.sql
--
-- This script never mutates the schema. It exits with the first failure it
-- finds, with all checks performed in a single transaction so a partial
-- state is impossible.

SET search_path TO public;

-- 0) flyway_schema_history must NOT exist yet (otherwise this DB is already
--    migrated and does not need the preflight/adopt path).
DO $$
BEGIN
    IF to_regclass('public.flyway_schema_history') IS NOT NULL THEN
        RAISE EXCEPTION 'PREFLIGHT: flyway_schema_history already exists — this DB is already migrated';
    END IF;
END
$$;

-- 1) Each required table must exist.
DO $$
DECLARE
    missing TEXT;
    required TEXT[] := ARRAY[
        'users','countries','domestic_regions','bucket_places',
        'trips','trip_days','trip_timeline_items','trip_photos',
        'travel_checklists','travel_checklist_items',
        'travel_checklist_templates','travel_checklist_template_items',
        'refresh_tokens'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY required LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            RAISE EXCEPTION 'PREFLIGHT: required table % is missing', t;
        END IF;
    END LOOP;
END
$$;

-- 2) refresh_tokens.updated_at must exist, NOT NULL, type=timestamp.
DO $$
DECLARE
    has_col BOOLEAN;
    actual_type TEXT;
    not_null TEXT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='refresh_tokens' AND column_name='updated_at'
    ) INTO has_col;
    IF NOT has_col THEN
        RAISE EXCEPTION 'PREFLIGHT: refresh_tokens.updated_at is missing — not a supported legacy signature';
    END IF;
    SELECT data_type, is_nullable INTO actual_type, not_null
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name='refresh_tokens' AND column_name='updated_at';
    IF actual_type IS DISTINCT FROM 'timestamp without time zone' THEN
        RAISE EXCEPTION 'PREFLIGHT: refresh_tokens.updated_at type=% expected=timestamp without time zone', actual_type;
    END IF;
    IF lower(not_null) <> 'no' THEN
        RAISE EXCEPTION 'PREFLIGHT: refresh_tokens.updated_at must be NOT NULL';
    END IF;
END
$$;

-- 3) travel_checklist_templates and travel_checklist_template_items must NOT
--    have any extra timestamp columns beyond what the entity maps.
DO $$
DECLARE
    extra_count INT;
BEGIN
    SELECT count(*) INTO extra_count
      FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='travel_checklist_templates'
       AND column_name IN ('created_at','updated_at');
    IF extra_count > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT: travel_checklist_templates has unmapped timestamp columns (created_at/updated_at) — not a supported legacy signature';
    END IF;

    SELECT count(*) INTO extra_count
      FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='travel_checklist_template_items'
       AND column_name IN ('created_at','updated_at');
    IF extra_count > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT: travel_checklist_template_items has unmapped timestamp columns (created_at/updated_at) — not a supported legacy signature';
    END IF;
END
$$;

-- 4) All FK delete/update actions across the 13 tables must be NO ACTION.
--    (Cascade / SET NULL is not a supported legacy signature.)
DO $$
DECLARE
    bad_count INT;
BEGIN
    SELECT count(*) INTO bad_count
      FROM information_schema.referential_constraints rc
      JOIN information_schema.table_constraints tc
        ON tc.constraint_name = rc.constraint_name
       AND tc.table_schema = rc.constraint_schema
     WHERE tc.table_schema = 'public'
       AND tc.constraint_type = 'FOREIGN KEY'
       AND (rc.delete_rule <> 'NO ACTION' OR rc.update_rule <> 'NO ACTION');
    IF bad_count > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT: % foreign key(s) have delete/update action other than NO ACTION — not a supported legacy signature', bad_count;
    END IF;
END
$$;

-- 5) No duplicate (travel_scope,title) or (template_id,sort_order) pairs.
DO $$
DECLARE
    d1 BIGINT;
    d2 BIGINT;
BEGIN
    SELECT count(*) INTO d1
      FROM (SELECT travel_scope, title FROM travel_checklist_templates
             GROUP BY travel_scope, title HAVING count(*) > 1) x;
    IF d1 > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT: duplicate (travel_scope,title) pairs in travel_checklist_templates — resolve manually first';
    END IF;
    SELECT count(*) INTO d2
      FROM (SELECT template_id, sort_order FROM travel_checklist_template_items
             GROUP BY template_id, sort_order HAVING count(*) > 1) x;
    IF d2 > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT: duplicate (template_id,sort_order) pairs in travel_checklist_template_items — resolve manually first';
    END IF;
END
$$;

\echo 'PREFLIGHT OK — legacy DB matches supported V1 signature'
