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

## Latest verified CI evidence

Final Phase 7 verification is included in **GitHub Actions run 36721340645 (run #192)** on commit `8fc3bf00d44397a7d1ef930e2aa1a49e13d6335e`. The complete validation workflow finished **successfully**.

Fresh disposable PostgreSQL 17 / Redis 8 evidence:
- 15 Prisma migrations applied successfully, including the Phase 8 queue migration.
- 55 PostgreSQL RLS policies observed; every tenant-scoped table reported RLS and FORCE RLS enabled, with per-table policy coverage verified.
- Application runtime role reported `erp_app`, non-superuser and `NOBYPASSRLS`.
- Tenant isolation probe: tenant A saw 1 own organization row and **0 cross-tenant rows**.
- Redis PING and read/write probe passed.
- PostgreSQL backup/restore rehearsal passed.
- Bounded load gate: 256 requests, concurrency 16, p95 **141.26 ms**, configured maximum **250 ms**, throughput **1,026.67 requests/s**.
- Redis restart/recovery passed.
- Post-chaos runtime re-verification passed.
- The same workflow also passed the Phase 8 queue runtime probe, including cross-tenant queue visibility isolation and tenant-scoped idempotency.

The previous Phase 7 run remains useful historical evidence, but this run is the authoritative current verification because it validates the Phase 7 gates against the current schema and current repository head.

## Remaining external gates

These remain explicitly **not claimed as production PASS** because they require deployment/external evidence: production HTTP health/telemetry, immutable deployment rollback, multi-region failover, measured production RTO/RPO, production-scale load/soak/capacity testing, WAF/DDoS edge validation, independent penetration testing, and production-equivalent disaster-recovery rehearsal.
