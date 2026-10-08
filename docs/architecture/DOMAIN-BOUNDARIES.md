# Domain Boundaries & Entity Ownership

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Explicit Domain Boundaries, Entity Ownership, and Shared Kernel  
**Standard:** Domain-Driven Design (DDD) Bounded Contexts

---

## 1. Domain Ownership Matrix

In a universal enterprise ERP, ambiguity over which module owns an entity or transaction causes state corruption, circular dependencies, and tangled data models. Every data table and business entity has exactly **one authoritative owning domain**. All other domains access that entity either via read-only views, replicated projections, or contract queries.

| Domain / Bounded Context | Authoritative Owned Entities & Aggregates | Boundary Invariants |
| :--- | :--- | :--- |
| **Identity, Org & Tenancy** | `Tenant`, `GroupEnterprise`, `LegalEntity`, `Branch`, `CostCenter`, `User`, `Role`, `Permission`, `Delegation` | Enforces structural organizational hierarchy and baseline security credentials. |
| **General Ledger (GL)** | `ChartOfAccounts`, `AccountingPeriod`, `FiscalYear`, `JournalVoucher`, `GeneralLedgerEntry`, `CurrencyExchangeRate` | Double-entry balance: Debits == Credits. Closed periods cannot be modified. |
| **Accounts Receivable (AR)** | `CustomerLedgerEntry`, `SalesInvoice`, `CreditMemo`, `CustomerPayment`, `DunningRecord` | Maintains customer balance and aging schedules. Posts balanced journals to GL. |
| **Accounts Payable (AP)** | `VendorLedgerEntry`, `VendorBill`, `DebitMemo`, `VendorPayment`, `PaymentProposal` | Maintains vendor balances and payment disbursements. Posts balanced journals to GL. |
| **Sales & CRM** | `Lead`, `Opportunity`, `CustomerAccount`, `PriceBook`, `SalesQuote`, `SalesOrder`, `CustomerContract` | Price validity rules, discount limits, customer credit limit checks. |
| **Procurement & SCM** | `VendorMaster`, `PurchaseRequisition`, `RFQ`, `PurchaseOrder`, `GoodsReceiptNote` | 3-way matching rules (PO quantity/price vs GRN quantity vs Vendor Bill amount). |
| **Inventory & Warehousing** | `ItemMaster`, `Warehouse`, `StorageBin`, `StockLedgerEntry`, `StockReservation`, `LotBatch`, `SerialNumber` | Quantity on Hand >= 0 (unless backorders explicitly enabled). Perpetual inventory valuation. |
| **Manufacturing** | `BillOfMaterials (BOM)`, `WorkCenter`, `Routing`, `ProductionOrder`, `WorkOrder`, `ScrapLog` | Material consumption balances, capacity allocation. |
| **HR & Payroll** | `Employee`, `EmploymentContract`, `Position`, `Timesheet`, `PayStructure`, `PayrollRun`, `Payslip` | PII privacy compliance, statutory deductions, tax withholdings. |
| **Projects** | `Project`, `Milestone`, `Task (WBS)`, `ProjectBudget`, `TimeAndExpenseLog` | Budget burn tracking, capitalization vs expensing rules. |

---

## 2. Cross-Domain Intersection Points & Handshakes

### 2.1 Sales Order to Invoice to General Ledger
```
[Sales Module]
  SalesOrder Confirmed
      │ (Domain Event: SalesOrderConfirmedEvent)
      ▼
[Inventory Module]
  Creates StockReservation
      │
      ▼ (Fulfillment: GoodsDispatchedEvent)
[Accounts Receivable]
  Generates SalesInvoice & CustomerLedgerEntry
      │
      ▼ (Contract Call or Outbox Event: InvoicePostedEvent)
[General Ledger]
  Creates balanced JournalVoucher:
    DR: Accounts Receivable (1100)
    CR: Revenue - Product Sales (4000)
    CR: Output VAT / Sales Tax Payable (2200)
```

### 2.2 Purchase Order to Goods Receipt to Accounts Payable
```
[Procurement Module]
  PurchaseOrder Approved
      │ (Goods Received)
      ▼
[Inventory Module]
  Creates GoodsReceiptNote (GRN)
  Increments StockLedgerEntry
  Posts GRN Accrual to GL:
    DR: Inventory Asset (1400)
    CR: Uninvoiced Goods Received Accrual (2050)
      │
      ▼ (Vendor Bill Received)
[Accounts Payable]
  Executes 3-Way Match (PO vs GRN vs VendorBill)
  Generates VendorBill & VendorLedgerEntry
  Reverses Accrual & Books Payable in GL:
    DR: Uninvoiced Goods Received Accrual (2050)
    DR: Input VAT / Tax Recoverable (1300)
    CR: Accounts Payable - Trade (2000)
```

---

## 3. Shared Kernel Specifications

To prevent redundant definitions while maintaining domain separation, the platform defines a minimal **Shared Kernel** in `@erp/core` containing universal value objects and foundational descriptors:

1. **`Money`:** Encapsulates numeric amount with fixed-point decimal and ISO 4217 currency code. Prohibits currency mixing without explicit exchange rates.
2. **`UnitOfMeasure (UOM)`:** Standard units (Each, Kilogram, Meter, Liter, Hour) with conversion factor matrices.
3. **`PostalAddress`:** Standard international multi-line address, postal code, city, sub-division, and ISO 3166-1 alpha-2 country code.
4. **`TaxCode`:** Universal tax identification schema representing jurisdictional tax categories and rates.
5. **`PartyReference`:** Universal polymorphic reference to legal entities, individual persons, customers, or vendors (`{ partyId: string, partyType: 'organization' | 'individual' }`).
