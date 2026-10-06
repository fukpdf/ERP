# CSRF Protection

## Approach: double-submit cookie, HMAC-bound to session

Implemented in `packages/security/src/session/csrf.ts`, enforced by
`apps/api/src/security/middleware/csrf.middleware.ts`.

1. On login, the server issues a CSRF token: a random nonce plus an
   HMAC of `sessionId.nonce` using a server-side secret
   (`CSRF_SECRET`). This is set as a cookie (`SameSite=Strict`,
   `Secure`, **not** `HttpOnly` — the client JS must read it to echo
   it back).
2. On every state-changing request (POST/PUT/PATCH/DELETE), the client
   sends the same value in an `X-CSRF-Token` header.
3. The server checks: cookie value === header value (double-submit),
   AND the HMAC verifies against the current session ID (so a token
   stolen from session A can't be replayed against session B).
4. `Origin` header is also checked against an allowlist as defense in
   depth — a request with no `X-CSRF-Token` never reaches the origin
   check because SameSite=Strict cookies aren't sent cross-site
   anyway, but the origin check catches same-site misconfigurations.

## Why double-submit instead of synchronizer token pattern

Double-submit avoids server-side session storage of the token itself
(the HMAC makes forgery infeasible without the secret), which keeps it
stateless and easy to scale horizontally.

## Token rotation

A new token is issued on every login (tied to the new session ID).
Rotate-on-privilege-change is handled by `SessionManager.rotate()`,
which the CSRF layer should be called alongside (issue a new CSRF
token whenever the session is rotated).

## Testing

- Unit: `packages/security/src/__tests__/csrf.spec.ts`
- Integration: `tools/pentest/scripts/csrf-tests.sh` (requires a live
  instance — not run in this delivery)

## Known limitation

GET requests are exempt (per REST convention — GET should never be
state-changing). If any GET endpoint in the merged app has side
effects, it is NOT protected by this middleware and should be
refactored to use a proper HTTP method instead of being CSRF-guarded.
