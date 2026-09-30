# ERP Repository Tracking & Baseline

## Scope
This repository is tracked as a **standalone ERP system**.

**Isolation rule:** ERP work must not be mixed with ilovepdf.cyou, PDF-tool repositories, Laba AI, or any unrelated application. No shared source files, shared deployment manifests, shared database migrations, or cross-project commits are permitted unless a future integration decision is explicitly documented first.

## Baseline
- Repository: `fukpdf/ERP`
- Default branch at audit: `main`
- ERP development branch created: `erp-development`
- Baseline commit: `838d61b89c3fdd6743625277dc055cfa5d5df8ec`
- Latest observed commits before this track: three consecutive `Add files via upload` commits on 2026-09-28.
- Current Git tree contains **120 entries** and is not the same tree described by the historical merge manifest as 2,171 files.
- The current tree is dominated by security/control documentation and test/spec files at repository root.
- A current `package.json` and `prisma/schema.prisma` were not present at the repository root during this baseline audit.
- The historical `SISOFT-MERGE-MANIFEST.txt` claims a much larger canonical tree, including `apps/`, `packages/`, `infra/`, `tools/`, Prisma schema, and 2,171 total files. Those claims are **historical evidence, not current repository state**, until the missing tree is restored or supplied.

## Verified historical constraints
The repository documentation itself records:
- Stage 61 was intended as the canonical base.
- Stage 52 source archive was missing.
- `pnpm-lock.yaml` was absent from the supplied archives.
- HIS Prisma models were not spliced into the main Prisma schema.
- 42 merged modules/packages had no Stage 41–61-style verification evidence.
- Runtime verification was blocked by missing PostgreSQL/Redis/Docker/network/lockfile infrastructure.
- The security documentation distinguishes implemented controls, documented-only controls, and controls requiring live infrastructure.

## Audit rules for this project
1. **Audit first.**
2. Establish the actual current repository tree before implementation.
3. Do not treat documentation claims as implementation evidence.
4. Do not claim runtime PASS without actually running the required runtime gate.
5. After every implementation unit: validate changed files, references, tests, and affected architecture.
6. If validation finds a deficiency, fix it and repeat validation until the unit is clean or an explicit external blocker remains.
7. Preserve ERP isolation from every other project.
8. Prefer additive, reversible changes until the canonical runtime tree is reconstructed and verified.
9. Keep an explicit distinction between IMPLEMENTED, STATIC-VERIFIED, RUNTIME-VERIFIED, BLOCKED, and DOCUMENTED-ONLY.
10. No destructive database operation is permitted without an explicit disposable-environment gate.

## Current baseline conclusion
The ERP repository has a substantial security/documentation/test specification layer, but the current Git snapshot does **not** expose the full application tree described by its historical merge documentation. Therefore implementation should begin with **ERP reconstruction and architecture verification**, not with blindly adding new business features.
