#!/usr/bin/env bash
set -euo pipefail

compose_file="${PHASE7_COMPOSE_FILE:-infra/phase-7/docker-compose.yml}"
service="${PHASE7_POSTGRES_SERVICE:-postgres}"

docker compose -f "$compose_file" exec -T "$service" bash -lc '
  set -euo pipefail
  rm -f /tmp/erp-phase7.dump
  source_migrations=$(psql -At -v ON_ERROR_STOP=1 -U postgres -d erp -c "SELECT COUNT(*) FROM \"_prisma_migrations\"")
  source_tables=$(psql -At -v ON_ERROR_STOP=1 -U postgres -d erp -c "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='''public''' AND c.relkind='''r'''")
  pg_dump --format=custom --no-owner --file=/tmp/erp-phase7.dump -U postgres -d erp
  test -s /tmp/erp-phase7.dump
  pg_restore --list /tmp/erp-phase7.dump >/dev/null
  dropdb --if-exists -U postgres phase7_restore
  createdb -U postgres phase7_restore
  pg_restore --exit-on-error --no-owner -U postgres -d phase7_restore /tmp/erp-phase7.dump
  restored_migrations=$(psql -At -v ON_ERROR_STOP=1 -U postgres -d phase7_restore -c "SELECT COUNT(*) FROM \"_prisma_migrations\"")
  restored_tables=$(psql -At -v ON_ERROR_STOP=1 -U postgres -d phase7_restore -c "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='''public''' AND c.relkind='''r'''")
  test "$source_migrations" = "$restored_migrations"
  test "$source_tables" = "$restored_tables"
  psql -v ON_ERROR_STOP=1 -U postgres -d phase7_restore -c "SELECT 1" >/dev/null
  echo "source_migrations=$source_migrations restored_migrations=$restored_migrations"
  echo "source_tables=$source_tables restored_tables=$restored_tables"
  rm -f /tmp/erp-phase7.dump
'
echo "PHASE7_BACKUP_RESTORE=PASS"
