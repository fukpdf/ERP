# Phase 1 — Unit 1: Workspace and Dependency Foundation

## Audit result

The canonical ERP tree was audited before implementation. It currently exposes no `package.json`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, TypeScript workspace configuration, Prisma schema, or application source tree.

The historical merge manifest states that `pnpm-lock.yaml` was absent from supplied archives and that the merged application tree was historically 2,171 files. Those claims are treated as lineage evidence only.

## Decision

Do **not** fabricate dependency versions or a package graph. Establish the workspace contract and blocker register first, then recover the actual application source/dependency artifacts from a verified ERP source lineage.

## Required artifacts

- package manager selection
- root package manifest
- lockfile
- workspace/package boundaries
- TypeScript/build configuration
- lint/test commands
- runtime startup commands
- dependency security policy

## Current status

| Artifact | Status |
|---|---|
| Workspace manifest | MISSING |
| Lockfile | MISSING |
| TypeScript/build config | MISSING |
| Application source tree | MISSING |
| Prisma schema | MISSING |
| Reproducible install | BLOCKED |
| Runtime test | BLOCKED |

## Exit condition

Unit 1 remains BLOCKED until verified source artifacts are restored or a deliberate greenfield ERP foundation is approved. Creating fake manifests would violate the ERP evidence contract.
