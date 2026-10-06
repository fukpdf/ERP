# Authentication Hardening

Base authentication (Argon2id hashing, JWT RS256, MFA via TOTP +
WebAuthn) is implemented in M3.1 — not rebuilt here. M15 adds
hardening on top:

## Password policy
`meetsPasswordPolicy()` (`packages/security/src/input/validators.ts`):
12+ characters, requires upper/lower/digit, rejects trivially repeated
characters. `isPasswordPwned()` provides the pure-function check
against an HIBP k-anonymity range response — the actual network call
to `https://api.pwnedpasswords.com/range/{first-5-hash-chars}` must be
made by the caller (kept out of this function so it's testable
offline; not wired into a live signup flow in this slice).

## Brute-force / credential stuffing protection
`BruteForceDetector`: 5 failed attempts per account per 15 minutes
locks the account for 15 minutes; 20 failed attempts per IP per 15
minutes blocks the IP. Progressive delay (`progressiveDelayMs`) adds
1s/2s/4s/... backoff up to 30s before responding to failed attempts,
slowing automated attacks even before the hard lockout triggers.

**Known limitation:** the reference `BruteForceDetector` is in-memory
and per-process. In a multi-pod deployment, an attacker could spread
attempts across pods to reset the effective limit. Production
deployment MUST back this with Redis (shared state) — tracked as a
follow-up in MANIFEST.md, not done in this slice.

## MFA enforcement
`MfaRequiredGuard` blocks access to routes tagged `@RequireMfa()`
unless the current session completed MFA *after* the session started
(prevents a stale/pre-MFA session credential from being reused). Per
the M15 spec, MFA is mandatory for all admin-role actions and all
control-plane endpoints — routes under `/v1/security/*` should all be
tagged `@RequireMfa()`.

## JWT hardening (verification checklist, M3.1 owns implementation)
- Algorithm pinned to RS256 — reject tokens with `alg: none` or `HS256`
  (algorithm confusion attack).
- Short-lived access tokens, refresh token rotation.
- Signing key rotation every 90 days (see KEY_ROTATION.md), old keys
  kept available for verification during the grace period only.
