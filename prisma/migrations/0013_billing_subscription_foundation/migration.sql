CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING','ACTIVE','PAST_DUE','PAUSED','CANCELLED','EXPIRED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY','YEARLY','CUSTOM');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT','OPEN','PAID','VOID','UNCOLLECTIBLE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','SUCCEEDED','FAILED','REFUNDED');
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE','SUSPENDED','EXPIRED');

CREATE TABLE "SubscriptionPlan" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "code" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
 "description" TEXT, "billingInterval" "BillingInterval" NOT NULL, "amount" DECIMAL(20,6) NOT NULL,
 "currencyCode" TEXT NOT NULL, "metadata" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE "Subscription" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "erpInstanceId" UUID NOT NULL UNIQUE REFERENCES "ErpInstance"("id") ON DELETE RESTRICT,
 "planId" UUID NOT NULL REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT,
 "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING', "currentPeriodStart" TIMESTAMPTZ NOT NULL,
 "currentPeriodEnd" TIMESTAMPTZ NOT NULL, "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
 "externalCustomerRef" TEXT, "externalSubscriptionRef" TEXT, "metadata" JSONB NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE "Invoice" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "subscriptionId" UUID NOT NULL REFERENCES "Subscription"("id") ON DELETE RESTRICT, "number" TEXT NOT NULL,
 "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT', "currencyCode" TEXT NOT NULL,
 "subtotal" DECIMAL(20,6) NOT NULL, "tax" DECIMAL(20,6) NOT NULL, "total" DECIMAL(20,6) NOT NULL,
 "dueAt" TIMESTAMPTZ, "issuedAt" TIMESTAMPTZ, "paidAt" TIMESTAMPTZ, "externalInvoiceRef" TEXT,
 "metadata" JSONB NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE ("tenantId","number")
);
CREATE TABLE "InvoiceLine" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "invoiceId" UUID NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE, "description" TEXT NOT NULL,
 "quantity" DECIMAL(20,6) NOT NULL, "unitAmount" DECIMAL(20,6) NOT NULL, "amount" DECIMAL(20,6) NOT NULL,
 "metadata" JSONB NOT NULL
);
CREATE TABLE "Payment" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "invoiceId" UUID NOT NULL REFERENCES "Invoice"("id") ON DELETE RESTRICT, "provider" TEXT NOT NULL,
 "providerPaymentRef" TEXT, "idempotencyKey" TEXT NOT NULL, "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
 "amount" DECIMAL(20,6) NOT NULL, "currencyCode" TEXT NOT NULL, "failureCode" TEXT,
 "processedAt" TIMESTAMPTZ, "metadata" JSONB NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE "Entitlement" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "subscriptionId" UUID NOT NULL REFERENCES "Subscription"("id") ON DELETE CASCADE, "key" TEXT NOT NULL,
 "value" JSONB NOT NULL, "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
 "startsAt" TIMESTAMPTZ NOT NULL, "endsAt" TIMESTAMPTZ,
 UNIQUE ("tenantId","subscriptionId","key")
);

CREATE UNIQUE INDEX "Payment_tenant_provider_idempotency" ON "Payment" ("tenantId","provider","idempotencyKey");
CREATE INDEX "Subscription_tenant_status" ON "Subscription" ("tenantId","status");
CREATE INDEX "Subscription_tenant_period_end" ON "Subscription" ("tenantId","currentPeriodEnd");
CREATE INDEX "Invoice_tenant_status_due" ON "Invoice" ("tenantId","status","dueAt");
CREATE INDEX "InvoiceLine_tenant_invoice" ON "InvoiceLine" ("tenantId","invoiceId");
CREATE INDEX "Payment_tenant_status_created" ON "Payment" ("tenantId","status","createdAt");
CREATE INDEX "Entitlement_tenant_status_end" ON "Entitlement" ("tenantId","status","endsAt");

ALTER TABLE "SubscriptionPlan" ENABLE ROW LEVEL SECURITY; ALTER TABLE "SubscriptionPlan" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY; ALTER TABLE "InvoiceLine" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Entitlement" ENABLE ROW LEVEL SECURITY; ALTER TABLE "Entitlement" FORCE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plan_isolation" ON "SubscriptionPlan" USING (pg_has_role(current_user,'erp_control_plane','member')) WITH CHECK (pg_has_role(current_user,'erp_control_plane','member'));
CREATE POLICY "subscription_tenant_isolation" ON "Subscription" USING ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY "invoice_tenant_isolation" ON "Invoice" USING ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY "invoice_line_tenant_isolation" ON "InvoiceLine" USING ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY "payment_tenant_isolation" ON "Payment" USING ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY "entitlement_tenant_isolation" ON "Entitlement" USING ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id',true),'')::uuid);

-- Cross-tenant guards for subscription references.
CREATE FUNCTION enforce_billing_tenant_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ref_tenant uuid;
BEGIN
 IF TG_TABLE_NAME = 'Subscription' THEN
   SELECT "tenantId" INTO ref_tenant FROM "ErpInstance" WHERE id = NEW."erpInstanceId";
   IF ref_tenant IS NULL OR ref_tenant <> NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant ERP reference' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME = 'Invoice' THEN
   SELECT "tenantId" INTO ref_tenant FROM "Subscription" WHERE id = NEW."subscriptionId";
   IF ref_tenant IS NULL OR ref_tenant <> NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant subscription reference' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME = 'InvoiceLine' THEN
   SELECT "tenantId" INTO ref_tenant FROM "Invoice" WHERE id = NEW."invoiceId";
   IF ref_tenant IS NULL OR ref_tenant <> NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant invoice reference' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME = 'Payment' THEN
   SELECT "tenantId" INTO ref_tenant FROM "Invoice" WHERE id = NEW."invoiceId";
   IF ref_tenant IS NULL OR ref_tenant <> NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant invoice reference' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME = 'Entitlement' THEN
   SELECT "tenantId" INTO ref_tenant FROM "Subscription" WHERE id = NEW."subscriptionId";
   IF ref_tenant IS NULL OR ref_tenant <> NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant subscription reference' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER subscription_tenant_guard BEFORE INSERT OR UPDATE ON "Subscription" FOR EACH ROW EXECUTE FUNCTION enforce_billing_tenant_reference();
CREATE TRIGGER invoice_tenant_guard BEFORE INSERT OR UPDATE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION enforce_billing_tenant_reference();
CREATE TRIGGER invoice_line_tenant_guard BEFORE INSERT OR UPDATE ON "InvoiceLine" FOR EACH ROW EXECUTE FUNCTION enforce_billing_tenant_reference();
CREATE TRIGGER payment_tenant_guard BEFORE INSERT OR UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION enforce_billing_tenant_reference();
CREATE TRIGGER entitlement_tenant_guard BEFORE INSERT OR UPDATE ON "Entitlement" FOR EACH ROW EXECUTE FUNCTION enforce_billing_tenant_reference();
