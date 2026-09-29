-- Tighten Phase 1 tenant isolation. Tenant itself remains a control-plane object so provisioning is not blocked by RLS.
DROP POLICY IF EXISTS tenant_identity_isolation ON "TenantIdentity";
CREATE POLICY tenant_identity_isolation ON "TenantIdentity" USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
DROP POLICY IF EXISTS role_tenant_isolation ON "Role";
CREATE POLICY role_tenant_isolation ON "Role" USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
DROP POLICY IF EXISTS audit_tenant_isolation ON "AuditEvent";
CREATE POLICY audit_tenant_isolation ON "AuditEvent" USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
DROP POLICY IF EXISTS outbox_tenant_isolation ON "OutboxEvent";
CREATE POLICY outbox_tenant_isolation ON "OutboxEvent" USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
ALTER TABLE "TenantIdentity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Role" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OutboxEvent" FORCE ROW LEVEL SECURITY;
