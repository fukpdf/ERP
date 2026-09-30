# ERP Master Implementation & Verification Document

## 1. Project boundary
This document governs **only** `fukpdf/ERP`.

ERP must remain independently trackable, independently deployable, and independently verifiable. Work in another repository must not be represented as ERP implementation.

## 2. Current truth
At the start of this ERP track, GitHub exposes 120 tree entries on `main`. The historical merge manifest claims 2,171 files and a much larger application tree. This mismatch is a first-class reconstruction issue.

The first implementation task is therefore not to assume the historical tree exists. It is to reconcile:
- source tree;
- package/workspace manifests;
- Prisma schema;
- migrations;
- apps;
- packages;
- infrastructure;
- tests;
- scripts;
- CI/CD;
- security controls;
- historical stage evidence.

## 3. Evidence classification
Use exactly these states:
- **IMPLEMENTED** — code exists.
- **STATIC-VERIFIED** — automated/static verification actually ran and passed.
- **RUNTIME-VERIFIED** — required real runtime environment was exercised and evidence retained.
- **DOCUMENTED-ONLY** — described but not implemented.
- **BLOCKED** — implementation may exist but required verification environment is unavailable.
- **MISSING** — expected artifact is absent and cannot be inferred safely.

## 4. Security baseline
The historical ERP material already identifies authentication, authorization, sessions, RLS, CSRF, XSS, SQL injection, SSRF, XXE, rate limiting, encryption, secrets, key rotation, audit, WAF/DDoS, supply chain, and compliance as important controls.

These will be reconciled against actual code. A document stating a control exists is never sufficient to mark that control IMPLEMENTED.

## 5. Database baseline
The historical merge records 193 Prisma models. This number must be independently confirmed from the current authoritative schema before it becomes an implementation invariant.

The missing Stage 52 archive and absent historical lockfile are explicit evidence gaps and must not be silently reconstructed as if source evidence existed.

## 6. Architecture target
ERP should use clear boundaries:
- Identity
- Tenancy
- Authorization/RBAC
- Audit/eventing
- Workflow
- Finance
- HR/Payroll
- Procurement
- Sales/CRM
- Inventory
- Manufacturing
- Projects
- Reporting/Analytics
- Control Plane
- Infrastructure adapters
- Optional HIS/clinical boundary

Each domain must expose contracts rather than reaching arbitrarily into another domain's internals.

## 7. Verification model
For each implementation unit record:
- baseline commit;
- files inspected;
- assumptions;
- files changed;
- tests executed;
- static results;
- runtime results;
- remaining blockers;
- final commit;
- re-audit result.

## 8. Change isolation
Default development happens on `erp-development` or a dedicated ERP feature branch. Main is not modified directly for exploratory work.

No ERP commit may include:
- ilovepdf.cyou files;
- PDF-tool source;
- Laba AI source;
- unrelated application configuration;
- unrelated database migrations.

## 9. First implementation sequence
The first actual implementation phase after this planning baseline is:

**ERP Phase 0 / Unit 1 — Canonical tree reconstruction and machine-readable baseline.**

It will produce:
1. a verified repository inventory;
2. an architecture inventory;
3. a dependency/runtime inventory;
4. a database/schema inventory;
5. a verification-status matrix;
6. a blocker register;
7. a canonical-source decision.

Only after Unit 1 is validated should domain implementation begin.

## 10. Release discipline
No "complete", "production-ready", or "runtime verified" wording may be used unless the corresponding evidence exists in the repository.

If runtime infrastructure is unavailable, report BLOCKED with the exact missing dependency/environment instead of converting static checks into runtime PASS.
