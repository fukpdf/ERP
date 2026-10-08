# Phase 3 Deficiency Register

**Document Status:** Permanent Engineering Issue Tracker — Phase 3 Implementation & Hardening  
**Classification Standards:** Critical, High, Medium, Low, Informational  
**Resolution Rule:** No Critical or High Phase 3 issue may remain unresolved before phase certification.

---

## Issue Summary

| ID | Severity | Category | Title | Affected Files | Status |
| :-: | :---: | :---: | :--- | :--- | :---: |
| **DEF-015** | **High** | *Runtime / Lifecycle* | `Promise.race` shutdown timeout allowed premature termination claim while background cleanup continued | `packages/core/src/runtime/lifecycle.ts` | **RESOLVED** |
| **DEF-016** | **High** | *Database / Security* | Tenant isolation relied purely on application-level filters without database-level RLS enforcement | `lib/db/src/migrations/index.ts`, `lib/db/src/client.ts` | **RESOLVED** |
| **DEF-017** | **High** | *Database / Security* | Tenant context setting used direct string interpolation rather than parameterized queries | `lib/db/src/client.ts` | **RESOLVED** |

---

## Detailed Issue Records

### DEF-015: Shutdown Timeout & Lifecycle Contract Inconsistency
- **Severity:** High
- **Root Cause:** Previous implementation used `Promise.race([shutdownAction(), timeoutPromise])`, which resolved the shutdown promise upon timeout while cleanup operations continued running in the background. This could lead to premature reporting of `TERMINATED` state before cleanup actually completed.
- **Affected Files:** `packages/core/src/runtime/lifecycle.ts`, `packages/core/tests/runtime.test.ts`.
- **Resolution / Fix:** Replaced race-to-terminate with a deterministic lifecycle contract:
  1. Timeout tracks `hasTimedOut = true` and signals `AbortSignal`, but state transitions to `TERMINATED` *only when cleanup handlers and container services actually finish*.
  2. Cleanup completion state is explicitly modeled via `isCleanupComplete()`.
  3. Late cleanup errors are captured in `lateErrors` and inspectable via `getLateErrors()`.
  4. Shutdown metrics record timeouts accurately.
- **Status:** RESOLVED

### DEF-016: Lack of Database-Level Row Level Security (RLS) for Multi-Tenancy
- **Severity:** High
- **Root Cause:** Multi-tenancy isolation was enforced only at the repository query level (`where(eq(table.tenantId, tenantId))`), leaving the database engine vulnerable if a repository query omitted tenant filtering.
- **Affected Files:** `lib/db/src/migrations/index.ts`.
- **Resolution / Fix:** Enabled PostgreSQL Row Level Security (RLS) on all tenant-scoped tables (`organizations`, `legal_entities`, `users`, `roles`, `role_permissions`, `user_roles`, `audit_logs`). Added strict RLS policies enforcing `tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid` with fail-closed behavior when tenant context is missing.
- **Status:** RESOLVED

### DEF-017: Unsafe String Interpolation in Tenant Context Setting
- **Severity:** High
- **Root Cause:** `runInTenantContext` used template string interpolation `SELECT set_config('app.current_tenant_id', '${tenantId}', true)` which could theoretically permit SQL injection if tenant IDs were improperly formatted.
- **Affected Files:** `lib/db/src/client.ts`.
- **Resolution / Fix:** Replaced string interpolation with parameterized SQL execution using Drizzle's `sql` template helper (`sql` tag automatically binds parameters securely).
- **Status:** RESOLVED
