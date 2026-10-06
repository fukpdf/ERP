# Rate Limiting

## Implementation
`packages/security/src/rate-limit/limiter.ts` — `SlidingWindowLimiter`,
an in-memory sliding-window-counter algorithm. Preconfigured helpers:
- `createIpLimiter()` — 20 requests / 15 min per IP
- `createAccountLoginLimiter()` — 5 requests / 15 min per account

`adaptive-limiter.ts` wraps a base limiter and tightens the effective
budget under system load (via a caller-supplied 0–1 load signal),
so a noisy client gets throttled harder when the system is already
stressed — the load signal itself (CPU/queue-depth/p95 latency) isn't
wired to anything real in this slice; it's a pluggable function.

## Production requirement: Redis backing
The `SlidingWindowLimiter` here is a single-process, in-memory
reference implementation — correct for tests and for a
single-instance deployment, but **not sufficient across multiple API
pods**, since each pod would track its own counters independently,
effectively multiplying the real limit by the pod count. Production
deployment must replace the internal `Map` with Redis (e.g., a sorted
set per key with `ZADD`/`ZREMRANGEBYSCORE`, or Redis's native rate
limiting patterns) behind the same `check(key)` interface. **Not
implemented in this slice** — flagged as the most important follow-up
for this module.

## Global rate limiting
The spec also calls for global (platform-wide) rate limiting, distinct
from per-IP/per-account. This is typically best enforced at the
WAF/CDN edge (see `infra/security-hardening/waf/cloudflare-rules.yaml`,
which includes a rate-limit rule on the login endpoint) rather than in
application code, since edge-level limiting stops abusive traffic
before it reaches the API tier at all.
