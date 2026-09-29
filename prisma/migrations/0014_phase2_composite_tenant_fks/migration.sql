-- Phase 2 hardening: enforce same-tenant references at the database constraint level.
-- PostgreSQL foreign-key checks bypass RLS, so composite tenant-aware FKs are used
-- instead of relying on a trigger SELECT that can be filtered by FORCE RLS.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Organization_tenant_id_unique') THEN
    ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessUnit_tenant_id_unique') THEN
    ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Currency_tenant_id_unique') THEN
    ALTER TABLE "Currency" ADD CONSTRAINT "Currency_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UnitOfMeasure_tenant_id_unique') THEN
    ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_tenant_id_unique') THEN
    ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_tenant_id_unique') THEN
    ALTER TABLE "Product" ADD CONSTRAINT "Product_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Warehouse_tenant_id_unique') THEN
    ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryStock_tenant_id_unique') THEN
    ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_tenant_id_unique') THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FiscalPeriod_tenant_id_unique') THEN
    ALTER TABLE "FiscalPeriod" ADD CONSTRAINT "FiscalPeriod_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JournalEntry_tenant_id_unique') THEN
    ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JournalLine_tenant_id_unique') THEN
    ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Vendor_tenant_id_unique') THEN
    ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_tenant_id_unique') THEN
    ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseLine_tenant_id_unique') THEN
    ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Customer_tenant_id_unique') THEN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesOrder_tenant_id_unique') THEN
    ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesLine_tenant_id_unique') THEN
    ALTER TABLE "SalesLine" ADD CONSTRAINT "SalesLine_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Employee_tenant_id_unique') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollRun_tenant_id_unique') THEN
    ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollEntry_tenant_id_unique') THEN
    ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_tenant_id_unique') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Opportunity_tenant_id_unique') THEN
    ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_tenant_id_unique') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectTask_tenant_id_unique') THEN
    ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillOfMaterials_tenant_id_unique') THEN
    ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManufacturingOrder_tenant_id_unique') THEN
    ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReportDefinition_tenant_id_unique') THEN
    ALTER TABLE "ReportDefinition" ADD CONSTRAINT "ReportDefinition_tenant_id_unique" UNIQUE ("tenantId","id");
  END IF;
