#!/usr/bin/env bash
set -euo pipefail
: "\${DATABASE_URL:?DATABASE_URL is required}"
: "\${PHASE7_APP_PASSWORD:?PHASE7_APP_PASSWORD is required}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --set=app_password="$PHASE7_APP_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE erp_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_app') \gexec
SELECT format('ALTER ROLE erp_app LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS', :'app_password') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO erp_app', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO erp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO erp_app;
SQL
echo "PHASE7_APP_ROLE=READY"
