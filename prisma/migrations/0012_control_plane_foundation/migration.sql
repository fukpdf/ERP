-- Phase 4: control-plane and multi-ERP registry foundation.
-- The control-plane database role is deliberately separate from tenant application roles.
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_control_plane') THEN
    RAISE EXCEPTION 'required PostgreSQL role erp_control_plane is missing; run the control-plane bootstrap before migrations';
  END IF;
END $;

CREATE TYPE "ErpInstanceStatus" AS ENUM ('PROVISIONING','ACTIVE','SUSPENDED','DECOMMISSIONING','DECOMMISSIONED','FAILED');
CREATE TYPE "ProvisioningOperationType" AS ENUM ('PROVISION','DEPROVISION','SUSPEND','RESUME','REPAIR');
CREATE TYPE "ProvisioningOperationStatus" AS ENUM ('PENDING','RUNNING','SUCCEEDED','FAILED','CANCELLED');
CREATE TYPE "ControlPlaneAdminStatus" AS ENUM ('ACTIVE','SUSPENDED','DISABLED');

CREATE TABLE "ErpInstance" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL UNIQUE REFERENCES "Tenant"("id") ON DELETE RESTRICT,
  "slug" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "status" "ErpInstanceStatus" NOT NULL DEFAULT 'PROVISIONING',
  "region" TEXT NOT NULL,
  "planCode" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "ControlPlaneAdmin" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "identityId" UUID NOT NULL UNIQUE REFERENCES "Identity"("id") ON DELETE RESTRICT,
  "status" "ControlPlaneAdminStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "ControlPlaneRole" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL
);

CREATE TABLE "ControlPlanePermission" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL
);

CREATE TABLE "ControlPlaneAdminRole" (
  "adminId" UUID NOT NULL REFERENCES "ControlPlaneAdmin"("id") ON DELETE CASCADE,
  "roleId" UUID NOT NULL REFERENCES "ControlPlaneRole"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("adminId","roleId")
);

CREATE TABLE "ControlPlaneRolePermission" (
  "roleId" UUID NOT NULL REFERENCES "ControlPlaneRole"("id") ON DELETE CASCADE,
  "permissionId" UUID NOT NULL REFERENCES "ControlPlanePermission"("id") ON DELETE CASCADE,
  PRIMARY KEY ("roleId","permissionId")
);

CREATE TABLE "ProvisioningOperation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "erpInstanceId" UUID NOT NULL REFERENCES "ErpInstance"("id") ON DELETE RESTRICT,
  "requestedByAdminId" UUID NOT NULL REFERENCES "ControlPlaneAdmin"("id") ON DELETE RESTRICT,
  "operationType" "ProvisioningOperationType" NOT NULL,
  "status" "ProvisioningOperationStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "details" JSONB NOT NULL,
  "startedAt" TIMESTAMPTZ,
  "finishedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "ControlPlaneAuditEvent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminId" UUID NOT NULL REFERENCES "ControlPlaneAdmin"("id") ON DELETE RESTRICT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "ProvisioningOperation_instance_idempotency" ON "ProvisioningOperation" ("erpInstanceId","idempotencyKey");
CREATE INDEX "ErpInstance_status_region" ON "ErpInstance" ("status","region");
CREATE INDEX "ProvisioningOperation_status_created" ON "ProvisioningOperation" ("status","createdAt");
CREATE INDEX "ControlPlaneAuditEvent_admin_occurred" ON "ControlPlaneAuditEvent" ("adminId","occurredAt");
CREATE INDEX "ControlPlaneAuditEvent_resource" ON "ControlPlaneAuditEvent" ("resourceType","resourceId");

