# Phase 1 — Platform Foundation Contract

## Scope

Phase 1 establishes the ERP platform foundation only. It does not implement business-domain modules yet.

## Required foundation layers

1. Workspace/package structure.
2. Configuration and environment contracts.
3. PostgreSQL/Prisma foundation.
4. Tenant model and tenant context.
5. Global identity boundary.
6. Authentication/session foundation.
7. RBAC and permissions.
8. RLS/tenant-isolation boundary.
9. Audit/event/outbox foundation.
10. Observability and correlation IDs.

## Current-state constraint

The Phase 0 canonical tree contains documentation/specification/test artifacts but does not currently expose the historical application workspace, dependency manifests, lockfile, or Prisma schema. Therefore Phase 1 must begin with **foundation reconstruction**, not pretend those layers already exist.

## Implementation rule

A foundation artifact is only considered implemented when:
- its source exists in the canonical ERP tree;
- dependency/configuration contracts are explicit;
- tenant/security boundaries are explicit;
- static verification is possible;
- tests cover important failure paths;
- runtime verification is recorded when infrastructure exists.

## Phase 1 sequence

### Unit 1 — Workspace and dependency foundation
Recover or intentionally establish the ERP workspace contract, package boundaries, package manager, lockfile strategy, TypeScript/build configuration, and reproducible commands.

### Unit 2 — Configuration and environment contracts
Define validated runtime configuration, secret boundaries, environment separation, and startup failure behavior.

### Unit 3 — Database foundation
Establish PostgreSQL/Prisma source, migration ownership, connection configuration, transaction conventions, and tenant-aware data access.

### Unit 4 — Tenancy
Implement tenant identity/context, tenant lifecycle primitives, request/job propagation, and fail-closed tenant checks.

### Unit 5 — Identity/auth/session
Establish global identity boundary, credential/session primitives, session invalidation, and authentication context.

### Unit 6 — RBAC
Establish permission model, role/permission resolution, deny-by-default behavior, and authorization enforcement points.

### Unit 7 — RLS/isolation
Implement database-level tenant isolation where supported and prove cross-tenant denial paths.

### Unit 8 — Audit/event/outbox
Establish append-oriented audit records, domain/event contracts, outbox transaction boundary, idempotency, and replay safety.

### Unit 9 — Observability
Establish correlation/request IDs, structured logging contracts, health/readiness semantics, and safe error handling.

## Phase 1 exit gate

Phase 1 cannot be declared complete until:
- all nine foundation units are mapped to actual source;
- dependency/build configuration is reproducible;
- tenant isolation is tested;
- authorization is tested;
- audit/event/outbox boundaries are tested;
- static checks pass;
- runtime database tests pass when infrastructure is available;
- all unavailable runtime gates remain explicitly BLOCKED rather than falsely marked PASS;
- a final re-audit finds no unresolved Phase 1 deficiency that can be fixed within the repository.
