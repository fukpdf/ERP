#!/usr/bin/env bash
set -euo pipefail

compose_file="${PHASE7_COMPOSE_FILE:-infra/phase-7/docker-compose.yml}"
service="${PHASE7_POSTGRES_SERVICE:-postgres}"

docker compose -f "$compose_file" exec -T "$service" bash -lc '
  set -euo pipefail
  rm -f /tmp/erp-phase7.dump
  pg_dump --format=custom --no-owner --file=/tmp/erp-phase7.dump -U postgres -d erp
  test -s /tmp/erp-phase7.dump
  pg_restore --list /tmp/erp-phase7.dump >/dev/null
  dropdb --if-exists -U postgres phase7_restore
  createdb -U postgres phase7_restore
  pg_restore --exit-on-error --no-owner -U postgres -d phase7_restore /tmp/erp-phase7.dump
  psql -v ON_ERROR_STOP=1 -U postgres -d phase7_restore -c "SELECT 1" >/dev/null
  rm -f /tmp/erp-phase7.dump
'
echo "PHASE7_BACKUP_RESTORE=PASS"
