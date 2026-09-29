# Phase 1 — Static Verification

**Date:** 2026-09-29  
**Branch:** `erp-development`

## Re-audit result

Phase 1 was re-audited against the current Phase-1 contract and the current repository tree.

### Findings
1. Phase-1 verification documents referenced by the implementation status were missing from the repository.
2. Migration 0002 policies had `USING` predicates but no `WITH CHECK` predicates, so INSERT/UPDATE tenant isolation was not explicitly fail-closed.
3. Phase-1 RLS tables were enabled but not `FORCE ROW LEVEL SECURITY`, leaving a privileged table owner outside the policy boundary.
4. Session records were not protected by RLS.
5. The test glob in the root package manifest covers current nested package tests, but runtime execution remains dependent on an installed toolchain.
6. The workspace has no verified lockfile; this remains a runtime reproducibility blocker and is not fabricated.

### Fixed in the repository
- Added explicit `WITH CHECK` to all Phase-1 tenant policies.
- Added `FORCE ROW LEVEL SECURITY` to Phase-1 tenant-scoped tables.
- Added Session RLS using the identity-to-tenant membership boundary.
- Added the missing verification artifact itself.

### Runtime gate
Not claimed as PASS until a real PostgreSQL environment, dependencies, Prisma generation, and cross-tenant integration tests execute successfully.
