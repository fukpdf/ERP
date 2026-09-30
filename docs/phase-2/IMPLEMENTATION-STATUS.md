# Phase 2 — Implementation Status

## Implemented
- Explicit package boundary created for all 13 core ERP domains.
- Core domain Prisma models added for organization/master data/accounting/finance/purchasing/sales/inventory/HR/payroll/CRM/projects/manufacturing/reporting.
- Domain migration `0003_core_domain_foundation` added.
- Domain RLS migration `0004_core_domain_rls_policies` added.
- Platform RLS hardening migration `0005_harden_platform_rls` added.
- Outbox idempotency migration `0006_outbox_idempotency` added.
- Tenant-aware transaction helper added under `packages/db`.
- Prisma CLI/client dependencies pinned to the verified 7.10.0 release line. The public npm registry currently lists `@prisma/client` 7.10.0 as latest stable; Prisma CLI 8.x is an RC line, so the project deliberately uses stable 7.10.0 for both ORM client and CLI. citeturn0search0turn0search5
- Phase 1 UUID validation/test assertion and correlation-id fail-closed deficiencies fixed.

## Security decisions
- Operational domain tables are RLS-enabled and FORCE RLS.
- RLS policies explicitly include WITH CHECK.
- Tenant itself remains a control-plane object and is not FORCE-hardened, preventing tenant provisioning from being accidentally blocked.
- Outbox dedupe is tenant-scoped.
- Correlation IDs fail closed instead of using a duplicate fallback value.

## Known structural limitation requiring runtime verification
Database-level same-tenant reference guards were added in migration 0007, covering cross-domain foreign keys. CRM lead linkage was completed in migration 0008. Runtime testing is still required to prove the guards behave correctly against real PostgreSQL behavior.

## Runtime status
BLOCKED. No verified PostgreSQL runtime, installed dependency graph, generated Prisma client, or disposable migration database is available in the current evidence environment. Static repository work continues; runtime PASS is not inferred.
