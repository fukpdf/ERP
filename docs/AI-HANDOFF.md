# AI Handoff & Governance Charter

**ATTENTION: READ THIS FILE BEFORE MODIFYING ANY FILE IN THIS REPOSITORY.**

**Current Phase:** PHASE 1 (Foundation & Monorepo Architecture) — COMPLETE; READY FOR PHASE 2  
**Implementation Completed:** Phase 1 Technical Foundation (@erp/core, @erp/contracts) — Zero business domains implemented.  
**Governing Authority:** Universal ERP Architecture Board  
**Historical Baseline:** No ERP business-domain implementation was started during Phase 0. Repository/configuration normalization that predates the final Phase 0 documentation commit remains part of the verified repository history (Commits `8298c83` and `54fc3d4`).  
**Target:** Absolute Independence from Any Single AI Provider or Session Memory

---

## 1. Product Vision & Non-Negotiable Mandate

You are working on the **Universal Enterprise Resource Planning (ERP) Platform**. The ultimate objective is an international, enterprise-grade, modular ERP platform capable of scaling to **10,000+ business capabilities** across diverse industries (Retail, Manufacturing, Healthcare, SCM, Professional Services), legal structures, tax regimes, and company sizes without collapsing into a monolithic application.

---

## 2. The 4-Tier Architectural Hierarchy

All code in this repository strictly adheres to a **4-tier layered architecture**:
```
Tier 4: CAPABILITIES       (10,000+ atomic features: e.g., cap-proc-3way-matching)
       │ (depends on)
Tier 3: MODULES            (Domain contexts: GL, Sales, Procurement, Inventory)
       │ (depends on)
Tier 2: PLATFORM SERVICES  (Tenancy, RBAC, Workflow, Events, Audit, I18n)
       │ (depends on)
Tier 1: CORE               (Database, Transactions, Crypto, Money Math, Di)
```

### Absolute Rules:
- Dependencies point **only downward**. Core never depends on higher tiers. Platform services never depend on business modules.
- Modules never deep-import other modules. Cross-module communication is strictly via public contracts (`src/contract/index.ts`) or asynchronous domain events.
- Zero circular dependencies.

---

## 3. Current Repository Reality (Phase 0 Audit Findings)

Do **NOT** trust old claims in legacy markdown files blindly. Here is the verified truth:
1. **Working Foundation:** The only running ERP code in this repository is `artifacts/erp-preview/imported/server.js` (Node.js HTTP server on port 3000, serving `public/` and handling `/erp-api/*` REST endpoints backed by local `data/db.json`).
2. **Orphaned Specs & Docs:** In `artifacts/erp-preview/imported/`, there are 40+ spec files (`*.spec.ts`) and 50+ markdown files. The backend source code (`apps/api`, `src/modules/*`, `schema.prisma`) they reference **does not exist in this repository**. Treat them as valuable conceptual specifications, **not** working implementations.
3. **Database State:** PostgreSQL / Drizzle is configured in `lib/db`, but the schema in `lib/db/src/schema/index.ts` currently has 0 tables.

---

## 4. Strictly Prohibited Actions for Any AI

1. **DO NOT START IMPLEMENTATION UNTIL PHASE 1 IS FORMALLY INITIATED.**
2. **DO NOT DELETE EXISTING CODE OR SPECS.** Do not delete files in `artifacts/erp-preview/imported/` merely because they are classified as rebuild or orphaned.
3. **DO NOT INVENT MISSING FUNCTIONALITY.** Do not claim a module or table exists unless you can verify its file in the filesystem.
4. **DO NOT CREATE FAKE TESTS.** Tests must perform real assertions against real logic and real database constraints.
5. **DO NOT PERFORM SILENT DATABASE MIGRATIONS.**
6. **DO NOT BYPASS SECURITY, TENANT ISOLATION, OR RBAC.**
7. **DO NOT WRITE MONOLITHIC MEGA-FILES.**

---

## 5. Mandatory Workflow Protocol

Every engineering change in Phase 1+ must follow this strict sequence:

$$\text{AUDIT} \longrightarrow \text{IMPLEMENT} \longrightarrow \text{VALIDATE} \longrightarrow \text{VERIFY} \longrightarrow \text{RE-AUDIT} \longrightarrow \text{FIX} \longrightarrow \text{VERIFY AGAIN}$$

- If an architectural question is ambiguous, record it in `docs/DECISIONS.md`. Never conceal uncertainty.
- Always check that `npm run typecheck`, `npm run build`, and `npm run lint` succeed before concluding any task.