ALTER TABLE "ErpInstance" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ErpInstance" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ControlPlaneAdmin" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ControlPlaneAdmin" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ControlPlaneRole" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ControlPlaneRole" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ControlPlanePermission" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ControlPlanePermission" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ControlPlaneAdminRole" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ControlPlaneAdminRole" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ControlPlaneRolePermission" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ControlPlaneRolePermission" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProvisioningOperation" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ProvisioningOperation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ControlPlaneAuditEvent" ENABLE ROW LEVEL SECURITY; ALTER TABLE "ControlPlaneAuditEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY "erp_instance_control_plane_only" ON "ErpInstance" USING (pg_has_role(current_user,'erp_control_plane','member')) WITH CHECK (pg_has_role(current_user,'erp_control_plane','member'));
CREATE POLICY "control_plane_admin_only" ON "ControlPlaneAdmin" USING (pg_has_role(current_user,'erp_control_plane','member')) WITH CHECK (pg_has_role(current_user,'erp_control_plane','member'));
CREATE POLICY "control_plane_role_only" ON "ControlPlaneRole" USING (pg_has_role(current_user,'erp_control_plane','member')) WITH CHECK (pg_has_role(current_user,'erp_control_plane','member'));
CREATE POLICY "control_plane_permission_only" ON "ControlPlanePermission" USING (pg_has_role(current_user,'erp_control_plane','member')) WITH CHECK (pg_has_role(current_user,'erp_control_plane','member'));
CREATE POLICY "control_plane_admin_role_only" ON "ControlPlaneAdminRole" USING (pg_has_role(current_user,'erp_control_plane','member')) WITH CHECK (pg_has_role(current_user,'erp_control_plane','member'));
CREATE POLICY "control_plane_role_permission_only" ON "ControlPlaneRolePermission" USING (pg_has_role(current_user,'erp_control_plane','member')) WITH CHECK (pg_has_role(current_user,'erp_control_plane','member'));
CREATE POLICY "provisioning_operation_control_plane_only" ON "ProvisioningOperation" USING (pg_has_role(current_user,'erp_control_plane','member')) WITH CHECK (pg_has_role(current_user,'erp_control_plane','member'));
CREATE POLICY "control_plane_audit_only" ON "ControlPlaneAuditEvent" USING (pg_has_role(current_user,'erp_control_plane','member')) WITH CHECK (pg_has_role(current_user,'erp_control_plane','member'));

-- Deployment must explicitly grant membership to the trusted control-plane service role.
-- Tenant application roles MUST NOT be members of erp_control_plane.

-- Deterministic least-privilege control-plane permission catalog.
INSERT INTO "ControlPlanePermission" ("key","name") VALUES
  ('erp.read','Read ERP registry'),
  ('erp.provision','Provision or repair ERP instances'),
  ('erp.suspend','Suspend or resume ERP instances'),
  ('erp.deprovision','Deprovision ERP instances'),
  ('erp.audit','Read control-plane audit events')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "ControlPlaneRole" ("key","name") VALUES
  ('platform_admin','Platform administrator'),
  ('operations_admin','ERP operations administrator'),
  ('auditor','Control-plane auditor')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "ControlPlaneRolePermission" ("roleId","permissionId")
SELECT r.id, p.id
FROM "ControlPlaneRole" r CROSS JOIN "ControlPlanePermission" p
WHERE r.key = 'platform_admin'
ON CONFLICT DO NOTHING;

INSERT INTO "ControlPlaneRolePermission" ("roleId","permissionId")
SELECT r.id, p.id
FROM "ControlPlaneRole" r
JOIN "ControlPlanePermission" p ON p.key IN ('erp.read','erp.provision','erp.suspend','erp.deprovision')
WHERE r.key = 'operations_admin'
ON CONFLICT DO NOTHING;

INSERT INTO "ControlPlaneRolePermission" ("roleId","permissionId")
SELECT r.id, p.id
FROM "ControlPlaneRole" r
JOIN "ControlPlanePermission" p ON p.key IN ('erp.read','erp.audit')
WHERE r.key = 'auditor'
ON CONFLICT DO NOTHING;
