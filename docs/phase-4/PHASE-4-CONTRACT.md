# Phase 4 — Control Plane & Multi-ERP Management Contract

**Branch:** `erp-development`

## Scope
Phase 4 establishes the control-plane boundary for managing multiple ERP instances without weakening tenant-plane isolation.

### Required invariants
1. `Tenant` remains the tenant-plane business boundary.
2. `ErpInstance` maps one-to-one to a tenant and is managed only from the control plane.
3. Control-plane administration is separate from tenant RBAC.
4. Control-plane tables are FORCE RLS protected and require membership in the dedicated `erp_control_plane` PostgreSQL role.
5. Tenant application roles must not be members of `erp_control_plane`.
6. Provisioning operations are idempotent per ERP instance through a database uniqueness constraint.
7. Every provisioning operation and control-plane audit event carries a correlation ID.
8. Lifecycle transitions are deterministic and invalid transitions fail closed.
9. Deprovisioning is represented as a lifecycle state transition; destructive physical deletion is not implicit.
10. Control-plane authorization is enforced by both database boundary and application RBAC; membership in the database role is not a substitute for permission checks.
11. No control-plane table is tenant-context accessible through `app.tenant_id`.
12. Runtime provisioning workers, external infrastructure, and production credentials remain separate from the deterministic control-plane contract until real infrastructure exists.

## Runtime gate
Static schema/package work can be validated in-repository. Runtime completion requires a real PostgreSQL environment and evidence for:
- migration from empty database;
- tenant role denied access to control-plane tables;
- trusted control-plane role allowed access;
- admin/RBAC permission checks;
- provisioning idempotency under concurrent requests;
- lifecycle transition persistence;
- audit creation and correlation propagation;
- suspend/resume/deprovision safety;
- recovery from failed provisioning.
