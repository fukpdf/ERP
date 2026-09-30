CREATE TABLE "QueueJob" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "idempotencyKey" TEXT NOT NULL,
  "availableAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "claimedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "QueueJob_status_check" CHECK ("status" IN ('PENDING','RUNNING','SUCCEEDED','FAILED','DEAD')),
  CONSTRAINT "QueueJob_attempt_check" CHECK ("attempt" >= 0 AND "maxAttempts" > 0 AND "attempt" <= "maxAttempts")
);
CREATE UNIQUE INDEX "QueueJob_tenant_idempotency" ON "QueueJob" ("tenantId","idempotencyKey");
CREATE INDEX "QueueJob_status_available" ON "QueueJob" ("status","availableAt");
CREATE INDEX "QueueJob_tenant_status_available" ON "QueueJob" ("tenantId","status","availableAt");
CREATE INDEX "QueueJob_tenant_created" ON "QueueJob" ("tenantId","createdAt");
ALTER TABLE "QueueJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QueueJob" FORCE ROW LEVEL SECURITY;
CREATE POLICY "queue_job_tenant_isolation" ON "QueueJob"
USING ("tenantId"::text = current_setting('app.tenant_id', true))
WITH CHECK ("tenantId"::text = current_setting('app.tenant_id', true));
