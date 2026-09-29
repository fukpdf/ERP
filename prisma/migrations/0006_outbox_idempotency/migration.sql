ALTER TABLE "OutboxEvent" ADD COLUMN "dedupeKey" TEXT NOT NULL DEFAULT 'legacy-' || gen_random_uuid()::text;
CREATE UNIQUE INDEX "OutboxEvent_tenant_dedupe" ON "OutboxEvent" ("tenantId","dedupeKey");
