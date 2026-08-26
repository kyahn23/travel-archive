-- V2__legacy_reconciliation.sql
-- Bring existing production DBs (created by Hibernate ddl-auto=update) into
-- the V1 baseline shape by adding missing named constraints.
--
-- Scope is intentionally narrow:
--   1. verify refresh_tokens.updated_at column exists with expected type
--      (NOT NULL TIMESTAMP). On mismatch, raise — supported legacy signature
--      is the only path. We never mutate refresh_tokens here.
--   2. if uq_checklist_template_scope_title is absent, ADD CONSTRAINT
--      UNIQUE (travel_scope, title). Same for uq_checklist_template_item_order
--      UNIQUE (template_id, sort_order).
--   3. if either named constraint exists with a DIFFERENT definition, raise.
--   4. preflight duplicate count must be zero before adding unique constraint
--      — otherwise abort without mutating.
-- No other schema changes.

SET search_path TO public;

DO $$
DECLARE
    has_col         BOOLEAN;
    expected_type   TEXT;
    actual_type     TEXT;
    not_null_ok     TEXT;
    constraint_def  TEXT;
    dup_count       BIGINT;
BEGIN
    -- 1) refresh_tokens.updated_at presence + type + nullability
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'refresh_tokens'
          AND column_name = 'updated_at'
    ) INTO has_col;
    IF NOT has_col THEN
        RAISE EXCEPTION 'V2: refresh_tokens.updated_at is missing — legacy DB is not supported';
    END IF;

    SELECT data_type, is_nullable
      INTO actual_type, not_null_ok
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'refresh_tokens'
       AND column_name = 'updated_at';

    expected_type := 'timestamp without time zone';
    IF actual_type IS DISTINCT FROM expected_type THEN
        RAISE EXCEPTION 'V2: refresh_tokens.updated_at type=% expected=%', actual_type, expected_type;
    END IF;
    IF lower(not_null_ok) <> 'no' THEN
        RAISE EXCEPTION 'V2: refresh_tokens.updated_at must be NOT NULL';
    END IF;

    -- 2) uq_checklist_template_scope_title
    SELECT pg_get_constraintdef(c.oid)
      INTO constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'travel_checklist_templates'
       AND c.conname = 'uq_checklist_template_scope_title';
    IF constraint_def IS NULL THEN
        SELECT count(*) INTO dup_count
          FROM (
              SELECT travel_scope, title, count(*) c
                FROM travel_checklist_templates
               GROUP BY travel_scope, title
              HAVING count(*) > 1
          ) d;
        IF dup_count > 0 THEN
            RAISE EXCEPTION 'V2: duplicate (travel_scope,title) pairs in travel_checklist_templates — resolve manually first';
        END IF;
        ALTER TABLE travel_checklist_templates
            ADD CONSTRAINT uq_checklist_template_scope_title UNIQUE (travel_scope, title);
    ELSIF lower(constraint_def) NOT LIKE '%unique%(travel_scope, title)%' THEN
        RAISE EXCEPTION 'V2: uq_checklist_template_scope_title definition mismatch: %', constraint_def;
    END IF;

    -- 3) uq_checklist_template_item_order
    SELECT pg_get_constraintdef(c.oid)
      INTO constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'travel_checklist_template_items'
       AND c.conname = 'uq_checklist_template_item_order';
    IF constraint_def IS NULL THEN
        SELECT count(*) INTO dup_count
          FROM (
              SELECT template_id, sort_order, count(*) c
                FROM travel_checklist_template_items
               GROUP BY template_id, sort_order
              HAVING count(*) > 1
          ) d;
        IF dup_count > 0 THEN
            RAISE EXCEPTION 'V2: duplicate (template_id,sort_order) pairs in travel_checklist_template_items — resolve manually first';
        END IF;
        ALTER TABLE travel_checklist_template_items
            ADD CONSTRAINT uq_checklist_template_item_order UNIQUE (template_id, sort_order);
    ELSIF lower(constraint_def) NOT LIKE '%unique%(template_id, sort_order)%' THEN
        RAISE EXCEPTION 'V2: uq_checklist_template_item_order definition mismatch: %', constraint_def;
    END IF;
END
$$;
