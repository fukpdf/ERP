# Architectural Decision Register (ADR)

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Format:** Michael Nygard Architecture Decision Record Standard  
**Integrity Rule:** Record all important decisions and unresolved questions. Never conceal uncertainty.

---

## Decision Index

- [ADR-001: 4-Tier Hierarchical Architecture over Monolith or Microservices-First](#adr-001)
- [ADR-002: PostgreSQL 16+ as Canonical Relational Engine](#adr-002)
- [ADR-003: Drizzle ORM over Prisma or Raw SQL](#adr-003)
- [ADR-004: Transactional Outbox Pattern for Inter-Module Domain Events](#adr-004)
- [ADR-005: Preservation of Imported Specs and Artifacts (Zero Deletion)](#adr-005)
- [ADR-006: Radix UI Headless Primitives + Tailwind CSS Design Tokens](#adr-006)
- [ADR-007: Strict Interface Contracts for Synchronous Intra-Process Calls](#adr-007)
- [ADR-008: Hybrid Multi-Tenant Isolation Strategy (Row-Level Security Baseline)](#adr-008)
- [ADR-009: Strict Immutability for Ledger Tables (Zero Soft/Hard Deletion)](#adr-009)
- [ADR-010: AI Provider Agnostic Facade (Zero Vendor Lock-In)](#adr-010)
- [ADR-011: CSS Logical Properties & RTL Equality as Architectural Invariant](#adr-011)
- [ADR-012: OPEN UNRESOLVED — Distributed Event Broker Selection for Enterprise Profiles](#adr-012)
- [ADR-013: OPEN UNRESOLVED — Distributed Database Engine for Sovereign Tier Profile E](#adr-013)

---

### ADR-001: 4-Tier Hierarchical Architecture over Monolith or Microservices-First {#adr-001}
- **Status:** ACCEPTED
- **Decision:** Structure the entire platform into 4 strict hierarchical tiers: Core -> Platform Services -> Modules -> Capabilities.
- **Reason:** Microservices introduce excessive operational complexity, network latency, and distributed transaction challenges for small and mid-market deployments. Conversely, a standard monolithic structure inevitably devolves into tangled, circular dependencies as thousands of capabilities are added. A modular 4-tier architecture provides strict modularity in-process while allowing selective distribution when scale demands it.
- **Alternatives Considered:** 
  1. Microservices-first: Rejected due to prohibitive operational overhead and latency for small businesses.
  2. Traditional single-package monolith: Rejected due to inability to support 10,000+ capabilities without architectural decay.
- **Impact:** Mandatory enforcement of downward-only imports via automated AST linters.

---

### ADR-002: PostgreSQL 16+ as Canonical Relational Engine {#adr-002}
- **Status:** ACCEPTED
- **Decision:** Standardize on PostgreSQL 16+ as the universal enterprise relational database.
- **Reason:** PostgreSQL provides world-class ACID compliance, native Row-Level Security (RLS) for tenant isolation, rich JSONB support for semi-structured extensions, declarative table partitioning, and broad cloud availability across AWS, GCP, Azure, and on-premises environments.
- **Alternatives Considered:**
  1. MySQL 8: Rejected due to weaker RLS primitives, less robust table partitioning, and inferior JSONB indexing.
  2. MongoDB / Document Stores: Rejected due to the mathematical requirement for strict multi-table ACID transactions in double-entry bookkeeping.
- **Impact:** All migrations and relational schemas will be engineered specifically for PostgreSQL dialect and features.

---

### ADR-003: Drizzle ORM over Prisma or Raw SQL {#adr-003}
- **Status:** ACCEPTED
- **Decision:** Adopt Drizzle ORM for database access, schema definition, and query building.
- **Reason:** Drizzle is a lightweight, zero-overhead, TypeScript-first SQL query builder that maps directly to PostgreSQL semantics without the heavy binary engine overhead, memory footprint, or cold-start latency of Prisma. Unlike raw SQL strings, Drizzle provides compile-time type safety and automated migration generation.
- **Alternatives Considered:**
  1. Prisma: Legacy specs referenced Prisma, but Prisma relies on a C++ query engine binary that increases container cold-start and memory footprint, conflicting with Profile A efficiency goals.
  2. TypeORM / Knex: Rejected due to outdated design and inferior TypeScript inference compared to modern schema-first builders.
- **Impact:** Schema models defined in `packages/core/database` using Drizzle schema syntax.

---

### ADR-004: Transactional Outbox Pattern for Inter-Module Domain Events {#adr-004}
- **Status:** ACCEPTED
- **Decision:** Implement the Transactional Outbox Pattern for all asynchronous cross-domain events.
- **Reason:** Eliminates the dual-write failure mode where database state changes commit but message broker publication fails. Guarantees that no business event is lost even during broker crashes or network partitions.
- **Alternatives Considered:** Direct publish to message broker inside application service: Rejected due to risk of state inconsistency upon broker network drops.
- **Impact:** Requires an `outbox_events` table in PostgreSQL and a dedicated background outbox publisher worker.

---

### ADR-005: Preservation of Imported Specs and Artifacts (Zero Deletion) {#adr-005}
- **Status:** ACCEPTED
- **Decision:** Retain all 40+ orphaned test specs and 50+ security markdown files in `artifacts/erp-preview/imported/`.
- **Reason:** Even though the implementation code was missing from the import, the test files contain exact, executable behavioral specifications for enterprise RBAC, Separation of Duties (SoD), BPMN workflows, and inventory invariants. They serve as essential requirements documentation.
- **Alternatives Considered:** Deleting orphaned files to clean the tree: Rejected per Phase 0 non-destruction rule and loss of intellectual requirements.
- **Impact:** All future implementations will be verified against the behavioral rules established in these specs.

---

### ADR-006: Radix UI Headless Primitives + Tailwind CSS Design Tokens {#adr-006}
- **Status:** ACCEPTED
- **Decision:** Standardize the frontend component library on Radix UI headless accessibility primitives styled with Tailwind CSS design tokens.
- **Reason:** Radix UI guarantees 100% WCAG 2.1 AA keyboard accessibility, focus trapping, and ARIA attributes out of the box while leaving complete visual styling control to our enterprise design token system. Avoids visual lock-in from pre-styled heavy component frameworks.
- **Alternatives Considered:** Material UI (MUI), Ant Design: Rejected due to heavy CSS-in-JS runtime overhead and opinionated styling that conflicts with dense enterprise workspaces.
- **Impact:** Fast, accessible, themeable UI components with zero bundle bloat.

---

### ADR-007: Strict Interface Contracts for Synchronous Intra-Process Calls {#adr-007}
- **Status:** ACCEPTED
- **Decision:** Mandate that all direct intra-process calls between modules must execute through typed interfaces published in `src/contract/index.ts`.
- **Reason:** Prevents tight coupling. A module can be refactored, upgraded, or extracted into an independent microservice in the future without breaking callers, as long as the public interface contract is maintained.
- **Alternatives Considered:** Direct class method calls across modules: Rejected as the primary cause of architectural monolithic sprawl.
- **Impact:** Every module must publish an explicit interface and an in-memory mock implementation for unit testing.

---

### ADR-008: Hybrid Multi-Tenant Isolation Strategy (Row-Level Security Baseline) {#adr-008}
- **Status:** ACCEPTED
- **Decision:** Adopt PostgreSQL Row-Level Security (RLS) on a shared database as the standard baseline for Profiles A, B, and C, with architectural support for dedicated schemas and isolated databases for Profiles D and E.
- **Reason:** Shared database with RLS provides maximum resource density and lowest infrastructure cost for small-to-mid businesses, while guaranteeing database-enforced isolation. Providing schema-per-tenant and database-per-tenant paths satisfies strict enterprise and sovereign compliance requirements.
- **Alternatives Considered:** Database-per-tenant only: Cost-prohibitive for small businesses; unmanageable for thousands of micro-tenants.
- **Impact:** All tenant-scoped database queries must set transaction-scoped `app.current_tenant_id` context.

---

### ADR-009: Strict Immutability for Ledger Tables (Zero Soft/Hard Deletion) {#adr-009}
- **Status:** ACCEPTED
- **Decision:** Permanently prohibit `UPDATE`, `DELETE`, and soft deletion (`deleted_at`) on financial and inventory ledger tables (`gl_entries`, `stock_ledger_entries`).
- **Reason:** International accounting standards (IFRS, GAAP) and statutory tax authorities strictly forbid deleting or altering posted financial records. All corrections must be posted as reversing transactions.
- **Alternatives Considered:** Allowing soft deletion on ledger records: Rejected as a severe violation of auditability and accounting compliance.
- **Impact:** Revoked delete privileges at the PostgreSQL role level; enforced by immutable database triggers.

---

### ADR-010: AI Provider Agnostic Facade (Zero Vendor Lock-In) {#adr-010}
- **Status:** ACCEPTED
- **Decision:** Implement a pluggable `@erp/platform-ai-facade` that abstracts all generative and analytical AI capabilities behind universal interfaces.
- **Reason:** Enterprise clients have strict data residency and sovereign compliance policies regarding AI providers. The platform must allow swapping between Google Gemini, OpenAI, Anthropic, or local open-weight LLMs (via Ollama / vLLM) via configuration without modifying application business code.
- **Alternatives Considered:** Hardcoding vendor-specific SDKs: Rejected per Product Constitution Section 5.
- **Impact:** All smart assistants, OCR parsers, and anomaly detectors interact exclusively with `@erp/platform-ai-facade`.

---

### ADR-011: CSS Logical Properties & RTL Equality as Architectural Invariant {#adr-011}
- **Status:** ACCEPTED
- **Decision:** Enforce the use of CSS Logical Properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`) across all UI stylesheets and components.
- **Reason:** Guarantees that the UI mirrors seamlessly and automatically in Right-to-Left (RTL) languages (Arabic, Hebrew, Persian, Urdu) without maintaining duplicate stylesheets or error-prone conditional classes.
- **Alternatives Considered:** Separate `.rtl.css` stylesheets or manual `rtl:` utility prefixes on every element: Rejected due to maintenance overhead and regression risk.
- **Impact:** Automated CSS linting rules flag and reject physical directional properties (`margin-left`, `padding-right`, `left`, `right`).

---

### ADR-012: OPEN UNRESOLVED — Distributed Event Broker Selection for Enterprise Profiles {#adr-012}
- **Status:** OPEN / UNRESOLVED
- **Context:** Profiles A and B use the in-memory / Redis event bus with transactional outbox. For Profiles C, D, and E (large enterprise with millions of daily events), an external streaming broker is required.
- **Options Under Consideration:**
  1. *Apache Kafka:* Industry standard for high-throughput event streaming, but heavy JVM operational overhead.
  2. *RabbitMQ / AMQP:* Mature message queue with fine-grained routing exchanges, lighter operational footprint than Kafka.
  3. *Cloud Native Pub/Sub (Google Cloud Pub/Sub, AWS SNS/SQS):* Fully managed, zero maintenance, but introduces cloud provider divergence.
- **Resolution Plan:** Formal benchmark and operational trade-off evaluation scheduled for Phase 5. In Phase 0–4, the `@erp/platform-events` interface abstraction will insulate all application code from the eventual broker selection.

---

### ADR-013: OPEN UNRESOLVED — Distributed Database Engine for Sovereign Tier Profile E {#adr-013}
- **Status:** OPEN / UNRESOLVED
- **Context:** Profile E (Global Conglomerates / Sovereign Tier) requires multi-region active-active database clustering with jurisdictional data residency guarantees.
- **Options Under Consideration:**
  1. *CockroachDB:* Distributed SQL with PostgreSQL wire compatibility and automated multi-region geo-partitioning.
  2. *Google Cloud Spanner (PostgreSQL interface):* Virtually unlimited scalability and external consistency, but proprietary cloud engine.
  3. *PostgreSQL Multi-Region Aurora / Citus sharding:* Native PostgreSQL core with sharding extensions.
- **Resolution Plan:** Architecture review board evaluation scheduled for Phase 17. The Drizzle ORM and repository abstraction ensures application queries remain portable across standard PostgreSQL and distributed SQL engines.

---

### ADR-014: Monorepo Foundation & Workspace Package Topology (@erp/core and @erp/contracts) {#adr-014}
- **Status:** ACCEPTED
- **Decision:** Establish `packages/core` and `packages/contracts` as the foundational npm workspace packages for Tier 1 and shared boundary definitions.
- **Reason:** Enforces downward-only dependency rules and strict interface encapsulation. Avoids creating hundreds of empty placeholder packages while providing immediate compilation and testing scaffolding for future phases.
- **Alternatives Considered:** Single monolithic package or dozens of micro-packages upfront: Rejected to avoid premature complexity while preventing monolithic coupling.
- **Impact:** Project references wired in root `tsconfig.json` and workspaces in root `package.json`.

---

### ADR-015: Result Functional Container and Standardized AppError Hierarchy {#adr-015}
- **Status:** ACCEPTED
- **Decision:** Adopt `Result<T, E>` for functional error returns across business domain logic and standard `AppError` subclasses with `toSafeResponse()` for machine-readable external payloads.
- **Reason:** Prevents unhandled exceptions from crashing worker processes, guarantees predictable typed error handling, maps directly to HTTP status codes, and ensures zero leakage of stack traces or sensitive credentials in production.
- **Alternatives Considered:** Throwing untyped JavaScript `Error` objects: Rejected due to unpredictability and security risk of leaking internal details.
- **Impact:** All future domain services and controllers will return `Result<T, AppError>` or throw verified `AppError` subclasses.

---

### ADR-016: Zero-Dependency Schema Validation for Core Configuration {#adr-016}
- **Status:** ACCEPTED
- **Decision:** Implement typed configuration validation in `@erp/core/config` using native TypeScript validation rather than heavy external libraries for core initialization.
- **Reason:** Eliminates third-party supply chain vulnerabilities at the lowest platform tier, guarantees zero container cold-start delay, and keeps `@erp/core` ultra-lightweight.
- **Alternatives Considered:** Bundling external schema libraries into core: Deferred to application layers where dynamic user inputs justify the dependency footprint.
- **Impact:** `@erp/core` remains self-contained with minimal external dependencies.

---

### ADR-017: TypeScript Compiler API for Architectural Boundary & Cycle Validation {#adr-017}
- **Status:** ACCEPTED
- **Decision:** Implement the architectural boundary and dependency validator (`scripts/check-boundaries.mjs`) using the TypeScript Compiler API (`ts.createSourceFile`) rather than heuristic regular expressions or third-party AST tools.
- **Reason:** Guarantees 100% accurate parsing of static imports, re-exports, dynamic imports, and CommonJS require statements without introducing new toolchain dependencies. Integrates a formal directed graph with DFS 3-color cycle detection and deep-import rejection.
- **Alternatives Considered:** Line-by-line regex parsing (rejected as inadequate and prone to false negatives); `dependency-cruiser` (rejected to avoid installing dozens of transitive npm dependencies when TypeScript is already installed).
- **Impact:** Automated CI gate executes via `node scripts/check-boundaries.mjs` in sub-second time.

---

### ADR-018: Adoption of Oxlint for Strict Static Analysis & Zero-Overhead Linting {#adr-018}
- **Status:** ACCEPTED
- **Decision:** Adopt `oxlint` with `--deny-warnings` as the canonical linter for Phase 1 TypeScript and JavaScript codebases.
- **Reason:** Replaced no-op `echo` placeholder with a genuine, production-grade linter. `oxlint` runs in <15ms across all workspace packages with zero transitive dependencies, enforcing strict correctness and unused variable rules with non-zero exit codes on violations.
- **Alternatives Considered:** Heavy ESLint setup with complex plugin dependency graph: Deferred for later UI phases; `oxlint` provides immediate, reliable verification without package bloat.
- **Impact:** `npm run lint` strictly enforces code quality across all packages.

---

### ADR-019: Runtime Lifecycle State Machine with Multi-Phase Drain and Graceful Termination {#adr-019}
- **Status:** ACCEPTED
- **Decision:** Implement an explicit state machine (`INITIALIZING` → `READY` → `DRAINING` → `TERMINATING` → `TERMINATED`, with failure transition to `FAILED`) in `@erp/core/runtime/lifecycle.ts`.
- **Reason:** Guarantees deterministic, graceful process termination on `SIGTERM`/`SIGINT`. Ingress is stopped before draining active workloads; registered shutdown handlers execute in reverse order of registration (LIFO); unhandled timeouts or repeated signals are handled idempotently.
- **Alternatives Considered:** Relying on default Node.js process termination or unmanaged `process.exit()`: Rejected due to risk of in-flight transaction corruption and unclosed sockets.
- **Impact:** All platform services and server entrypoints hook into `RuntimeLifecycle`.

---

### ADR-020: Topological Dependency Resolution and Cycle Detection in Lightweight ServiceContainer {#adr-020}
- **Status:** ACCEPTED
- **Decision:** Provide a lightweight `ServiceContainer` in `@erp/core/runtime/container.ts` with explicit registration, declared dependencies, and topological sort initialization.
- **Reason:** Eliminates hidden global mutable service state, prevents service locator abuse, and guarantees deterministic startup and reverse shutdown order. Detects circular dependencies (`CircularDependencyError`) and missing dependencies (`MissingDependencyError`) prior to initialization.
- **Alternatives Considered:** Adopting a heavyweight DI framework (e.g. Inversify, NestJS container): Rejected to avoid reflection/decorator bloat and maintain a minimal, ultra-fast runtime core.
- **Impact:** Modular platform services declare dependencies explicitly without magic.

---

### ADR-021: Non-Secret vs Secret Configuration Partitioning with Zero-Leakage Error Handling {#adr-021}
- **Status:** ACCEPTED
- **Decision:** Partition application configuration into non-secret runtime parameters and sensitive secrets (`secrets` object), accompanied by a `toSafeConfig()` method.
- **Reason:** Enforces zero secret leakage across logs, error responses, telemetry, and health probes. Validates connection URLs and required environment parameters, throwing sanitized `ConfigValidationError` that identifies the problematic key without exposing the secret or user credentials.
- **Alternatives Considered:** Flat configuration objects: Rejected due to accidental serialization risks in logs or health endpoints.
- **Impact:** Application configuration is strictly typed and safe by design.

---

### ADR-022: Multi-Probe Health Architecture (/health/live, /health/ready, /health/startup) {#adr-022}
- **Status:** ACCEPTED
- **Decision:** Implement standardized HTTP health endpoints: `/health/live` (process vitality), `/health/ready` (operational capacity with component check registry), and `/health/startup` (bootstrap state).
- **Reason:** Complies with modern enterprise orchestration standards (Kubernetes, GCP Cloud Run, AWS ECS). Decouples basic process liveness from external dependency readiness to prevent cascading pod restart storms during transient database blips.
- **Alternatives Considered:** Single `/health` endpoint: Rejected because restart probes would prematurely kill healthy application pods during temporary downstream dependency latency.
- **Impact:** Orchestration platforms consume standardized 200/503 health signals.
