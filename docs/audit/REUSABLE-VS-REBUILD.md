# Reusable vs. Rebuild Asset Classification Matrix

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Audit Standard:** Zero-Trust Forensic Verification  
**Principle:** Never delete anything merely because it is classified as rebuild. Classify with precise justification to guide subsequent development phases.

---

## 1. Classification Categories

| Code | Category | Definition |
| :--- | :--- | :--- |
| **A** | **KEEP AS-IS** | Code/config is fully functional, verified, standards-compliant, and directly serves the target platform without alteration. |
| **B** | **KEEP WITH REFACTOR** | Functional logic, styling, or structures that are fundamentally sound but require modularization, typing, or migration to modern platform standards. |
| **C** | **REUSE CONCEPT ONLY** | Specifications, documentation, architectural diagrams, or orphaned tests whose behavioral definitions and schemas are valuable blueprints for clean-room implementation. |
| **D** | **REBUILD** | Subsystems whose current implementation is incomplete, scaffolding-only, non-functional, or fundamentally architected as a throwaway prototype. |
| **E** | **DEPRECATE** | Packaging artifacts, vendor-locked scripts, or obsolete tooling that are superseded by standard monorepo tooling. |
| **F** | **UNKNOWN — NEEDS FUTURE VALIDATION** | Files whose lineage, origin, or exact business requirements require future validation or stakeholder clarification. |

---

## 2. Forensic Asset Classification Matrix

### 2.1 Runtime & Server Components
| Asset | Category | Forensic Justification & Strategy |
| :--- | :---: | :--- |
| `artifacts/erp-preview/imported/server.js` | **B** | **KEEP WITH REFACTOR.** The HTTP request routing, REST handlers, and atomic file persistence serve as the working Phase 0 demo. In Phase 4/5, its endpoints (`/erp-api/*`) will be decomposed into typed domain controllers and service modules with real database transactions. |
| `artifacts/api-server/src/app.ts` | **B** | **KEEP WITH REFACTOR.** Standard Express 5 boilerplate with Pino logging and CORS. Serves as a solid skeleton for the unified modular API gateway when integrated into the monorepo architecture. |
| `artifacts/api-server/src/routes/health.ts` | **A** | **KEEP AS-IS.** Standard `/api/healthz` endpoint returning `{ status: "ok" }`. Correctly typed with Zod schema. |
| `artifacts/mockup-sandbox/src/App.tsx` | **E** | **DEPRECATE.** Canvas mockup sandbox loader. Retain in workspace per non-deletion rules, but exclude from production build paths. |

### 2.2 Client & UI Components
| Asset | Category | Forensic Justification & Strategy |
| :--- | :---: | :--- |
| `artifacts/erp-preview/imported/public/index.html` | **B** | **KEEP WITH REFACTOR.** Semantic HTML5 shell with sidebar, breadcrumbs, modal, and toast regions. Provides the exact layout blueprint to be ported into our React/Tailwind design system in Phase 7. |
| `artifacts/erp-preview/imported/public/styles.css` | **C** | **REUSE CONCEPT ONLY.** The styling rules, color palette (`--navy`, `--ink`, `--blue`, `--green`), typography scale, and responsive grid breakpoints provide the design tokens for our enterprise Tailwind design system. |
| `artifacts/erp-preview/imported/public/app.js` | **C** | **REUSE CONCEPT ONLY.** The client state management, date/currency formatting, DOM generation, modal lifecycle, and form serialization provide clear business workflow specifications for the React UI modules. |
| `artifacts/erp-preview/src/App.tsx` | **D** | **REBUILD.** Placeholder "Replit Agent is building..." component. In Phase 7, this will be replaced with the modular enterprise application shell. |
| `artifacts/erp-preview/src/components/ui/*` | **B** | **KEEP WITH REFACTOR.** Comprehensive collection of shadcn/ui components (Radix primitives). Need theme token integration and enterprise density styling. |

### 2.3 Data Layer & Persistence
| Asset | Category | Forensic Justification & Strategy |
| :--- | :---: | :--- |
| `artifacts/erp-preview/imported/data/db.json` | **C** | **REUSE CONCEPT ONLY.** The JSON seed structure (products with SKU, stock, reorder level; customers with contact info; orders with line items and status state machine) defines our initial database seed data for Phase 4. |
| `lib/db/src/index.ts` | **B** | **KEEP WITH REFACTOR.** Contains Drizzle ORM PostgreSQL connection initialization with zero-crash mock fallback. Needs schema definitions and transaction helpers. |
| `lib/db/src/schema/index.ts` | **D** | **REBUILD.** Currently empty (`export {}`). Must be populated in Phase 4 with the canonical relational database schema. |

