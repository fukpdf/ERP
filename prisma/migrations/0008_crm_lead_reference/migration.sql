ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL;
CREATE TRIGGER "Opportunity_lead_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","leadId" ON "Opportunity" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('leadId','Lead');
