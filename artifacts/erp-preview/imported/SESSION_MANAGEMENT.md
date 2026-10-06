# Session Management Hardening

Implemented in `packages/security/src/session/session-manager.ts`.

## Properties
- Session ID: 256-bit CSPRNG (`randomSessionId()`), base64url encoded.
- Rotation on login — a session is never "upgraded" from an
  unauthenticated to authenticated state with the same ID (prevents
  session fixation).
- Rotation on privilege change — call `SessionManager.rotate()` after
  role changes, MFA enrollment, or any other privilege-affecting event.
- Idle timeout: 15 minutes since last activity.
- Absolute timeout: 8 hours since session creation, regardless of
  activity.
- Server-side storage via the `SessionStore` interface — logout calls
  `destroy()`, which actually removes server-side state (not just a
  client-side cookie clear, which wouldn't prevent replay of a stolen
  cookie).

## Not implemented in this slice
- **Concurrent session limits** — the spec calls for limiting how many
  simultaneous sessions a user can hold. `SessionManager` doesn't
  track this; would need a per-user session index in the store.
- **Device binding / fingerprinting** — `SessionRecord` has a
  `userAgentHash` field but nothing currently checks it against the
  request's actual user agent on `validate()`. Wiring this in is
  straightforward but not done here.
- **Geo-IP validation** — listed as optional in the spec; not
  implemented.

## Production note
`SessionStore` is an interface specifically so the reference
implementation can be swapped for Redis in production — `SessionManager`
itself has no in-memory state. A Redis-backed `SessionStore`
implementation is NOT included in this slice (would live in
`apps/api/src/security/services/`, not built — see MANIFEST.md).
