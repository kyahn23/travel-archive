#!/usr/bin/env bash

# Runs only when the official PostgreSQL image initializes a new data directory.
# Flyway owns every application table; this script creates only the app role/DB.
set -eEuo pipefail

DB_NAME="${DB_NAME:-travel_archive}"
DB_USER="${DB_USER:-$DB_NAME}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=db_user="$DB_USER" \
  --set=db_password="$DB_PASSWORD" <<'EOSQL'
SELECT format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'db_user')
\gexec
EOSQL

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=db_name="$DB_NAME" \
  --set=db_user="$DB_USER" <<'EOSQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db_name')
\gexec
EOSQL
