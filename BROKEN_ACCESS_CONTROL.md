# Broken Access Control (IDOR) Prevention

## Layers

1. **Row-Level Security (M2)** — the database itself enforces
   tenant isolation; even a bug in application-layer authorization
   shouldn't leak cross-tenant data, because the DB connection is
   scoped to the requesting tenant's context.
2. **RBAC (M3.3)** — role-based checks on which actions a user can
   perform within their own tenant.
3. **Object-level checks in handlers** — even within RLS, a handler
   must verify the requesting user is allowed to access the *specific*
   object ID requested (e.g., an employee viewing only their own
   records vs. an HR admin viewing all). This is the layer most prone
   to IDOR bugs (forgetting an ownership check on one endpoint) and
   the one pen testing specifically targets.
4. **MFA gate on sensitive actions** — `MfaRequiredGuard` in this
   module adds a fourth layer for control-plane / admin actions
   specifically.

## Testing

- `tools/pentest/scripts/idor-tests.sh` — attempts cross-tenant
  resource access with a valid token for a different tenant.
- `tools/pentest/checklist/api-testing.md` — BOLA-focused checklist.

## Status

RLS and RBAC are foundation-module (M2/M3.3) responsibilities, not
rebuilt here. M15's contribution is the MFA guard, the IDOR test
tooling, and the checklist — object-level check coverage across all
business-module endpoints (M4-M9) has NOT been audited in this
delivery (would require access to those modules' code, out of scope
per isolation rules) and should be a specific focus of the actual pen
test before launch.
