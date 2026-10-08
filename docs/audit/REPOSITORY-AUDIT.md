# Comprehensive Forensic Repository Audit

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Audit Date:** 2026-10-07  
**Auditor:** Senior Principal Architect & Repository Auditor  
**Repository Source:** Imported from `fukpdf/ERP`  
**Evaluation Standard:** Zero-Trust Forensic Verification (Evidence vs Claim)

---

## 1. Executive Summary & Verdict

This repository represents an incomplete export of an upstream project (`fukpdf/ERP`, identified across historical artifacts as "ERP-MERGED-AUDITED / SISOFT / Stages 18–70"). 

A rigorous, file-by-file forensic inspection reveals an extreme divergence between **documented claims** and **actual source code present in the filesystem**:

1. **Documented Claims:** Upstream documentation files describe a massive, production-hardened, multi-stage enterprise ERP with 193 PostgreSQL/Prisma models, 22–35 business modules (GL, Finance, Payroll, HR, Manufacturing, CRM, Healthcare HIS), PostgreSQL Row-Level Security (RLS) enforcement, hardware security module (HSM) key rotation, Vault integrations, SOC2/ISO27001 automation, and automated compliance pipelines.
2. **Actual Codebase Reality:**
   - **Zero** Prisma schema files exist in the entire tree (`find . -name "*.prisma"` returns 0 results).
   - **Zero** SQL migration scripts exist (`find . -name "*.sql"` returns 0 results).
   - **Zero** backend business module implementations (`apps/api`, `src/modules/*`) exist anywhere in the repository.
   - **40+ Jest spec files (`*.spec.ts`, `*.test.ts`)** are stranded in `artifacts/erp-preview/imported/`, all referencing non-existent paths such as `../../src/modules/rbac/services/permission.service` or `apps/api/src/prisma/prisma.service.ts`.
   - **50+ Security/Compliance Markdown files** in `artifacts/erp-preview/imported/` describe controls that have no backing code in this repository.
   - **The only functional ERP application** present in the repository is a standalone Node.js HTTP server (`artifacts/erp-preview/imported/server.js`) serving static HTML/CSS/JS (`artifacts/erp-preview/imported/public/`) backed by a local JSON file (`artifacts/erp-preview/imported/data/db.json`), covering 4 foundational features: Overview Dashboard, Products Catalog, Customers Directory, and Sales Orders.
   - **Surrounding scaffolding:** The repo has an incomplete monorepo structure containing `artifacts/api-server` (an Express scaffold with only `/healthz` and an empty Drizzle schema), `artifacts/mockup-sandbox` (an empty prototyping sandbox), and unused library packages (`lib/api-spec`, `lib/api-client-react`, `lib/api-zod`, `lib/db`).

**Forensic Verdict:** The repository is in an **early prototype runtime state** wrapped in **disconnected legacy documentation and orphaned test specs**. We must treat the working 4-feature Node.js/JSON ERP foundation as the sole runnable starting baseline, treat the orphaned specs and security docs as conceptual domain requirements for our target architecture, and design a clean, modular, universal ERP platform from this foundation.

---

## 2. Inventory by Directory & Artifact

### 2.1 Root Structure
| File / Directory | Claimed Purpose | Forensic Findings | Status |
| :--- | :--- | :--- | :--- |
| `package.json` | Workspace root configuration | Originally configured for pnpm with restrictive preinstall script; converted to standard npm workspaces in Phase 0. | Operational |
| `pnpm-workspace.yaml` | Workspace package manifest | Removed in migration per Node.js/npm standard. Workspaces defined in `package.json`. | Normalized |
| `bun.lock` | Bun lockfile | Orphaned artifact; deleted during Phase 0 triage. | Removed |
| `tsconfig.json` / `tsconfig.base.json` | Project references configuration | References `lib/db`, `lib/api-client-react`, `lib/api-zod`. Clean TypeScript configuration. | Operational |
| `metadata.json` | Application metadata for hosting | Initialized with Northstar ERP metadata. | Verified |
| `.env.example` | Environment variable specification | Configured with `PORT=3000`, `DATABASE_URL`, `NODE_ENV`, `BASE_PATH`. | Verified |
| `replit.md` | Workspace development notes | References pnpm commands, Postgres, and Orval; partially obsolete. | Documentation |

