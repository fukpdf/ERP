# ERP Roadmap

## Mission
Build ERP as a standalone, enterprise-grade, multi-tenant ERP platform with strong security, auditable operations, controlled extensibility, and a roadmap that can scale independently of all other projects.

## Non-negotiable architecture principles
- ERP is a separate product/repository.
- No dependency on ilovepdf.cyou or PDF-tool application code.
- No dependency on Laba AI as a core ERP component.
- Tenant isolation is a security boundary, not merely a UI concept.
- Authentication, authorization, tenancy, audit, and data placement are separate concerns.
- Business modules remain domain-oriented and independently testable.
- Shared platform capabilities may be centralized inside ERP only when their contracts are stable and their failure boundaries are explicit.
- Provider-specific infrastructure stays behind adapters.
- Runtime evidence must be real and retained.
- Security/compliance documentation cannot substitute for implementation or runtime verification.

## Phase 0 — Repository reconstruction and truth baseline
1. Reconcile current Git tree against historical merge manifests.
2. Identify missing application/package/infra/database trees.
3. Identify the authoritative source lineage for the canonical ERP.
4. Reconcile the 193-model historical Prisma claim with the actual current repository.
5. Establish dependency manifests and lockfile strategy.
6. Establish build/test/runtime commands from actual source.
7. Create a machine-checkable status matrix.
8. Do not start feature implementation until the baseline is internally consistent.

**Exit gate:** actual tree, architecture map, dependency map, database model source, test map, and known blockers documented.

## Phase 1 — Platform foundation
- Monorepo/workspace structure.
- Configuration and environment contracts.
- PostgreSQL/Prisma foundation.
- Tenant model and tenant context.
- Global identity boundary.
- Authentication/session foundation.
- RBAC/permissions.
- RLS and tenant isolation.
- Audit/event/outbox foundation.
- Observability and correlation IDs.

**Exit gate:** static checks + isolated unit tests + disposable database runtime gate where infrastructure is available.

## Phase 2 — Core ERP domain foundation
Implement/reconcile domain contracts for:
- Organization/company
- Master data
- Accounting/GL
- Finance
- Purchasing
- Sales
- Inventory
- HR
- Payroll
- CRM
- Projects
- Manufacturing
- Reporting/analytics

Each domain must have explicit ownership, data boundaries, permission boundaries, audit behavior, and integration contracts.

## Phase 3 — Workflow and automation
- Workflow definitions and versioning.
- Approval chains.
- Conditions/rules.
- Task execution.
- Notifications.
- Scheduled jobs.
- Webhooks/events.
- Idempotency and retry controls.
- Human approval and escalation boundaries.

## Phase 4 — Control plane and multi-ERP management
- Global identity federation.
- Control-plane authorization.
- Tenant lifecycle.
- Provisioning/deprovisioning.
- Placement and region context.
- Version compatibility.
- Deployment/canary controls.
- Backup/recovery orchestration.
- Break-glass access.
- Cross-plane separation of duties.

## Phase 5 — Clinical/HIS boundary (only if retained)
The historical repository contains HIS patient/clinical components. These must remain explicitly separated from generic ERP domains and must undergo their own schema, privacy, authorization, and runtime reconciliation before being treated as production-ready.

## Phase 6 — Security/compliance hardening
- OWASP controls.
- CSRF/XSS/SQLi/SSRF/XXE protections.
- Secrets/key lifecycle.
- Rate limiting and bot controls.
- WAF/DDoS architecture.
- Vulnerability management.
- SBOM/SLSA/supply-chain controls.
- SOC 2 / ISO 27001 control mapping.
- HIPAA controls where applicable.
- Pen-test and independent verification.

## Phase 7 — Production readiness
- Real PostgreSQL/Redis/runtime environment.
- Backup and restore rehearsal.
- Load/performance testing.
- Failure/chaos testing.
- Observability verification.
- Deployment rollback.
- Security gates.
- Disaster recovery evidence.
- Release checklist.

## Phase 8 — Scale and ecosystem
After correctness and runtime verification:
- Horizontal scaling.
- Queue/worker architecture.
- Caching.
- Read scaling.
- Partitioning/sharding where justified.
- Multi-region placement.
- Provider adapters.
- API/versioning strategy.
- Admin/control plane.
- Billing/subscription boundaries.
- External integrations.
- Mobile/system application contracts.

## Unit execution protocol
Every unit follows:

**AUDIT → PLAN → IMPLEMENT → STATIC VALIDATE → TEST → RUNTIME VALIDATE (when infrastructure exists) → RE-AUDIT → FIX → RE-VALIDATE → RECORD EVIDENCE**

No unit is considered complete merely because files were created or a test file exists.

## Definition of Done
A feature/unit is complete only when:
- source is present in the correct ERP boundary;
- imports/dependencies resolve;
- authorization and tenant isolation are addressed;
- security implications are reviewed;
- tests cover important success/failure paths;
- static validation passes;
- runtime validation passes when the required environment exists;
- blockers are explicitly recorded instead of hidden;
- documentation matches actual code;
- no unrelated project was changed.
