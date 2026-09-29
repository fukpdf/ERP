# Phase 4 — Implementation Status

**Date:** 2026-09-29  
**Branch:** `erp-development`

## Implemented
- ERP registry: `ErpInstance`.
- Control-plane admin identity.
- Control-plane roles and permissions.
- Admin-role and role-permission bindings.
- Provisioning operation ledger with idempotency key.
- Control-plane audit event ledger.
- Dedicated `erp_control_plane` PostgreSQL role boundary.
- FORCE RLS on all Phase-4 control-plane tables.
- Deterministic ERP lifecycle transition and request-validation package.
- Unit tests for valid/invalid lifecycle transitions and deterministic dedupe.
- Workspace test discovery updated to include nested package tests.

## Explicitly not claimed
- No production provisioning infrastructure was invented.
- No cloud resource creation/deletion was claimed.
- No live PostgreSQL runtime result was fabricated.
- No lockfile was fabricated.
