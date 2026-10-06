# Security Training (Staff)

## Required for all engineering staff
- Secure coding basics: OWASP Top 10 awareness, why parameterized
  queries matter, why `dangerouslySetInnerHTML` needs sanitization —
  can reuse this module's docs (OWASP_TOP_10.md, XSS.md,
  SQL_INJECTION.md) as training material directly.
- Secrets hygiene: never commit secrets, use the pre-commit hook
  (`tools/security/secret-scan/pre-commit-hook.sh`), what to do if you
  accidentally commit one (rotate immediately, don't just delete the
  commit — history may already be pushed/cached).
- Incident response basics: how to recognize you might be looking at
  a security incident, who to page, per INCIDENT_RESPONSE.md.

## Required for on-call engineers specifically
- Walkthrough of `docs/security/IR_PLAYBOOKS/` before their first
  on-call rotation.
- Familiarity with the escalation matrix (`docs/launch/ESCALATION_MATRIX.md`).

## Required for anyone with control-plane admin access
- Break-glass procedure walkthrough (rare, high-stakes, so training
  matters more than for routine access).
- MFA/WebAuthn setup verification.

## Status
This is a curriculum outline, not a delivered training program —
actually running training sessions, tracking completion (feeding the
SOC 2 evidence collector's "training completion" evidence type), and
building any interactive material is an ongoing HR/security-team
responsibility, not something built as code in this module.
