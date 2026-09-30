# Phase 0 — Canonical Repository Baseline

**Project:** ERP  
**Repository:** `fukpdf/ERP`  
**Branch:** `erp-development`  
**Baseline commit:** `b398ae159a8e69b784f46dc8d1d0715f552c078a`  
**Baseline date:** 2026-09-29

## Verified repository facts

- Current recursive Git tree contains **123 files** and is not truncated.
- Historical `SISOFT-MERGE-MANIFEST.txt` claims **2,171 files** and a 193-model Prisma schema.
- The current tree does **not** expose `package.json`, `pnpm-lock.yaml`, or `prisma/schema.prisma`.
- Therefore historical implementation claims are retained as historical evidence, not treated as current runtime truth.
- Runtime verification remains **BLOCKED** until a reproducible dependency/runtime/database environment is restored.

## Canonical-source rule

For Phase 0 and all later implementation, the Git tree at the recorded commit is the canonical current-state inventory. Historical manifests are lineage evidence only and must be reconciled before their claimed components are considered current implementation.

## Required next reconciliation

1. Recover or explicitly retire the historical 2,171-file application tree.
2. Recover dependency manifests and lockfile.
3. Recover/verify the canonical Prisma schema and migrations.
4. Map every historical claimed module to a current Git path or mark it MISSING.
5. Only then begin Phase 1 platform implementation.

## Verification

- Tree fetched recursively from GitHub API: **PASS**
- Tree truncation: **PASS — false**
- Machine-readable baseline: **CREATED**
- Runtime execution: **BLOCKED — no runtime/dependency/database evidence available**
