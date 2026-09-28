# Penetration Test Plan

## Cadence
- **Internal (in-house)**: every 6 months, using
  `tools/pentest/methodology.md` and the checklists in
  `tools/pentest/checklist/`.
- **External (third-party)**: annually, plus once specifically
  pre-launch (required gate — see docs/launch/LAUNCH_CHECKLIST.md).
  External scope additionally includes social engineering, which
  internal testing does not (see `tools/pentest/scope.md`).

## Pre-launch pen test — current status: NOT DONE

This is stated plainly because it's a launch-blocking gate (G10 in the
original M15 quality gates) and there is no live instance to test in
this delivery environment. What exists instead:
- A complete scope document, methodology, and 6 area checklists.
- Real, runnable attack scripts (JWT bypass, IDOR, CSRF, rate-limit
  bypass, sqlmap wrapper) ready to point at a staging environment.
- A report template.

**Before launch, an actual external pen test firm must be engaged**
and the checklist/scripts here can serve as a starting brief for them,
but do not substitute for their independent assessment.

## Vendor selection criteria (for the external engagement)
- Experience with multi-tenant SaaS specifically (cross-tenant
  isolation testing is a specialized skill).
- Willingness to test the AI module's prompt-injection surface, which
  not all generalist pen test firms cover well.
- Retest included in scope, not billed separately, so findings are
  actually verified closed.
