# Phase 2 Execution Plan — Runtime, Configuration & Environment Platform

**Document Status:** Approved Engineering Architecture Plan  
**Target Phase:** PHASE 2  
**Governing Authority:** Senior Principal ERP Architect & Platform Engineer  
**Objective:** Engineer a deterministic, typed, observable, and secure runtime foundation for the Universal ERP Platform before future business module development.

---

## 1. Architectural Scope & Boundary Protection

### Strictly IN SCOPE for Phase 2:
1. **Runtime Lifecycle Engine:** State machine (`INITIALIZING`, `READY`, `DRAINING`, `TERMINATING`, `TERMINATED`, `FAILED`), startup sequence, readiness/liveness probes, deterministic graceful shutdown sequence with signal trapping (`SIGTERM`, `SIGINT`), and timeout enforcement.
2. **Typed Service Container:** Explicit registration, typed dependency resolution, topological startup order, reverse shutdown order, circular dependency detection, and lifecycle ownership.
3. **Environment & Configuration Platform:** Typed configuration schema separating non-secret parameters and secrets, environment-specific validation (`development`, `test`, `staging`, `production`), safe startup failure on missing production secrets or malformed values, zero secret leakage in logs, errors, or health responses.
4. **Health Platform:** Standardized `/health/live`, `/health/ready`, and `/health/startup` probes with standard HTTP status codes (200 OK vs 503 Service Unavailable).
5. **Request Context Integration:** Header validation, safe correlation ID generation/sanitization, asynchronous context propagation (`ExecutionContext`), and request lifecycle tracking.
6. **Structured Logging:** Context-bound JSON structured logging with recursive credential and PII redaction.
7. **HTTP Error Boundary:** Translation of standard `AppError` subclasses into sanitized machine-readable JSON responses with preserved correlation IDs and zero stack trace/credential leaks.
8. **Observability Foundation & Metrics:** Provider-agnostic interfaces for logging, metrics, and tracing; lightweight in-memory metrics (request count, durations, active requests, startup/shutdown duration).
9. **Live Preview Integration:** Wire health routes, correlation IDs, and error translation into the operational Node.js server on port 3000 without disrupting legacy preview behavior.
10. **Comprehensive Test Suite & Boundary Validation:** 100% real unit and integration tests, strict TypeScript compilation, zero lint warnings (`oxlint`), and AST boundary verification.

### Strictly OUT OF SCOPE (Absolute Prohibitions):
- Zero business ERP domain logic (GL, AR, AP, Inventory, SCM, CRM, HR, Payroll, etc.)
- Zero relational database schemas or migrations
- Zero distributed event streaming brokers (Kafka, RabbitMQ)
- Zero deletion or breaking changes to legacy preview files (`artifacts/erp-preview/imported/*`)
- Zero Phase 3+ functionality.

---

## 2. Component Design & Module Architecture

### 2.1 `@erp/core/runtime`
- `lifecycle.ts`: Enhanced lifecycle state machine supporting `INITIALIZING`, `READY`, `DRAINING`, `TERMINATING`, `TERMINATED`, `FAILED`.
- `container.ts`: Lightweight typed service container with explicit dependency graph and cycle detection.
- `shutdown.ts`: Graceful shutdown coordinator with timer cancellation and signal trapping.

### 2.2 `@erp/core/config`
- `config.ts`: Central typed configuration with non-secret/secret partitioning and environment-specific validation.

### 2.3 `@erp/core/health`
- `health.ts`: Health registry, check execution, and standardized HTTP response formatters for liveness, readiness, and startup.

### 2.4 `@erp/core/http`
- `context-middleware.ts`: Safe correlation ID extraction, execution context binding, and request duration timing.
- `error-boundary.ts`: Standardized error mapping from `AppError` to HTTP status codes with sanitization.

### 2.5 `@erp/core/observability`
- `interfaces.ts`: Provider-agnostic telemetry interfaces for metrics, tracing, and logging.
- `metrics.ts`: Lightweight in-memory request counter, duration histogram, and lifecycle timer.

---

## 3. Step-by-Step Implementation Sequence

1. **Plan & Registers:** Initialize `docs/phase-2/PHASE-2-PLAN.md`, `docs/phase-2/IMPLEMENTATION-LOG.md`, and `docs/phase-2/DEFICIENCY-REGISTER.md`.
2. **Container & Lifecycle:** Build typed service container and lifecycle state machine in `@erp/core/runtime`.
3. **Configuration & Secrets:** Enhance `@erp/core/config` with URL validation, database/redis secret handling, and strict production checks.
4. **Health Subsystem:** Build `@erp/core/health` supporting `/health/live`, `/health/ready`, and `/health/startup`.
5. **HTTP & Context Middleware:** Build `@erp/core/http` with correlation ID sanitization and error boundary.
6. **Observability Foundation:** Build `@erp/core/observability` with metric interfaces and in-memory collectors.
7. **Export Barrel:** Wire new modules into `@erp/core/src/index.ts`.
8. **Live Server Integration:** Wire health routes and context into `artifacts/erp-preview/imported/server.js`.
9. **Test Suites:** Add unit and integration tests in `packages/core/tests/` covering container, lifecycle, health, context, errors, config, and metrics.
10. **Validation & Verification:** Run `npm run lint`, `npm run build`, `npm run typecheck`, `npm test`, `node scripts/check-boundaries.mjs`, and curl verification on port 3000.
11. **Independent Re-Audit & Certification:** Final re-audit and documentation closeout.
