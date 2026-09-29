CREATE POLICY tenant_isolation ON "Tenant" USING ("id" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
CREATE POLICY tenant_identity_isolation ON "TenantIdentity" USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
CREATE POLICY role_tenant_isolation ON "Role" USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
CREATE POLICY audit_tenant_isolation ON "AuditEvent" USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
CREATE POLICY outbox_tenant_isolation ON "OutboxEvent" USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true),'')::uuid);
