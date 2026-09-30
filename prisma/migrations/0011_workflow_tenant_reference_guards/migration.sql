-- Enforce same-tenant references for workflow and automation graphs.
CREATE OR REPLACE FUNCTION enforce_workflow_tenant_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE referenced_tenant UUID;
BEGIN
  IF NEW."tenantId" IS NULL THEN RETURN NEW; END IF;
  EXECUTE format('SELECT "tenantId" FROM %I WHERE "id" = $1', TG_ARGV[1])
    INTO referenced_tenant USING NULLIF(to_jsonb(NEW)->>TG_ARGV[0], '')::uuid;
  IF referenced_tenant IS NOT NULL AND referenced_tenant <> NEW."tenantId" THEN
    RAISE EXCEPTION 'cross-tenant workflow reference rejected on %', TG_TABLE_NAME USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "WorkflowStep_workflow_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","workflowId" ON "WorkflowStep" FOR EACH ROW EXECUTE FUNCTION enforce_workflow_tenant_reference('workflowId','WorkflowDefinition');
CREATE TRIGGER "WorkflowRun_workflow_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","workflowId" ON "WorkflowRun" FOR EACH ROW EXECUTE FUNCTION enforce_workflow_tenant_reference('workflowId','WorkflowDefinition');
CREATE TRIGGER "AutomationRun_rule_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","ruleId" ON "AutomationRun" FOR EACH ROW EXECUTE FUNCTION enforce_workflow_tenant_reference('ruleId','AutomationRule');
