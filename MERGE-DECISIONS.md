# MERGE-DECISIONS.md

## Decision 1 — Lineage A vs Lineage B scope (RESOLVED)

**Question:** ERP-MERGED-AUDITED (Lineage A, 30 packages) vs Stage40-61 (Lineage B, 6 packages) — is Lineage B a real regression or a reorganization?

**Evidence:**
- Both share identical package identity `erp-system@1.0.0-merged`.
- Stage 61 `prisma/schema.prisma` has exactly 193 models — same count referenced in Stage 40's `FOUNDATION-BASELINE-INVENTORY-STAGE40.json` (`schemaModelCount: 193`), including all Finance/HR/Payroll/Purchase/Sales models. Schema was NOT narrowed.
- `apps/api/src/modules/` in Stage 61 contains: analytics, auth, billing, compliance, consent, crm, dashboards, dsr, finance, hr, inventory, kpi, manufacturing, payroll, privacy, projects, purchase, rbac, reports, retention, sales, tenancy, workflow (22 modules) — i.e. the core ERP business domains ARE implemented in Lineage B, just as `apps/api/modules/*` instead of `packages/*-engine` (Lineage A's structure).
- Diffing Lineage A's `apps/api/src/modules/*` (35 modules) against Lineage B's confirms a genuine, narrower gap of 13 modules never ported: `accounting, ai, audit, control-plane, documents, employee, handoff, notifications, portal, portal-auth, settings, sync, terminology`.
- Corresponding Lineage-A-only `packages/`: ai-client, ai-prompts, control-plane-client, sync-crdt, terminology, form-builder, provisioning-engine, deployment-engine, version-engine, canary-engine, cloud-provider, cloud-provider-oracle, backup-engine, branding-engine, barcode-engine, uom-engine, quality-engine, gantt-engine (Projects app has milestones but not a dedicated Gantt engine), m6-billing-invoicing-core, gl-engine (Stage 61's `finance` module covers GL — needs code-level diff, not assumed duplicate), sales-pipeline-engine (CRM module may or may not cover this — needs diff).

**Decision:** Stage 61 is CANONICAL BASE (it carries every stage's runtime-verification evidence; Lineage A has none). The 13 genuinely-missing modules and their supporting packages are REINTRODUCED from Lineage A into the canonical tree, but tagged:
- Status: **MERGED — UNVERIFIED** (not PARTIALLY IMPLEMENTED, since the code is complete in Lineage A; but it has not passed any Stage 41–61 gate: no Prisma runtime check, no RLS/tenant-isolation audit, no RBAC audit against Stage 61's current auth/tenancy model).
- Before these modules can be promoted to any verified status, they need: (a) a code-level compatibility pass against Stage 61's current `tenants/users/roles/permissions` foundation (Lineage A's auth/tenancy code predates Stage 40's reconstruction and may reference a different shape), (b) RLS/tenant-isolation review per project rule §7, (c) inclusion in a future runtime gate.
- `gl-engine` and `sales-pipeline-engine` are NOT blindly merged — flagged CONFLICT/POSSIBLE-DUPLICATE pending a code diff against Stage 61's `finance` and `crm` modules, so no functionality is silently duplicated or dropped.

## Decision 2 — Duplicate/renamed wrapper folders (RESOLVED)
Normalize every stage's true root before diffing (see MERGE-INVENTORY.md "True root path" column). Wrapper folder names (`erp_work48`, `stage58`, etc.) are cosmetic packaging artifacts, not meaningful content — stripped during merge, not treated as separate branches.

## Decision 3 — Stage 52 missing archive (OPEN)
No Stage 52 zip was supplied. Its existence is only inferable from doc filenames inside Stage 55 (`docs-STAGE52-CLEAN-DATABASE-RUNTIME-EXECUTION.md`, `docs-STAGE52-EXCEPTIONS.md`). Those docs describe outcomes but the actual code delta for Stage 52 cannot be verified against source. Treated as MISSING — Stage 51 -> Stage 53 diff will be taken as the effective Stage 52+53 delta, and this gap is recorded in STAGE-RECONCILIATION.md rather than papered over.

## Decision 4 — HIS-2 brace-expansion bug (OPEN)
`his-2-ancillary-clinical` contains both `packages/pharmacy-engine` (etc., real folders) and a corrupted literal `packages/{pharmacy-engine,lab-engine,blood-bank-engine,radiology-engine}` folder. Need to diff whether the corrupted copy has any content the real folders lack before deleting it. Not yet resolved — will confirm in next pass before deleting anything, per rule §27 (do not delete without documenting).

## Decision 4 — HIS-2 brace-expansion bug (RESOLVED)
Confirmed via diff: the literal `packages/{pharmacy-engine,lab-engine,blood-bank-engine,radiology-engine}` directory in HIS-2 was empty (0 files) — a pure packaging artifact from an unexpanded shell brace, not a divergent copy. Discarded, no content lost. The same bug pattern was found and resolved in three more places during final packaging sanity checks: `infra/security-hardening/{...}` (Lineage A), `lab-engine/src/{catalog,results}`, `pharmacy-engine/src/{drug,dispensing,controlled}`, and `his-patient/{controllers,services,...}` (HIS-1) — all confirmed empty and removed. This recurring bug across three independently-dated archives suggests the source pipeline that produced these zips has a systemic issue with brace-expansion during packaging; flagged in FINAL-MERGE-REPORT.md as a producer-side defect to fix upstream, not just something to clean up per-archive.
