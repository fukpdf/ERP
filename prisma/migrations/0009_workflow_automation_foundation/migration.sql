CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT','ACTIVE','PAUSED','ARCHIVED');
CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING','RUNNING','SUCCEEDED','FAILED','CANCELLED');
CREATE TYPE "WorkflowStepType" AS ENUM ('CONDITION','ACTION','NOTIFICATION');
CREATE TYPE "AutomationTriggerType" AS ENUM ('EVENT','SCHEDULED','MANUAL');
CREATE TYPE "AutomationRunStatus" AS ENUM ('PENDING','RUNNING','SUCCEEDED','FAILED','CANCELLED');

CREATE TABLE "WorkflowDefinition" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,"key" TEXT NOT NULL,"name" TEXT NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',"definition" JSONB NOT NULL);
CREATE TABLE "WorkflowStep" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,"workflowId" UUID NOT NULL REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE,"stepOrder" INTEGER NOT NULL,"type" "WorkflowStepType" NOT NULL,"key" TEXT NOT NULL,"configuration" JSONB NOT NULL);
CREATE TABLE "WorkflowRun" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,"workflowId" UUID NOT NULL REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT,"correlationId" TEXT NOT NULL,"status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',"input" JSONB NOT NULL,"output" JSONB,"error" JSONB,"startedAt" TIMESTAMPTZ,"finishedAt" TIMESTAMPTZ,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE "AutomationRule" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,"key" TEXT NOT NULL,"name" TEXT NOT NULL,"triggerType" "AutomationTriggerType" NOT NULL,"triggerConfig" JSONB NOT NULL,"actionConfig" JSONB NOT NULL,"status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT');
CREATE TABLE "AutomationRun" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,"ruleId" UUID NOT NULL REFERENCES "AutomationRule"("id") ON DELETE RESTRICT,"dedupeKey" TEXT NOT NULL,"status" "AutomationRunStatus" NOT NULL DEFAULT 'PENDING',"input" JSONB NOT NULL,"output" JSONB,"error" JSONB,"startedAt" TIMESTAMPTZ,"finishedAt" TIMESTAMPTZ,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE UNIQUE INDEX "WorkflowDefinition_tenant_key_version" ON "WorkflowDefinition" ("tenantId","key","version");
CREATE UNIQUE INDEX "WorkflowStep_tenant_workflow_order" ON "WorkflowStep" ("tenantId","workflowId","stepOrder");
CREATE UNIQUE INDEX "WorkflowStep_tenant_workflow_key" ON "WorkflowStep" ("tenantId","workflowId","key");
CREATE UNIQUE INDEX "AutomationRule_tenant_key" ON "AutomationRule" ("tenantId","key");
CREATE UNIQUE INDEX "AutomationRun_tenant_rule_dedupe" ON "AutomationRun" ("tenantId","ruleId","dedupeKey");
CREATE INDEX "WorkflowDefinition_tenant_status" ON "WorkflowDefinition" ("tenantId","status");
CREATE INDEX "WorkflowRun_tenant_status_created" ON "WorkflowRun" ("tenantId","status","createdAt");
CREATE INDEX "AutomationRule_tenant_status_trigger" ON "AutomationRule" ("tenantId","status","triggerType");
CREATE INDEX "AutomationRun_tenant_status_created" ON "AutomationRun" ("tenantId","status","createdAt");

ALTER TABLE "WorkflowDefinition" ENABLE ROW LEVEL SECURITY; ALTER TABLE "WorkflowDefinition" FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowStep" ENABLE ROW LEVEL SECURITY; ALTER TABLE "WorkflowStep" FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowRun" ENABLE ROW LEVEL SECURITY; ALTER TABLE "WorkflowRun" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AutomationRule" ENABLE ROW LEVEL SECURITY; ALTER TABLE "AutomationRule" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AutomationRun" ENABLE ROW LEVEL SECURITY; ALTER TABLE "AutomationRun" FORCE ROW LEVEL SECURITY;
