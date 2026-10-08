# Phase 1 Execution Plan — Foundation & Monorepo Architecture

**Document Status:** Approved Phase 1 Engineering Blueprint  
**Target:** Clean Technical Foundation for the Universal ERP Platform  
**Scope:** Infrastructure, Toolchain, Contracts, Configuration, Logging, Errors, Runtime, and Testing Foundations ONLY.  
**Strict Prohibition:** Zero business-domain ERP implementation. Zero deletion of legacy artifacts.

---

## 1. Objectives & Scope Decomposition

Phase 1 establishes the operational engineering foundation for the entire 21-phase ERP roadmap:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 1 FOUNDATION COMPONENTS                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Monorepo & Workspaces     : Root package.json workspaces, tsconfig  │
│ 2. Core Library (@erp/core)  : Context, Result, Money, Math, UOM      │
│ 3. Configuration Foundation  : Typed environment validator (Zod)       │
│ 4. Structured Logging        : Correlation ID, PII redaction, levels   │
│ 5. Standard Error Hierarchy  : Machine-readable typed error envelopes  │
│ 6. Shared Contracts Library  : Base DTOs, CloudEvents, CQRS interfaces │
│ 7. Runtime Lifecycle Engine  : Boot, graceful shutdown, health probes  │
│ 8. Boundary Linter & Tests   : Architecture invariant enforcement      │
│ 9. Automated CI Pipeline     : Typecheck, lint, build, test scripts    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory & Package Topology

The repository will organize clean architectural workspaces:

```
packages/
├── core/                         # @erp/core: Technical primitives, money, errors, logging, config
│   ├── src/
│   │   ├── config/               # Centralized typed configuration engine
│   │   ├── logging/              # Structured logger with redaction & correlation
│   │   ├── errors/               # Standardized error hierarchy
│   │   ├── context/              # AsyncLocalStorage execution context
│   │   ├── math/                 # Fixed-point decimal & money primitives
│   │   ├── result/               # Result<T, E> functional container
│   │   └── runtime/              # Lifecycle manager & graceful shutdown
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── contracts/                    # @erp/contracts: Universal contract definitions
│   ├── src/
│   │   ├── base/                 # Base DTO, Command, Query, Result types
│   │   ├── events/               # CloudEvents v1.0 schema & envelope
│   │   ├── modules/              # Module contract interfaces & manifests
│   │   └── capabilities/         # Capability manifest interfaces
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
└── platform/                     # Platform services placeholder directory
```

Existing artifacts (`artifacts/erp-preview`, `artifacts/api-server`, `artifacts/mockup-sandbox`, `lib/*`) remain preserved intact and wired into the root workspaces.

---

## 3. Implementation Work Packages

- **WP-1: Monorepo Workspace Configuration:** Update root `package.json` workspaces to include `packages/*`, configure shared root `tsconfig.base.json`, and set up package-level tsconfig files with project references.
- **WP-2: `@erp/core` Implementation:**
  - `Result<T, E>` container for safe, exception-free error propagation.
  - Standard `AppError` hierarchy (`ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `BusinessRuleError`, `InfrastructureError`, `InternalError`).
  - `ExecutionContext` managing `tenantId`, `legalEntityId`, `userId`, and `correlationId` using Node.js `AsyncLocalStorage`.
  - `Logger` interface with level filtering, structured JSON formatting, request correlation, and automatic redaction of sensitive keys (`password`, `token`, `secret`, `authorization`, `creditCard`).
  - `Config` engine with Zod schema validation distinguishing required secrets, non-secret options, and environment defaults (`NODE_ENV`, `PORT`, `DATABASE_URL`).
  - `Money` value object with currency validation and fixed-point math.
  - `RuntimeLifecycle` managing graceful SIGTERM/SIGINT signal trapping, resource disposal, and health liveness/readiness indicators.
- **WP-3: `@erp/contracts` Implementation:**
  - Base DTO and CQRS command/query contract types.
  - `ErpDomainEvent` envelope conforming to CloudEvents v1.0 specification.
  - `ModuleManifest` and `CapabilityManifest` type contracts.
- **WP-4: Architectural Boundary Validation & Test Suite:**
  - Unit tests verifying Result container, error serialization, config validation, money math, context propagation, and logger redaction.
  - Automated architectural boundary check script scanning for prohibited imports (e.g. Core importing modules, circular references).
- **WP-5: CI/Build Integration:**
  - Package scripts: `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`.

---

## 4. Validation & Exit Criteria

1. All package builds and typechecks succeed with strict mode (`noImplicitAny: true`).
2. 100% of authored tests pass with real assertions (zero fake tests).
3. Boundary validator confirms zero circular dependencies and zero upward layer imports.
4. Existing legacy preview server (`artifacts/erp-preview/imported/server.js`) remains completely functional on port 3000.
5. All Phase 1 documentation reports completed.
