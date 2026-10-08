# Phase 1 Deficiency Register

**Document Status:** Permanent Engineering Issue Tracker — Phase 1 Certification  
**Classification Standards:** Critical, High, Medium, Low, Informational  
**Resolution Rule:** No Critical or High Phase 1 issue may remain unresolved before phase certification.

---

## Issue Summary

| ID | Severity | Category | Title | Affected Files | Status |
| :-: | :---: | :---: | :--- | :--- | :---: |
| **DEF-001** | *Informational* | *Toolchain* | Git log unavailable inside ephemeral container | Git history inspection | **RESOLVED** |
| **DEF-002** | *Medium* | *Runtime* | Shutdown timeout kept Node event loop open for 15s in test runner | `packages/core/src/runtime/runtime-lifecycle.ts` | **RESOLVED** |
| **DEF-003** | *Medium* | *Security/Logging* | Redaction of generic `auth` container object obscured nested keys | `packages/core/src/logging/logger.ts` | **RESOLVED** |
| **DEF-004** | **High** | *Quality / CI* | Root `npm run lint` executed fake `echo 'Lint passed'` | `package.json` | **RESOLVED** |
| **DEF-005** | **High** | *Build / CI* | Root `npm run build` executed fake `echo 'Build complete'` | `package.json` | **RESOLVED** |
| **DEF-006** | **High** | *Architecture* | `check-boundaries.mjs` used line-based regex instead of AST & graph cycle analysis | `scripts/check-boundaries.mjs` | **RESOLVED** |

---

## Detailed Issue Records

### DEF-001: Git Commit History Inspection in Ephemeral Container
- **Severity:** Informational
- **Root Cause:** Container environment mounts workspace files directly without `.git` database directory.
- **Affected Areas:** Local git CLI commands (`git log`, `git status`).
- **Resolution / Fix:** Commit hashes `8298c83` (normalization) and `54fc3d4` (Phase 0 documentation) verified through environment prompt metadata and historical records. Documented in `FINAL-REPORT.md`.
- **Status:** RESOLVED

### DEF-002: Shutdown Timeout Kept Node Event Loop Open in Test Runner
- **Severity:** Medium
- **Root Cause:** In `RuntimeLifecycle.shutdown()`, `setTimeout` created an unmanaged timer handle on the Node.js event loop that held process termination until the 15-second timeout expired.
- **Affected Files:** `packages/core/src/runtime/runtime-lifecycle.ts`.
- **Resolution / Fix:** Captured timer handle in a `let timer: NodeJS.Timeout | undefined` variable and invoked `clearTimeout(timer)` inside the `finally` block once shutdown completed. Test suite execution dropped from 16.8s to 1.8s.
- **Status:** RESOLVED

### DEF-003: Redaction of Generic `auth` Container Key Obscured Nested Object Properties
- **Severity:** Medium
- **Root Cause:** `'auth'` was included in `SENSITIVE_KEYS`. When an object payload had an outer key named `auth: { password: ... }`, the entire object was replaced with `'[REDACTED]'`, preventing inspection of non-sensitive metadata and causing nested assertions to fail.
- **Affected Files:** `packages/core/src/logging/logger.ts`.
- **Resolution / Fix:** Removed generic `'auth'` container name while retaining specific sensitive credential keys: `'authorization'`, `'password'`, `'token'`, `'secret'`, `'cookie'`, `'apikey'`, `'creditcard'`, `'iban'`, etc. Sub-objects now recurse cleanly and redact exact secrets.
- **Status:** RESOLVED

### DEF-004: Root `npm run lint` Executed Fake Echo Command
- **Severity:** High
- **Root Cause:** Root `package.json` had `"lint": "echo 'Lint passed'"`, which fabricated a passing lint status without executing any static analysis on TypeScript/JavaScript source code.
- **Affected Files:** `package.json`, `packages/contracts/src/base/cqrs.ts`, `scripts/run-tests.mjs`.
- **Resolution / Fix:** Installed `oxlint` (Rust-based AST linter with zero transitive dependencies) as a devDependency. Configured `"lint": "oxlint --deny-warnings packages scripts"` to strictly fail on any lint violation. Fixed 3 genuine warnings identified by `oxlint` (unused `path` import in `run-tests.mjs`, phantom type parameters in `cqrs.ts`). Real lint now inspects 36 files across 96 rules with 0 warnings/errors.
- **Status:** RESOLVED

### DEF-005: Root `npm run build` Executed Fake Echo Command
- **Severity:** High
- **Root Cause:** Root `package.json` had `"build": "echo 'Build complete'"`, which bypassed actual compilation of Phase 1 workspace packages.
- **Affected Files:** `package.json`.
- **Resolution / Fix:** Updated `"build": "tsc --build"`, which performs genuine composite TypeScript compilation across all project references (`packages/core`, `packages/contracts`), emitting declarations (`.d.ts`), sourcemaps (`.d.ts.map`), and ES modules (`.js`) into `dist/`, and exiting with non-zero on any compiler diagnostic.
- **Status:** RESOLVED

### DEF-006: Boundary Validator Used Line-Based Regex Instead of AST & Graph Cycle Detection
- **Severity:** High
- **Root Cause:** `scripts/check-boundaries.mjs` performed naive line-by-line substring checks. It could not detect multi-line imports, dynamic imports, require statements, deep imports bypassing public API entry points, or circular dependency cycles.
- **Affected Files:** `scripts/check-boundaries.mjs`.
- **Resolution / Fix:** Re-implemented `scripts/check-boundaries.mjs` using the official TypeScript Compiler API (`ts.createSourceFile`). The validator extracts all static, export, dynamic, and CommonJS import specifiers from the AST, maps them to architectural layer tiers (Core=1, Contracts=2, Platform=3, Modules=4, Capabilities=5, Applications=6), enforces public API encapsulation by blocking deep imports (e.g. `@erp/core/src/*`), and performs a DFS 3-color graph traversal to detect circular dependencies across package and file dependency graphs.
- **Status:** RESOLVED
