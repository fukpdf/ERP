-- Phase 1 tenant isolation policies. Policies are restrictive for both reads and writes.
CREATE POLICY tenant_isolation ON "Tenant"
USING ("id" = NULLIF(current_setting('app.tenant_id', true),'')::uuid)
WITH CHECK ("id" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);

CREATE POLICY tenant_identity_isolation ON "TenantIdentity"
USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid)
WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);

CREATE POLICY role_tenant_isolation ON "Role"
USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid)
WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);

CREATE POLICY audit_tenant_isolation ON "AuditEvent"
USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid)
WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);

CREATE POLICY outbox_tenant_isolation ON "OutboxEvent"
USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid)
WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);

-- A session is globally identified but must only be visible when its identity belongs
-- to the current tenant. This prevents a tenant from discovering another tenant's sessions.
CREATE POLICY session_tenant_isolation ON "Session"
USING (EXISTS (
  SELECT 1 FROM "TenantIdentity" ti
  WHERE ti."identityId" = "Session"."identityId"
    AND ti."tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "TenantIdentity" ti
  WHERE ti."identityId" = "Session"."identityId"
    AND ti."tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid
));