### 2.4 Orphaned Specifications & Test Suites (`imported/*.spec.ts`)
| Spec File Group | Category | Target Architectural Destination |
| :--- | :---: | :--- |
| `permission.service.spec.ts`, `role.service.spec.ts`, `permission-cache.spec.ts`, `delegation.service.spec.ts`, `field-permission.spec.ts` | **C** | **REUSE CONCEPT ONLY.** Contains exact behavior specifications for our enterprise RBAC engine in Phase 3 (hierarchical roles, permission caching, time-bounded delegation, field-level access control). |
| `sod.service.spec.ts`, `cross-plane-sod.spec.ts` | **C** | **REUSE CONCEPT ONLY.** Specifies Separation of Duties (SoD) business rules (e.g., preventing the creator of a purchase order from approving it). |
| `bpmn-validator.spec.ts`, `cel-evaluator.spec.ts`, `step-executor.spec.ts`, `condition.step.spec.ts`, `approval.step.spec.ts` | **C** | **REUSE CONCEPT ONLY.** Specifies our future workflow engine (Google Common Expression Language evaluation, BPMN node validation, multi-stage approval steps). |
| `delivery.spec.ts`, `digest.spec.ts`, `escalation.spec.ts`, `email.action.spec.ts`, `webhook.action.spec.ts`, `in-app.channel.spec.ts` | **C** | **REUSE CONCEPT ONLY.** Specifies notification routing, digest batches, escalation timers, and multi-channel delivery for Phase 5. |
| `inventory.invariants.spec.ts`, `surgical-count.spec.ts` | **C** | **REUSE CONCEPT ONLY.** Specifies strict inventory invariants (non-negative stock, lot tracking, cycle counts, surgical supply tracking). |
| `rls.spec.ts`, `rls.test.ts`, `control-erp-isolation.spec.ts`, `atomic-rbac-mutation.spec.ts` | **C** | **REUSE CONCEPT ONLY.** Specifies PostgreSQL Row-Level Security multi-tenant isolation assertions for Phase 4. |
| `audit.test.ts`, `optimisticLock.test.ts`, `softDelete.test.ts` | **C** | **REUSE CONCEPT ONLY.** Specifies audit log immutability, version incrementing for optimistic concurrency control, and soft deletion query filtering. |

### 2.5 Security & Compliance Documentation (`imported/*.md`)
| Document Group | Category | Utilization in Universal ERP Architecture |
| :--- | :---: | :--- |
| `THREAT_MODEL.md`, `OWASP_TOP_10.md`, `VULNERABILITY_MANAGEMENT.md` | **C** | **REUSE CONCEPT ONLY.** STRIDE model and OWASP control matrix will serve as the architectural foundation for `docs/architecture/SECURITY-ARCHITECTURE.md`. |
| `AUTHENTICATION.md`, `AUTHORIZATION.md`, `SESSION_MANAGEMENT.md`, `ZERO_TRUST.md` | **C** | **REUSE CONCEPT ONLY.** Authentication session lifecycle, token refresh, and zero-trust service-to-service validation rules for Phase 3. |
| `DATA_ENCRYPTION.md`, `DATA_MASKING.md`, `CRYPTOGRAPHY.md`, `KEY_ROTATION.md`, `HSM.md` | **C** | **REUSE CONCEPT ONLY.** Field-level encryption specs, PII masking rules (tax IDs, IBANs, phone numbers), and envelope encryption architecture for Phase 6. |
| `SOC2_CONTROLS.md`, `ISO27001_CONTROLS.md`, `HIPAA_CONTROLS.md` | **C** | **REUSE CONCEPT ONLY.** Compliance control mappings for audit logging, access review intervals, and change management in Phase 6/18. |
| `docs-STAGE50...` through `docs-STAGE70...` | **F** | **UNKNOWN — NEEDS FUTURE VALIDATION.** Historical release notes and exception logs from upstream packaging pipeline. Kept for historical reference. |

---

## 3. Preservation & Non-Destruction Commitment

In strict accordance with Phase 0 rules:
1. **Zero files have been or will be deleted** simply because they are marked Rebuild or Concept-Only.
2. The working prototype in `artifacts/erp-preview/imported/server.js` remains intact and fully functional as the live preview.
3. Every specification, threat model, and test assertion is preserved as an intellectual asset and functional benchmark for the subsequent implementation phases.
