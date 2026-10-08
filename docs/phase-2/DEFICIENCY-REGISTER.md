# Phase 2 Deficiency Register

**Document Status:** Permanent Engineering Issue Tracker — Phase 2 Re-Certification  
**Classification Standards:** Critical, High, Medium, Low, Informational  
**Resolution Rule:** No Critical or High Phase 2 issue may remain unresolved before phase certification.

---

## Issue Summary

| ID | Severity | Category | Title | Affected Files | Status |
| :-: | :---: | :---: | :--- | :--- | :---: |
| **DEF-007** | *Medium* | *Code Quality* | Unused `logger` import and redundant regex escape in correlation sanitizer | `packages/core/src/http/context-middleware.ts` | **RESOLVED** |
| **DEF-008** | *Low* | *Code Quality* | Unused `InternalError` import in test suite | `packages/core/tests/http.test.ts` | **RESOLVED** |
| **DEF-009** | **CRITICAL** | *Runtime / Resilience* | Runtime import failure allowed server startup and served fake healthy fallback responses | `artifacts/erp-preview/imported/server.js` | **RESOLVED** |
| **DEF-010** | **High** | *Configuration* | Typed configuration was not used by live server; server hard-coded PORT and HOST | `artifacts/erp-preview/imported/server.js` | **RESOLVED** |
| **DEF-011** | **High** | *Runtime / Draining* | DRAINING state did not enforce ingress shutoff; operational requests continued normally | `packages/core/src/runtime/lifecycle.ts`, `server.js` | **RESOLVED** |
| **DEF-012** | **High** | *Architecture* | ServiceContainer was implemented but not integrated into application runtime bootstrap | `packages/core/src/runtime/lifecycle.ts`, `server.js` | **RESOLVED** |
| **DEF-013** | **High** | *Runtime / Lifecycle* | Runtime shutdown from FAILED state attempted illegal FAILED -> TERMINATING transition | `packages/core/src/runtime/lifecycle.ts` | **RESOLVED** |
| **DEF-014** | **High** | *Runtime / Lifecycle* | `markFailed()` caught transitions and forcefully assigned `this.state = 'FAILED'`, breaking TERMINATED immutability | `packages/core/src/runtime/lifecycle.ts` | **RESOLVED** |

---

## Detailed Issue Records

### DEF-007: Unused Import and Redundant Regex Escape in Correlation ID Sanitizer
- **Severity:** Medium
- **Root Cause:** In `packages/core/src/http/context-middleware.ts`, `logger` was imported but not referenced directly in middleware scope. Additionally, the regular expression `/^[a-zA-Z0-9_\-\.]{8,128}$/` contained an unnecessary escape `\.` inside a character class.
- **Affected Files:** `packages/core/src/http/context-middleware.ts`.
- **Resolution / Fix:** Removed unused `logger` import and refined regex to `/^[a-zA-Z0-9_\-.]{8,128}$/`. Verified clean with `oxlint --deny-warnings`.
- **Status:** RESOLVED

### DEF-008: Unused `InternalError` Import in Test Suite
- **Severity:** Low
- **Root Cause:** In `packages/core/tests/http.test.ts`, `InternalError` was imported from `dist/index.js` but the test utilized generic `Error` instances to verify unexpected internal exception sanitization.
- **Affected Files:** `packages/core/tests/http.test.ts`.
- **Resolution / Fix:** Removed unused import. Verified clean with `oxlint --deny-warnings`.
- **Status:** RESOLVED

### DEF-009: Runtime Import Failure Allowed Server Startup with Fake Healthy Fallbacks
- **Severity:** CRITICAL
- **Root Cause:** In `artifacts/erp-preview/imported/server.js`, dynamic import of `@erp/core` was wrapped in a `try/catch` block that logged a warning and continued starting the HTTP server, and provided fallback health responses returning HTTP 200 without the Phase 2 runtime.
- **Affected Files:** `artifacts/erp-preview/imported/server.js`.
- **Resolution / Fix:** Removed all fallback behavior. If `@erp/core` fails to import, or if configuration validation fails, startup aborts immediately with `process.exit(1)` and marks the runtime `FAILED`. Fake healthy fallback endpoints were eliminated entirely.
- **Status:** RESOLVED