### 2.2 `artifacts/erp-preview/` (The Functional ERP Baseline)
| Subpath | Content | Forensic Audit Findings | Operational State |
| :--- | :--- | :--- | :--- |
| `imported/server.js` | Node.js HTTP Server (325 lines) | Self-contained zero-dependency native HTTP server. Serves static files and `/erp-api/*` REST endpoints (`bootstrap`, `summary`, `products`, `customers`, `orders`). Listens on port 3000. | **FULLY OPERATIONAL (Verified)** |
| `imported/public/index.html` | Client SPA Shell | Semantic HTML5 dashboard layout with sidebar navigation, breadcrumbs, modal dialog anchor, and toast container. | **FULLY OPERATIONAL (Verified)** |
| `imported/public/styles.css` | Client Stylesheet (340 lines) | Handcrafted responsive CSS design with custom variables, responsive grid, sidebar collapse, modal backdrops. | **FULLY OPERATIONAL (Verified)** |
| `imported/public/app.js` | Client SPA Application (205 lines) | Vanilla JS client managing state, async fetch to `/erp-api/bootstrap`, DOM rendering for Dashboard, Products, Customers, Orders, modals, and toasts. | **FULLY OPERATIONAL (Verified)** |
| `imported/data/db.json` | Local File Persistence | JSON store seeded with 5 products, 3 customers, 3 sales orders, auto-written with atomic temporary file swapping on mutations. | **FULLY OPERATIONAL (Verified)** |
| `imported/*.spec.ts` | 40+ Test Specifications | All import non-existent files (`../../src/modules/...`). Cannot run without missing source. | **ORPHANED / UNEXECUTABLE** |
| `imported/*.md` | 50+ Security/Audit/Stage Docs | Legacy documentation describing Stages 18–70, SISOFT integration, HSM, and RLS. | **CONCEPTUAL / DETACHED** |
| `src/` (`App.tsx`, etc.) | React / Vite Scaffolding | Contains placeholder "Replit Agent is building..." component. Not connected to the running server. | Incomplete Scaffold |
| `vite.config.ts` | Vite configuration | Configured for React + Tailwind; builds client bundle but not wired to `imported/server.js`. | Auxiliary Scaffold |

### 2.3 `artifacts/api-server/` (Boilerplate API Scaffolding)
| File | Forensic Audit Findings | Operational State |
| :--- | :--- | :--- |
| `src/app.ts` | Standard Express 5 app with Pino HTTP logger, CORS, JSON parsing, mounting `/api` router. | Syntactically valid |
| `src/routes/health.ts` | Single route `GET /api/healthz` validating `{ status: "ok" }` with Zod. | Syntactically valid |
| `src/index.ts` | Listens on port 5000. Not wired to the main applet port (3000). | Standalone |
| `package.json` | Depends on `@workspace/api-zod`, `@workspace/db`, Drizzle ORM, Express. | Normal dependencies |

### 2.4 `artifacts/mockup-sandbox/` (Prototyping Sandbox)
| File | Forensic Audit Findings | Operational State |
| :--- | :--- | :--- |
| `src/App.tsx` | Dynamically imports components from `./components/mockups/${path}.tsx`. | Sandbox only |
| `src/.generated/` | Empty module map. No mockups currently registered. | Unused |

### 2.5 `lib/` Packages
| Package | Forensic Audit Findings | Operational State |
| :--- | :--- | :--- |
| `lib/db` | Contains Drizzle ORM PostgreSQL connection helper. Schema in `src/schema/index.ts` is empty (`export {}`). No database tables are defined. | Mocked fallback |
| `lib/api-spec` | Contains OpenAPI 3.0 YAML defining solely `/healthz`. Orval codegen config for generating Zod/React query clients. | Minimal / Boilerplate |
| `lib/api-zod` | Generated Zod schema for `HealthCheckResponse`. | Minimal / Boilerplate |
| `lib/api-client-react` | Generated TanStack React Query hooks for `healthz`. | Minimal / Boilerplate |
| `scripts/` | Contains `hello.ts` demo script. | Scratch / Unused |

---

## 3. Forensic Discrepancy Matrix

The table below contrasts claims found in imported documentation against verified repository realities:

