# Phase 3 Deficiency Register

**Document Status:** Permanent Engineering Issue Tracker — Phase 3 Final Hardening  
**Classification Standards:** Critical, High, Medium, Low, Informational  
**Resolution Rule:** No Critical or High Phase 3 issue may remain unresolved before phase certification.

---

## Issue Summary

| ID | Severity | Category | Title | Affected Files | Status |
| :-: | :---: | :---: | :--- | :--- | :---: |
| **DEF-015** | **High** | *Runtime / Lifecycle* | `Promise.race` shutdown timeout allowed premature termination claim while background cleanup continued | `packages/core/src/runtime/lifecycle.ts`, `packages/core/tests/runtime.test.ts` | **RESOLVED** |
| **DEF-016** | **High** | *Database / Security* | Tenant isolation relied purely on application-level filters without database-level RLS enforcement | `lib/db/src/migrations/index.ts`, `lib/db/src/client.ts` | **RESOLVED** |
| **DEF-017** | **High** | *Database / Security* | Tenant context setting used direct string interpolation rather than parameterized queries | `lib/db/src/client.ts` | **RESOLVED** |
| **DEF-018** | **High** | *Database / Integrity* | Missing composite foreign keys allowed potential cross-tenant parent-child foreign key references | `lib/db/src/schema/index.ts`, `lib/db/src/migrations/index.ts` | **RESOLVED** |
| **DEF-019** | **High** | *Database / Migrations* | Naive semicolon-splitting migration runner lacked version tracking and checksum drift detection | `lib/db/src/migrations/index.ts` | **RESOLVED** |

---

## Detailed Issue Records

### DEF-015: Shutdown Timeout & Lifecycle Contract Inconsistency
- **Severity:** High
- **Root Cause:** Previous implementation used `Promise.race([shutdownAction(), timeoutPromise])`, which resolved the shutdown promise upon timeout while cleanup operations continued running in the background.
- **Affected Files:** `packages/core/src/runtime/lifecycle.ts`, `packages/core/tests/runtime.test.ts`.
- **Resolution / Fix:** Redesigned shutdown contract: timeout triggers `AbortSignal` and records timeout metrics, but `TERMINATED` state transition is strictly deferred until cleanup handlers and container services complete deterministically.
- **Status:** RESOLVED

### DEF-016: Lack of Database-Level Row Level Security (RLS) for Multi-Tenancy
- **Severity:** High
- **Root Cause:** Multi-tenancy isolation was enforced only at the repository query level.
- **Affected Files:** `lib/db/src/migrations/index.ts`, `lib/db/src/client.ts`.
- **Resolution / Fix:** Enabled PostgreSQL Row Level Security (RLS) on all tenant-scoped tables (`organizations`, `legal_entities`, `users`, `roles`, `role_permissions`, `user_roles`, `audit_logs`) with fail-closed tenant policies. Integrated `AsyncLocalStorage` tenant context validation in repositories.
- **Status:** RESOLVED

### DEF-017: Unsafe String Interpolation in Tenant Context Setting
- **Severity:** High
- **Root Cause:** `runInTenantContext` used template string interpolation for `set_config`.
- **Affected Files:** `lib/db/src/client.ts`.
- **Resolution / Fix:** Replaced string interpolation with parameterized SQL execution using Drizzle's `sql` template helper.
- **Status:** RESOLVED

### DEF-018: Lack of Composite Multi-Tenant Foreign Keys
- **Severity:** High
- **Root Cause:** Foreign keys ensured referenced IDs existed globally across tenants without verifying tenant ownership.
- **Affected Files:** `lib/db/src/schema/index.ts`, `lib/db/src/migrations/index.ts`.
- **Resolution / Fix:** Added composite unique constraints on parent tables (`organizations(id, tenant_id)`, `users(id, tenant_id)`, `roles(id, tenant_id)`) and composite foreign keys on child tables (`legal_entities`, `role_permissions`, `user_roles`). Verified rejection of cross-tenant parent references via database integration tests.
- **Status:** RESOLVED

### DEF-019: Weak Migration Runner and Lack of Checksum Drift Detection
- **Severity:** High
- **Root Cause:** Initial migration runner executed raw DDL statements via semicolon splitting without tracking migration history or checksum drift.
- **Affected Files:** `lib/db/src/migrations/index.ts`.
- **Resolution / Fix:** Implemented versioned migration history (`schema_migrations`), SHA-256 script checksum computation, checksum drift detection, and rigorous `getMigrationStatus()` inspection.
- **Status:** RESOLVED
