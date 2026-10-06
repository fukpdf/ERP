# Stage 52 — Clean Database Runtime Execution Harness

Stage 52 adds an explicit, destructive-operation-gated runtime path for the
Stage 51 database rehearsal. It is designed to be run only against a newly
created disposable PostgreSQL database.

## Execution order

1. Run Stage 51 static gate.
2. Require `STAGE52_ALLOW_RUNTIME=1` and `STAGE52_DISPOSABLE_DB=1`.
3. Require `DATABASE_URL`, `psql`, `pnpm`, and Prisma 5.20.0.
4. Apply UUIDv7/extension bootstrap before tables.
5. Generate a candidate Prisma baseline with `migrate diff --from-empty`.
6. Apply that generated baseline to the disposable database.
7. Apply RLS/triggers and application grants.
8. Run Prisma schema-to-database differential verification; a non-zero diff fails the run.
9. Run the existing read-only Stage 50 PostgreSQL catalog inspection.
10. Assert that the public base-table count equals the 193 Prisma model count.
11. Hash all evidence files.

## Migration-history safety

The harness does not modify, delete, reset, or replay the existing feature
migration ledger. The clean database is intentionally validated from the
current authoritative schema baseline first. Existing feature migrations must
not be blindly replayed after a baseline that already represents those models;
doing so would attempt duplicate DDL.

## Current environment

The repository environment used to prepare this stage does not currently
provide PostgreSQL/`psql`, a running disposable database, or an installed
Prisma 5.20.0 CLI. Therefore this stage is **implementation-complete but
runtime-blocked** here. No runtime PASS is claimed until the gated command is
actually executed successfully and its evidence is retained.
