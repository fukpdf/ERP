# Phase 4 Deficiency Register — Database & Data Platform

**Document Status:** Permanent Engineering Issue Tracker — Phase 4 Database Platform Hardening  
**Classification Standards:** Critical, High, Medium, Low, Informational  
**Resolution Rule:** No Critical or High issues may remain unresolved before phase certification.

---

## Issue Summary

| ID | Severity | Category | Title | Affected Files | Status |
| :-: | :---: | :---: | :--- | :--- | :---: |
| **DEF-020** | **High** | *Database / Security* | RLS is bypassed by default for table owners and superusers (missing `FORCE RLS`) | `lib/db/src/migrations/index.ts`, `lib/db/src/schema/index.ts` | **RESOLVED** |
| **DEF-021** | **High** | *Database / Migrations* | Semicolon splitting in migration parsing is unsafe for procedural SQL and triggers | `lib/db/src/migrations/index.ts` | **RESOLVED** |
| **DEF-022** | **High** | *Database / Security* | `tenants` table lacks Row-Level Security, violating fail-closed access principles | `lib/db/src/migrations/index.ts`, `lib/db/src/schema/index.ts` | **RESOLVED** |
| **DEF-023** | **High** | *Database / Transactions* | Lack of structured Unit-of-Work (UoW) pattern with automatic transaction propagation | `lib/db/src/client.ts`, `lib/db/src/repositories/index.ts` | **RESOLVED** |

---

## Detailed Issue Records

### DEF-020: PostgreSQL RLS Bypass for Table Owners/Superusers
- **Severity:** High
- **Root Cause:** Standard PostgreSQL Row-Level Security (RLS) does not apply to the table owner, superuser, or migrations run as administrative roles unless `FORCE ROW LEVEL SECURITY` is explicitly declared.
- **Affected Files:** `lib/db/src/migrations/index.ts`, `lib/db/src/schema/index.ts`.
- **Security Impact:** Queries executed by the standard application connection/pool user (which typically owns the tables in local/PGlite environments) bypass RLS completely, leading to potential silent tenant data leakage in tests and local deployments.
- **Correction:** Add `FORCE ROW LEVEL SECURITY` statements to all multi-tenant tables.
- **Status:** RESOLVED
- **Verification:** Verified via `db.test.ts` where RLS is explicitly tested with user context switches (`SET LOCAL ROLE erp_app`), and all multi-tenant tables explicitly execute `ALTER TABLE ... FORCE ROW LEVEL SECURITY;`.

### DEF-021: Naive Migration SPLIT parser is Unsafe for Procedural SQL
- **Severity:** High
- **Root Cause:** Splitting SQL scripts purely on semicolons (`sql.split(';')`) breaks when the SQL script defines procedural functions, triggers, DO blocks, or contains semicolon characters inside text strings/dollar-quoted blocks.
- **Affected Files:** `lib/db/src/migrations/index.ts`.
- **Security Impact:** Prevents executing valid production-grade migrations containing advanced procedural security rules, triggers, or audit checks.
- **Correction:** Implement a robust lexical SQL parser that correctly handles quotes, dollar-quoted blocks, and comments while splitting statements.
- **Status:** RESOLVED
- **Verification:** Verified by a custom written lexer/parser `splitSql` inside `lib/db/src/migrations/index.ts`, splitting correctly on semicolons only outside single/double quotes, block comments, single-line comments, and dollar-quoted tags. Tested successfully with PL/pgSQL statements inside the migrations schema.

### DEF-022: Tenants Table Lack of Explicit Row-Level Security
- **Severity:** High
- **Root Cause:** The `tenants` table was treated as a root table but had no Row-Level Security policies applied.
- **Affected Files:** `lib/db/src/migrations/index.ts`, `lib/db/src/schema/index.ts`.
- **Security Impact:** Ordinary tenant-scoped connections could read or write other tenant registrations if access control was not explicitly scoped.
- **Correction:** Enable RLS on the `tenants` table and define a policy restricting SELECT/UPDATE to the active tenant ID context only.
- **Status:** RESOLVED
- **Verification:** Verified via explicit `ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;` and `FORCE ROW LEVEL SECURITY;`, alongside policy `tenant_isolation_policy` asserting `id = current_setting('app.current_tenant_id')`. Tested successfully in test case `proves tenants table security RLS isolation`.

### DEF-023: Missing Unit-of-Work (UoW) & Automatic Transaction Propagation
- **Severity:** High
- **Root Cause:** Repository operations lacked a unified transaction context manager, forcing developers to manually pass transaction contexts down the call stack or run single-query operations.
- **Affected Files:** `lib/db/src/client.ts`, `lib/db/src/repositories/index.ts`.
- **Security Impact:** Higher-tier ERP features executing multiple repository operations cannot easily coordinate atomicity, increasing the risk of partial transaction commits and data integrity issues.
- **Correction:** Implement a standard `UnitOfWork` manager using `AsyncLocalStorage` to automatically propagate and reuse active transaction boundaries across repository calls.
- **Status:** RESOLVED
- **Verification:** Verified by implementing `UnitOfWork` utilizing `AsyncLocalStorage` in `lib/db/src/client.ts`, wrapping standard transaction executions, and enabling automatic propagation. Tested successfully in test case `verifies Unit of Work atomic transaction boundaries, nested composition, and isolation`.