END $$;

ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_organization_tenant_fk" FOREIGN KEY ("tenantId","organizationId") REFERENCES "Organization" ("tenantId","id") ON DELETE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_tenant_fk" FOREIGN KEY ("tenantId","categoryId") REFERENCES "ProductCategory" ("tenantId","id") ON DELETE SET NULL ("categoryId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_uom_tenant_fk" FOREIGN KEY ("tenantId","uomId") REFERENCES "UnitOfMeasure" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_business_unit_tenant_fk" FOREIGN KEY ("tenantId","businessUnitId") REFERENCES "BusinessUnit" ("tenantId","id") ON DELETE SET NULL ("businessUnitId");
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_warehouse_tenant_fk" FOREIGN KEY ("tenantId","warehouseId") REFERENCES "Warehouse" ("tenantId","id") ON DELETE CASCADE;
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_product_tenant_fk" FOREIGN KEY ("tenantId","productId") REFERENCES "Product" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_fiscal_period_tenant_fk" FOREIGN KEY ("tenantId","fiscalPeriodId") REFERENCES "FiscalPeriod" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_entry_tenant_fk" FOREIGN KEY ("tenantId","journalEntryId") REFERENCES "JournalEntry" ("tenantId","id") ON DELETE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_account_tenant_fk" FOREIGN KEY ("tenantId","accountId") REFERENCES "Account" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendor_tenant_fk" FOREIGN KEY ("tenantId","vendorId") REFERENCES "Vendor" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_order_tenant_fk" FOREIGN KEY ("tenantId","purchaseOrderId") REFERENCES "PurchaseOrder" ("tenantId","id") ON DELETE CASCADE;
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_product_tenant_fk" FOREIGN KEY ("tenantId","productId") REFERENCES "Product" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customer_tenant_fk" FOREIGN KEY ("tenantId","customerId") REFERENCES "Customer" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "SalesLine" ADD CONSTRAINT "SalesLine_order_tenant_fk" FOREIGN KEY ("tenantId","salesOrderId") REFERENCES "SalesOrder" ("tenantId","id") ON DELETE CASCADE;
ALTER TABLE "SalesLine" ADD CONSTRAINT "SalesLine_product_tenant_fk" FOREIGN KEY ("tenantId","productId") REFERENCES "Product" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_run_tenant_fk" FOREIGN KEY ("tenantId","payrollRunId") REFERENCES "PayrollRun" ("tenantId","id") ON DELETE CASCADE;
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_employee_tenant_fk" FOREIGN KEY ("tenantId","employeeId") REFERENCES "Employee" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_lead_tenant_fk" FOREIGN KEY ("tenantId","leadId") REFERENCES "Lead" ("tenantId","id") ON DELETE SET NULL ("leadId");
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_project_tenant_fk" FOREIGN KEY ("tenantId","projectId") REFERENCES "Project" ("tenantId","id") ON DELETE CASCADE;
ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_product_tenant_fk" FOREIGN KEY ("tenantId","productId") REFERENCES "Product" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_product_tenant_fk" FOREIGN KEY ("tenantId","productId") REFERENCES "Product" ("tenantId","id") ON DELETE NO ACTION;
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_bom_tenant_fk" FOREIGN KEY ("tenantId","bomId") REFERENCES "BillOfMaterials" ("tenantId","id") ON DELETE NO ACTION;

-- Remove the earlier trigger-only guard layer; composite FKs are now authoritative.
DROP TRIGGER IF EXISTS "BusinessUnit_organizationId_tenant_guard" ON "BusinessUnit";
DROP TRIGGER IF EXISTS "Product_categoryId_tenant_guard" ON "Product";
DROP TRIGGER IF EXISTS "Product_uomId_tenant_guard" ON "Product";
DROP TRIGGER IF EXISTS "Warehouse_businessUnitId_tenant_guard" ON "Warehouse";
DROP TRIGGER IF EXISTS "InventoryStock_warehouseId_tenant_guard" ON "InventoryStock";
DROP TRIGGER IF EXISTS "InventoryStock_productId_tenant_guard" ON "InventoryStock";
DROP TRIGGER IF EXISTS "JournalEntry_fiscalPeriodId_tenant_guard" ON "JournalEntry";
DROP TRIGGER IF EXISTS "JournalLine_journalEntryId_tenant_guard" ON "JournalLine";
DROP TRIGGER IF EXISTS "JournalLine_accountId_tenant_guard" ON "JournalLine";
DROP TRIGGER IF EXISTS "PurchaseOrder_vendorId_tenant_guard" ON "PurchaseOrder";
DROP TRIGGER IF EXISTS "PurchaseLine_purchaseOrderId_tenant_guard" ON "PurchaseLine";
DROP TRIGGER IF EXISTS "PurchaseLine_productId_tenant_guard" ON "PurchaseLine";
DROP TRIGGER IF EXISTS "SalesOrder_customerId_tenant_guard" ON "SalesOrder_customerId_tenant_guard";
DROP TRIGGER IF EXISTS "SalesLine_salesOrderId_tenant_guard" ON "SalesLine";
DROP TRIGGER IF EXISTS "SalesLine_productId_tenant_guard" ON "SalesLine";
DROP TRIGGER IF EXISTS "PayrollEntry_payrollRunId_tenant_guard" ON "PayrollEntry";
DROP TRIGGER IF EXISTS "PayrollEntry_employeeId_tenant_guard" ON "PayrollEntry";
DROP TRIGGER IF EXISTS "ProjectTask_projectId_tenant_guard" ON "ProjectTask";
DROP TRIGGER IF EXISTS "BillOfMaterials_productId_tenant_guard" ON "BillOfMaterials";
DROP TRIGGER IF EXISTS "ManufacturingOrder_productId_tenant_guard" ON "ManufacturingOrder";
DROP TRIGGER IF EXISTS "ManufacturingOrder_bomId_tenant_guard" ON "ManufacturingOrder";
DROP TRIGGER IF EXISTS "Opportunity_lead_tenant_guard" ON "Opportunity_lead_tenant_guard";
DROP FUNCTION IF EXISTS enforce_same_tenant_reference();
