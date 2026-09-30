# Phase 2 — Core ERP Domain Foundation Contract

## Scope
Phase 2 establishes the **domain foundation**, not a claim that every ERP business workflow is finished.

Domains in scope:
1. Organization
2. Master Data
3. Accounting / GL
4. Finance
5. Purchasing
6. Sales
7. Inventory
8. HR
9. Payroll
10. CRM
11. Projects
12. Manufacturing
13. Reporting / Analytics

## Required boundary for every domain
- Explicit package boundary under `packages/domains/<domain>`.
- Tenant-scoped data model.
- Ownership and foreign-key boundaries.
- Status/lifecycle semantics where appropriate.
- Permission boundary remains delegated to Phase 1 RBAC; no domain bypass.
- Audit/event behavior must use Phase 1 audit/outbox primitives when write services are implemented.
- No cross-domain direct infrastructure access.

## Database rules
- PostgreSQL is authoritative.
- Prisma schema and migrations must move together.
- Operational domain tables use `tenantId`.
- Operational domain tables use RLS with both `USING` and `WITH CHECK`.
- RLS is forced for table owners on operational domain tables.
- Application transactions must establish `app.tenant_id` through the tenant-aware DB access layer.
- Outbox events require a tenant-scoped idempotency key.

## Phase 2 exit gate
Static completion requires:
- all 13 domain boundaries present;
- domain schema represented in Prisma;
- migration sequence present;
- tenant RLS represented for all operational domain tables;
- idempotency contract present;
- tenant-aware DB transaction helper present;
- documentation matches the implementation;
- static structural audit finds no missing required Phase 2 artifact.

Runtime completion requires a real PostgreSQL environment and successful:
- Prisma schema validation/generation;
- migrations from empty database;
- cross-tenant RLS read/write isolation tests;
- transaction-local tenant context tests;
- representative domain CRUD tests;
- outbox idempotency test.

Until those runtime prerequisites exist, runtime status remains BLOCKED.
