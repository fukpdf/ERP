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

Final Phase 7 verification run: **GitHub Actions run 36686141731 (run #137)** on final implementation commit before this documentation-only update.

All validation steps passed: install, Prisma generate, typecheck, test suite, Prisma validate, security scan, migration deployment, runtime verification, backup/restore, bounded load test, Redis restart recovery, post-chaos runtime verification, evidence upload, and cleanup.

Runtime evidence from the disposable PostgreSQL 17 / Redis 8 environment:
- 14 Prisma migrations applied successfully.
- 54 PostgreSQL RLS policies observed; tenant-scoped tables reported both RLS and FORCE RLS enabled.
- Non-superuser tenant isolation probe: tenant A saw 1 own row and **0 cross-tenant rows**.
- Redis PING and read/write probe passed.
- PostgreSQL backup/restore rehearsal passed.
- Load gate: 256 requests, concurrency 16, p95 **126.73 ms**, configured maximum **250 ms**, measured throughput **1,118.11 requests/s**.
- Redis restart/recovery passed.
- Runtime re-verification after the failure exercise passed.

The earlier failed runs during implementation are retained as audit evidence; they exposed and led to fixes for invalid migration SQL, incorrect trigger drops, Prisma 7 client construction, test-role provisioning, backup tool version mismatch, escaped runtime probes, and pipeline-error masking. The final run above is the authoritative Phase 7 verification result for this implementation cycle.

## Remaining external gates

These remain explicitly **not claimed as production PASS** because they require deployment/external evidence: production HTTP health/telemetry, immutable deployment rollback, multi-region failover and measured RTO/RPO, production-scale load/soak/capacity testing, WAF/DDoS edge validation, independent penetration testing, and production-equivalent disaster-recovery rehearsal.