### DEF-010: Typed Configuration Was Not Used by the Live Runtime Server
- **Severity:** High
- **Root Cause:** `packages/core/src/config/config.ts` provided `parseConfig()`, but `artifacts/erp-preview/imported/server.js` hard-coded `PORT = 3000` and `HOST = "0.0.0.0"`.
- **Affected Files:** `artifacts/erp-preview/imported/server.js`.
- **Resolution / Fix:** Removed hard-coded constants. Server now derives `port`, `host`, `env`, `appVersion`, and timeouts directly from `core.parseConfig(process.env)`. Invalid configuration (such as invalid `PORT` or missing production `JWT_SECRET`) halts startup with a non-zero exit code.
- **Status:** RESOLVED

### DEF-011: DRAINING State Did Not Enforce Ingress Shutoff
- **Severity:** High
- **Root Cause:** `RuntimeLifecycle.shutdown()` transitioned to `DRAINING`, but the HTTP server did not inspect the runtime lifecycle state prior to dispatching new operational requests.
- **Affected Files:** `packages/core/src/runtime/lifecycle.ts`, `artifacts/erp-preview/imported/server.js`.
- **Resolution / Fix:** Implemented `isIngressOpen()` on `RuntimeLifecycle` (returns true ONLY when `state === 'READY'`). In `server.js`, incoming requests verify `isIngressOpen()`. If not open, new operational requests return HTTP 503 (`Retry-After: 5`, `Connection: close`), while `/health/live` remains 200 and `/health/ready` returns 503. In-flight requests drain cleanly.
- **Status:** RESOLVED

### DEF-012: ServiceContainer Implemented But Not Integrated into Runtime Bootstrap
- **Severity:** High
- **Root Cause:** `ServiceContainer` was implemented in `@erp/core/runtime/container.ts` with topological sorting and cycle checks, but the application runtime bootstrap did not use it as the service lifecycle manager.
- **Affected Files:** `packages/core/src/runtime/lifecycle.ts`, `artifacts/erp-preview/imported/server.js`.
- **Resolution / Fix:** Attached `ServiceContainer` to `RuntimeLifecycle` via `attachContainer()`. Registered `dataStore` and `httpServer` with explicit dependency edges (`httpServer` depends on `dataStore`). Startup invokes `container.startAll()` in topological order before `markReady()`. Shutdown invokes `container.stopAll()` in reverse order (`httpServer` stops before `dataStore` closes queues).
- **Status:** RESOLVED

### DEF-013: Runtime Shutdown from FAILED State Attempted Illegal Transition
- **Severity:** High
- **Root Cause:** `RuntimeLifecycle` defines `FAILED -> TERMINATED` as a legal transition. However, `shutdown()` unconditionally attempted `transitionTo('TERMINATING')`. When the runtime was already in `FAILED`, this attempted `FAILED -> TERMINATING`, which is illegal according to the state machine, causing `IllegalStateTransitionError`.
- **Affected Files:** `packages/core/src/runtime/lifecycle.ts`, `packages/core/tests/runtime.test.ts`.
- **Resolution / Fix:** Updated `shutdown()` semantics to strictly respect entry states:
  - `INITIALIZING -> TERMINATING -> TERMINATED`
  - `READY -> DRAINING -> TERMINATING -> TERMINATED`
  - `DRAINING -> TERMINATING -> TERMINATED`
  - `TERMINATING -> TERMINATED`
  - `FAILED -> TERMINATED` (does not transition through `DRAINING` or `TERMINATING`, executes safe cleanup, preserves original failure reason, records duration, ends in `TERMINATED`)
  - `TERMINATED -> no-op` (idempotent)
- **Status:** RESOLVED

### DEF-014: `markFailed()` Caught Transitions and Forcefully Assigned `this.state = 'FAILED'`
- **Severity:** High
- **Root Cause:** In `RuntimeLifecycle.markFailed()`, a `try/catch` block caught illegal transition errors and forcefully executed `this.state = 'FAILED'`. This bypassed state machine validation and broke the guarantee that `TERMINATED` is a terminal, immutable state (allowing an already terminated runtime to be mutated to `FAILED`).
- **Affected Files:** `packages/core/src/runtime/lifecycle.ts`, `packages/core/tests/runtime.test.ts`.
- **Resolution / Fix:** Removed direct assignment `this.state = 'FAILED'`. `markFailed()` now executes `this.transitionTo('FAILED')`, strictly validating transitions. All transitions from `TERMINATED` (`TERMINATED -> READY`, `TERMINATED -> FAILED`, `TERMINATED -> DRAINING`, `TERMINATED -> TERMINATING`) are strictly rejected with `IllegalStateTransitionError`. `TERMINATED` is guaranteed to be immutable.
- **Status:** RESOLVED

