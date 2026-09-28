# Authorization Hardening

Core RBAC is M3.3's responsibility. M15 adds:

## MFA-gated actions
See AUTHENTICATION.md — `MfaRequiredGuard` sits alongside RBAC checks,
not instead of them. A user needs both the right role AND a
current-session MFA verification for tagged routes.

## Time-window and IP-restriction guards (documented, not implemented)
The file list for this module includes `guards/time-window.guard.ts`
(restrict certain actions to business hours) and
`guards/ip-restriction.guard.ts` (restrict control-plane admin access
to a known IP range/VPN). **Neither is implemented in this delivery**
— they're straightforward NestJS guards following the same pattern as
`MfaRequiredGuard`, but weren't prioritized in the time available; see
MANIFEST.md. `device-trust.guard.ts` (require a previously-seen device
fingerprint, or step-up auth for a new one) is likewise not
implemented.

## Break-glass access
For control-plane emergency access, use the Vault `admin-policy.hcl`
via the time-boxed (15-minute TTL) OIDC break-glass role documented in
`infra/security-hardening/vault/auth/oidc-auth.yaml`. Any use should
be treated as a security event requiring post-incident review —
document *why* break-glass was needed in the incident record (see
INCIDENT_RESPONSE.md), since routine operations should never require
it.