| Subsystem / Area | Claim in Imported Docs (`imported/*.md`) | Verified Reality in Codebase | Severity / Gap Classification |
| :--- | :--- | :--- | :--- |
| **ORM / Data Access** | "Stage 61 prisma/schema.prisma has exactly 193 models including Finance, HR, Payroll, Manufacturing..." (`MERGE-DECISIONS.md`) | **0 Prisma schemas exist.** No `.prisma` file anywhere in repo. `package.json` in `imported/` has `@prisma/client` dependency but no generated client or schema. | **CRITICAL DISCREPANCY:** Models are completely absent. |
| **Database Engine** | "Clean PostgreSQL runtime execution with RLS multi-tenant isolation" (`docs-STAGE52-CLEAN-DATABASE...md`) | **No PostgreSQL instance or schema.** `server.js` uses local `db.json`. `lib/db` has empty Drizzle schema with 0 tables. | **CRITICAL DISCREPANCY:** Local JSON file is only active persistence. |
| **Business Modules** | "22 core ERP business modules in apps/api/src/modules/ + 13 modules from Lineage A" (`MERGE-DECISIONS.md`) | `apps/api` **does not exist.** `src/modules` **does not exist.** Only 4 features in `server.js`: Dashboard, Products, Customers, Orders. | **CRITICAL DISCREPANCY:** Complete absence of backend modules. |
| **RBAC / Permissions** | "Granular hierarchical RBAC with permission cache, delegations, SoD separation of duties, and CEL rules" (`permission.service.spec.ts`) | RBAC exists **only as orphaned test specs** importing non-existent service classes. `server.js` has **no auth or permission checks**. | **CRITICAL DISCREPANCY:** Spec exists, implementation missing. |
| **Multi-Tenancy** | "RLS tenant isolation enforced via `SET LOCAL app.current_tenant_id` and test helper" (`test-db.helper.ts`) | `db.json` has **no tenantId fields**. `server.js` has no tenancy awareness. Helper references non-existent `apps/api/src/prisma/prisma.service.ts`. | **CRITICAL DISCREPANCY:** No tenant isolation implemented. |
| **Security Controls** | "Security headers, CSRF, encryption primitives, rate limiting implemented in code per M15" (`README.md`) | `server.js` sets only `X-Content-Type-Options: nosniff` and `Cache-Control: no-store`. No CSRF token handling, no rate limiting, no encryption. | **HIGH DISCREPANCY:** Documented security controls are absent from running code. |
| **Workflows / BPMN** | "BPMN validator, CEL evaluator, action steps, step executor" (`bpmn-validator.spec.ts`) | Orphaned spec files with zero implementation classes in the tree. | **HIGH DISCREPANCY:** Specifications with zero backing code. |
| **Notifications** | "Multi-channel notification delivery (email, in-app, webhook, digest, escalation)" (`delivery.spec.ts`) | Orphaned spec files only. No notification service or worker exists. | **HIGH DISCREPANCY:** Specification only. |

---

## 4. Code Quality & Architectural Risk Assessment

### 4.1 Identified Architectural Risks
1. **Ghost Code Assumption Risk:** A naive engineer or AI agent reading `MERGE-DECISIONS.md` or `docs-STAGE50...` would assume the ERP has 193 tables, GL accounting, and automated compliance. Writing code against these non-existent modules would cause catastrophic failures.
2. **Persistence Ephemerality Risk:** `artifacts/erp-preview/imported/server.js` writes state to `imported/data/db.json`. In containerized cloud environments (such as Google Cloud Run or AI Studio), the container disk is ephemeral. When the container restarts or scales to zero, user data in `db.json` will reset to the initial seed unless migrated to a persistent database.
3. **Absence of Authentication / Authorization:** All REST endpoints (`/erp-api/*`) are unauthenticated. Anyone with HTTP access can create, update, or delete products, customers, and orders.
4. **Monolithic Procedural Server Risk:** `server.js` combines routing, validation, business rules, JSON file I/O, error handling, and static file serving in a single 325-line procedural file.
5. **Orphaned Test Debt:** The 40+ test files cannot be run by any test runner because their module imports point to a phantom directory structure. Attempting to run `jest` or `npm test` on these files produces immediate module-not-found errors.

---

## 5. Summary of Assets Available for Phase 1+

Despite the gaps, the repository provides valuable starting assets:

1. **Working Domain Model (Seed Baseline):** A clean, coherent schema for Products, Customers, Sales Orders, and Summary Metrics with realistic business validations (SKU uniqueness, non-negative pricing, stock inventory deduction, email regex, order status state machine).
2. **Intuitive Enterprise UI Concept:** A clean, professional UI layout featuring an operations dashboard, inventory alerting, responsive data tables, modal dialogs, status badges, and toast notifications.
3. **Domain Specification Library:** The 40+ orphaned spec files (`permission.service.spec.ts`, `inventory.invariants.spec.ts`, `bpmn-validator.spec.ts`, `cel-evaluator.spec.ts`, `sod.service.spec.ts`, `surgical-count.spec.ts`) provide **exact, executable behavioral specifications** for how enterprise RBAC, multi-tenancy, workflow evaluation, and audit trails should function when built.
4. **Security & Threat Model Library:** The 50+ security markdown documents contain a complete STRIDE threat model, OWASP Top 10 control matrix, and incident response playbooks that can directly inform the enterprise security architecture.

---

## 6. Audit Conclusion

The repository is now fully triaged, stabilized, and running on port 3000 in AI Studio. Phase 0 will document the complete blueprint, constitution, capability model, and multi-phase roadmap required to systematically build the Universal ERP Platform without monolithic sprawl.
