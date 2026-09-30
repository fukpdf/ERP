#!/usr/bin/env bash
set -euo pipefail
: "\${DATABASE_URL:?DATABASE_URL is required}"
: "\${PHASE7_ADMIN_URL:?PHASE7_ADMIN_URL is required}"
: "\${PHASE7_RESTORE_URL:?PHASE7_RESTORE_URL is required}"
for cmd in pg_dump pg_restore psql createdb dropdb; do command -v "$cmd" >/dev/null || { echo "$cmd is required" >&2; exit 1; }; done
workdir="\${RUNNER_TEMP:-/tmp}/erp-phase7-backup"
mkdir -p "$workdir"; trap 'rm -rf "$workdir"' EXIT
archive="$workdir/erp.dump"
pg_dump --format=custom --no-owner --file="$archive" "$DATABASE_URL"
test -s "$archive"
pg_restore --list "$archive" >/dev/null
restore_db="\$(python3 - "$PHASE7_RESTORE_URL" <<'PY'
import sys
from urllib.parse import urlsplit
print(urlsplit(sys.argv[1]).path.lstrip("/"))
PY
)"
[[ -n "$restore_db" ]] || { echo "PHASE7_RESTORE_URL must include a database name" >&2; exit 1; }
dropdb --if-exists --maintenance-db="$PHASE7_ADMIN_URL" "$restore_db"
createdb --maintenance-db="$PHASE7_ADMIN_URL" "$restore_db"
pg_restore --exit-on-error --no-owner --dbname="$PHASE7_RESTORE_URL" "$archive"
psql "$PHASE7_RESTORE_URL" -v ON_ERROR_STOP=1 -c 'SELECT 1' >/dev/null
echo "PHASE7_BACKUP_RESTORE=PASS"
