# Phase 4 — Static Verification

## Checks
- Phase-4 schema models: 8.
- ERP registry is one-to-one with Tenant through unique `tenantId`.
- Control-plane RBAC has separate role/permission/binding models.
- Provisioning operation has unique `erpInstanceId + idempotencyKey`.
- Control-plane audit events have correlation IDs.
- All Phase-4 tables use FORCE RLS.
- All Phase-4 RLS policies require the dedicated `erp_control_plane` role and include `WITH CHECK`.
- No Phase-4 model uses `app.tenant_id` for access.
- Deterministic control-plane package tests exist.
- No unrelated project paths were introduced.

## External design evidence
PostgreSQL documents that role membership is represented through `pg_has_role`, and `SET ROLE` only permits switching to roles the session user is a member of. The Phase-4 database boundary therefore uses an explicit database role rather than a client-controlled custom GUC as the authorization signal. citeturn0search0turn0search6

## Runtime status
**BLOCKED** until real PostgreSQL and trusted database roles are available. Static verification is not presented as runtime certification.
