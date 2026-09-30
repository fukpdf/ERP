# Phase 7 — Production Readiness

## Scope

Phase 7 turns production-readiness requirements into executable gates where the repository can provide truthful evidence:

- real PostgreSQL and Redis runtime;
- migration execution against disposable PostgreSQL;
- tenant RLS and FORCE RLS verification through a non-superuser;
- Redis availability, read/write, and restart-recovery verification;
- PostgreSQL backup/restore rehearsal using pg_dump/pg_restore;
- bounded concurrent database load testing with an explicit p95 budget;
- runtime evidence retained as CI artifacts;
- explicit boundaries for deployment rollback, disaster recovery, observability, and production-scale testing.

## Executable gates

- `pnpm phase7:runtime`
- `pnpm phase7:load`
- `pnpm phase7:backup-restore`
- `pnpm phase7:chaos`

The CI workflow runs these gates against disposable PostgreSQL 17 and Redis 8 containers after applying the real Prisma migration history. The migration history itself is therefore part of the runtime gate rather than only a static `prisma validate` check.

## Evidence rules

A green CI run proves the configured disposable environment and thresholds only. It does not prove production capacity, multi-region recovery, an application's deployed HTTP telemetry, WAF/DDoS behavior, or an independent security assessment.

No production PASS is claimed without real deployment evidence.

## External gates still requiring deployment or external evidence

- application HTTP health/readiness and telemetry export;
- production rollout and immutable rollback;
- multi-region failover and measured RTO/RPO;
- production-scale load/soak/capacity testing;
- WAF/DDoS edge validation;
- independent penetration testing;
- formal disaster-recovery exercise against production-equivalent storage.

## CI evidence

The workflow stores Phase 7 runtime reports as a GitHub Actions artifact named `phase-7-runtime-evidence`.
