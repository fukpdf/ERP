#!/usr/bin/env bash
set -euo pipefail
compose_file="\${PHASE7_COMPOSE_FILE:-infra/phase-7/docker-compose.yml}"
docker compose -f "$compose_file" restart redis
for i in {1..30}; do
  if docker compose -f "$compose_file" exec -T redis redis-cli ping 2>/dev/null | grep -qx PONG; then
    echo "PHASE7_REDIS_RECOVERY=PASS"; exit 0
  fi
  sleep 1
done
echo "PHASE7_REDIS_RECOVERY=FAIL" >&2; exit 1
