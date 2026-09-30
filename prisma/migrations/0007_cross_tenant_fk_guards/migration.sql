CREATE OR REPLACE FUNCTION enforce_same_tenant_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE referenced_tenant UUID;
BEGIN
  IF NEW."tenantId" IS NULL THEN RETURN NEW; END IF;
  EXECUTE format('SELECT "tenantId" FROM %I WHERE "id" = $1', TG_ARGV[1])
    INTO referenced_tenant
    USING NULLIF(to_jsonb(NEW)->>TG_ARGV[0], '')::uuid;
  IF referenced_tenant IS NOT NULL AND referenced_tenant <> NEW."tenantId" THEN
    RAISE EXCEPTION 'cross-tenant reference rejected on %', TG_TABLE_NAME USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "BusinessUnit_organizationId_tenant_guard" ON "BusinessUnit";
CREATE TRIGGER "BusinessUnit_organizationId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","organizationId" ON "BusinessUnit" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('organizationId','Organization');
DROP TRIGGER IF EXISTS "Product_categoryId_tenant_guard" ON "Product";
CREATE TRIGGER "Product_categoryId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","categoryId" ON "Product" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('categoryId','ProductCategory');
DROP TRIGGER IF EXISTS "Product_uomId_tenant_guard" ON "Product";
CREATE TRIGGER "Product_uomId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","uomId" ON "Product" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('uomId','UnitOfMeasure');
DROP TRIGGER IF EXISTS "Warehouse_businessUnitId_tenant_guard" ON "Warehouse";
CREATE TRIGGER "Warehouse_businessUnitId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","businessUnitId" ON "Warehouse" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('businessUnitId','BusinessUnit');
DROP TRIGGER IF EXISTS "InventoryStock_warehouseId_tenant_guard" ON "InventoryStock";
CREATE TRIGGER "InventoryStock_warehouseId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","warehouseId" ON "InventoryStock" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('warehouseId','Warehouse');
DROP TRIGGER IF EXISTS "InventoryStock_productId_tenant_guard" ON "InventoryStock";
CREATE TRIGGER "InventoryStock_productId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","productId" ON "InventoryStock" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('productId','Product');
DROP TRIGGER IF EXISTS "JournalEntry_fiscalPeriodId_tenant_guard" ON "JournalEntry";
CREATE TRIGGER "JournalEntry_fiscalPeriodId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","fiscalPeriodId" ON "JournalEntry" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('fiscalPeriodId','FiscalPeriod');
DROP TRIGGER IF EXISTS "JournalLine_journalEntryId_tenant_guard" ON "JournalLine";
CREATE TRIGGER "JournalLine_journalEntryId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","journalEntryId" ON "JournalLine" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('journalEntryId','JournalEntry');
DROP TRIGGER IF EXISTS "JournalLine_accountId_tenant_guard" ON "JournalLine";
CREATE TRIGGER "JournalLine_accountId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","accountId" ON "JournalLine" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('accountId','Account');
DROP TRIGGER IF EXISTS "PurchaseOrder_vendorId_tenant_guard" ON "PurchaseOrder";
CREATE TRIGGER "PurchaseOrder_vendorId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","vendorId" ON "PurchaseOrder" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('vendorId','Vendor');
DROP TRIGGER IF EXISTS "PurchaseLine_purchaseOrderId_tenant_guard" ON "PurchaseLine";
CREATE TRIGGER "PurchaseLine_purchaseOrderId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","purchaseOrderId" ON "PurchaseLine" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('purchaseOrderId','PurchaseOrder');
DROP TRIGGER IF EXISTS "PurchaseLine_productId_tenant_guard" ON "PurchaseLine";
CREATE TRIGGER "PurchaseLine_productId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","productId" ON "PurchaseLine" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('productId','Product');
DROP TRIGGER IF EXISTS "SalesOrder_customerId_tenant_guard" ON "SalesOrder";
CREATE TRIGGER "SalesOrder_customerId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","customerId" ON "SalesOrder" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('customerId','Customer');
DROP TRIGGER IF EXISTS "SalesLine_salesOrderId_tenant_guard" ON "SalesLine";
CREATE TRIGGER "SalesLine_salesOrderId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","salesOrderId" ON "SalesLine" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('salesOrderId','SalesOrder');
DROP TRIGGER IF EXISTS "SalesLine_productId_tenant_guard" ON "SalesLine";
CREATE TRIGGER "SalesLine_productId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","productId" ON "SalesLine" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('productId','Product');
DROP TRIGGER IF EXISTS "PayrollEntry_payrollRunId_tenant_guard" ON "PayrollEntry";
CREATE TRIGGER "PayrollEntry_payrollRunId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","payrollRunId" ON "PayrollEntry" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('payrollRunId','PayrollRun');
DROP TRIGGER IF EXISTS "PayrollEntry_employeeId_tenant_guard" ON "PayrollEntry";
CREATE TRIGGER "PayrollEntry_employeeId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","employeeId" ON "PayrollEntry" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('employeeId','Employee');
DROP TRIGGER IF EXISTS "ProjectTask_projectId_tenant_guard" ON "ProjectTask";
CREATE TRIGGER "ProjectTask_projectId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","projectId" ON "ProjectTask" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('projectId','Project');
DROP TRIGGER IF EXISTS "BillOfMaterials_productId_tenant_guard" ON "BillOfMaterials";
CREATE TRIGGER "BillOfMaterials_productId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","productId" ON "BillOfMaterials" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('productId','Product');
DROP TRIGGER IF EXISTS "ManufacturingOrder_productId_tenant_guard" ON "ManufacturingOrder";
CREATE TRIGGER "ManufacturingOrder_productId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","productId" ON "ManufacturingOrder" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('productId','Product');
DROP TRIGGER IF EXISTS "ManufacturingOrder_bomId_tenant_guard" ON "ManufacturingOrder";
CREATE TRIGGER "ManufacturingOrder_bomId_tenant_guard" BEFORE INSERT OR UPDATE OF "tenantId","bomId" ON "ManufacturingOrder" FOR EACH ROW EXECUTE FUNCTION enforce_same_tenant_reference('bomId','BillOfMaterials');
