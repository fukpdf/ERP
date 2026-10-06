# Stage 50 — PostgreSQL Runtime Catalog + Clean-Database Migration Gate

## Purpose

Stage 50 adds a read-only live PostgreSQL catalog inspection layer and a guarded runtime entry point. It does not invent a migration result and it does not mutate migration history.

## Runtime order

1. Provision a disposable PostgreSQL 16/17 database.
2. Apply `prisma/raw-sql/01-uuid-v7-function.sql` as the bootstrap prerequisite.
3. Validate the pinned Prisma 5.20.0 schema.
4. Generate the baseline candidate using the Stage 47 guarded generator.
5. Review and apply the baseline to the disposable database.
6. Apply the post-table infrastructure (`02-rls-and-triggers.sql` and grants) through reviewed migrations.
7. Run `scripts/verify-stage50-runtime-catalog.sh` with explicit runtime opt-in.
8. Compare catalog output with Stage 49 manifests and Prisma schema.
9. Run `prisma migrate diff` in both directions where appropriate and module runtime tests.
10. Promote only a reviewed, reproducible migration chain.

## Safety gates

Runtime execution requires:

- `STAGE50_ALLOW_RUNTIME=1`
- `STAGE50_DISPOSABLE_DB=1`
- `DATABASE_URL`
- `psql`

The catalog SQL itself is read-only: it contains no `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, or `DELETE` statements.

## Covered live dimensions

- tables and columns
- primary/unique/foreign/check constraints
- indexes
- RLS enable/force state and policies
- user triggers
- authoritative helper functions
- schema/table privileges for `erp_app` and platform role

## Current environment result

Static gate can run without PostgreSQL. Runtime PASS must not be claimed until a disposable PostgreSQL instance actually executes the bootstrap, baseline, infrastructure, catalog and migration-diff workflow.
