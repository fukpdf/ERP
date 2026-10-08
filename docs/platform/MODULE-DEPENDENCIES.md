# Enterprise Module Dependency Matrix

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Explicit Inter-Module Dependency Mapping & Resolution  
**Rule:** Mandatory Declaration in Module Manifests; Zero Hidden Coupling

---

## 1. Dependency Classification

Dependencies between ERP modules are classified into three strict categories:

1. **Hard Dependency (Compile-Time / Boot-Time Mandatory):**
   - Module A *cannot boot or function* without Module B.
   - Example: `module-accounts-receivable` has a hard dependency on `module-general-ledger`.
2. **Soft Dependency (Feature-Time / Optional Extension):**
   - Module A functions normally in standalone mode, but unlocks extended capabilities if Module B is also present.
   - Example: `module-sales` works independently; if `module-inventory` is present, it unlocks real-time Available-to-Promise (ATP) stock checks.
3. **Event-Driven Dependency (Asynchronous Decoupled):**
   - Module A emits a public domain event; Module B consumes it without Module A possessing any knowledge of Module B's existence.
   - Example: `module-sales` emits `SalesOrderConfirmedEvent`; `module-notifications` sends customer email.

---

## 2. Canonical Domain Dependency Matrix

The table below defines the authoritative dependency relationships across the core ERP domains:

| Module Name | Hard Dependencies (Required) | Soft / Extension Dependencies (Optional) | Events Consumed |
| :--- | :--- | :--- | :--- |
| **`@erp/core`** | *None* | *None* | *None* |
| **`@erp/platform-tenancy`** | `core` | *None* | *None* |
| **`@erp/platform-auth`** | `core`, `platform-tenancy` | *None* | *None* |
| **`@erp/platform-rbac`** | `core`, `platform-tenancy`, `platform-auth` | *None* | `UserCreatedEvent` |
| **`@erp/module-general-ledger`** | `core`, `platform-tenancy`, `platform-rbac` | *None* | `PeriodClosedEvent` |
| **`@erp/module-accounts-receivable`** | `core`, `general-ledger` | `platform-workflow` | `SalesInvoiceCreatedEvent` |
| **`@erp/module-accounts-payable`** | `core`, `general-ledger` | `platform-workflow` | `VendorBillCreatedEvent` |
| **`@erp/module-inventory`** | `core`, `platform-tenancy` | `general-ledger` (for perpetual valuation) | `GoodsDispatchedEvent`, `GoodsReceiptEvent` |
| **`@erp/module-procurement`** | `core`, `inventory`, `accounts-payable` | `platform-workflow` (approval hierarchy) | `RequisitionApprovedEvent` |
| **`@erp/module-sales`** | `core`, `accounts-receivable` | `inventory` (ATP check), `crm` (pipelines) | `CustomerCreditLimitChangedEvent` |
| **`@erp/module-manufacturing`** | `core`, `inventory` | `general-ledger` (WIP accounting), `projects` | `MaterialScrappedEvent` |
| **`@erp/module-hr-payroll`** | `core`, `general-ledger` | `projects` (billable timesheets) | `TimesheetApprovedEvent` |
| **`@erp/module-projects`** | `core`, `general-ledger` | `sales` (milestone billing), `procurement` | `ProjectMilestoneCompletedEvent` |

---

## 3. Dependency Validation Algorithm

When a tenant requests to enable a module via the management API:

```
Function EnableModule(tenantId, targetModule):
    1. Parse targetModule.manifest.dependencies
    2. For each hardDependency in targetModule.manifest.dependencies:
          If NOT isModuleEnabled(tenantId, hardDependency):
              Prompt or automatically resolve dependency cascade:
              EnableModule(tenantId, hardDependency)
    3. Run schema verification for targetModule on tenant database
    4. Register targetModule routes, event consumers, and UI slots
    5. Emit ModuleEnabledEvent(tenantId, targetModule.id)
```
