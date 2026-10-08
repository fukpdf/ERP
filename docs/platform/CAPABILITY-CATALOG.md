# Foundational Capability Catalog

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Standardized Capability Baseline for the Universal ERP Platform  
**Scope:** Initial Catalog of Core & Enterprise Capabilities

---

## 1. Catalog Overview

This catalog defines the baseline taxonomy of **175+ foundational capabilities** across primary business domains. This catalog serves as the architectural blueprint for capability IDs, names, categories, and licensing tiers.

---

## 2. Capability Catalog by Domain

### 2.1 Identity, Tenancy & Security (`sec.*`)
| Capability ID | Name | Category | Tier | Description |
| :--- | :--- | :--- | :---: | :--- |
| `sec.tenant.multi_org` | Multi-Organization Hierarchy | Foundational | Standard | Enables group enterprise, legal entity, and branch hierarchies. |
| `sec.auth.password_mfa` | Multi-Factor Authentication (MFA) | Security | Standard | TOTP and WebAuthn/FIDO2 hardware security key support. |
| `sec.auth.sso_saml_oidc` | Enterprise SSO (SAML 2.0 & OIDC) | Security | Enterprise | Direct federation with Okta, Azure AD, Ping, and Google Workspace. |
| `sec.rbac.granular_roles` | Granular Hierarchical RBAC | Security | Standard | Role inheritance, custom role creator, and action-level permissions. |
| `sec.rbac.sod_enforcement` | Separation of Duties (SoD) Engine | Compliance | Enterprise | Enforces conflicting permission barriers and dual-control sign-offs. |
| `sec.rbac.delegation_time` | Time-Bounded Delegation | Security | Enterprise | Temporary authority delegation with automated expiration timers. |
| `sec.rbac.field_level_acl` | Field-Level Access Control | Security | Enterprise | Restricts visibility and editability of individual sensitive columns. |
| `sec.audit.immutable_chain` | Immutable Cryptographic Audit Chain | Compliance | Enterprise | Append-only audit log with SHA-256 HMAC hash chaining. |
| `sec.data.field_encryption` | Field-Level Envelope Encryption | Data | Enterprise | AES-256-GCM encryption of sensitive PII (Tax IDs, bank IBANs). |
| `sec.data.pii_masking` | Dynamic PII Data Masking | Compliance | Enterprise | Masks sensitive records based on user clearance level. |

### 2.2 Financial Management & Accounting (`fin.*`)
| Capability ID | Name | Category | Tier | Description |
| :--- | :--- | :--- | :---: | :--- |
| `fin.gl.double_entry` | Core Double-Entry General Ledger | Core | Standard | Chart of accounts, journal vouchers, automated trial balance. |
| `fin.gl.multi_currency` | Multi-Currency & Revaluation | Financial | Standard | Real-time FX tracking, triangulated conversions, unrealized FX revaluation. |
| `fin.gl.period_close` | Fiscal Period Close & Locking | Financial | Standard | Hard and soft monthly/quarterly/annual accounting period locks. |
| `fin.gl.intercompany_elim` | Intercompany Balancing & Eliminations | Financial | Enterprise | Automated offset entries for cross-entity internal commerce. |
| `fin.ar.customer_aging` | Accounts Receivable & Aging Analysis | Financial | Standard | Detailed customer aging buckets (30/60/90/120+ days). |
| `fin.ar.auto_dunning` | Automated Dunning Escalation | Financial | Enterprise | Multi-stage overdue payment reminders and credit hold automation. |
| `fin.ap.vendor_aging` | Accounts Payable & Payment Scheduling| Financial | Standard | Vendor liabilities tracking, discount terms, and aging reports. |
| `fin.ap.3way_matching` | Automated 3-Way Matching | Financial | Enterprise | Tolerance-checked matching between PO, GRN, and Vendor Invoice. |
| `fin.ap.payment_runs` | Electronic Payment Runs (SEPA/NACHA)| Financial | Enterprise | Automated XML/ACH batch generation for commercial bank disbursements. |
| `fin.tax.flexible_engine` | Jurisdictional Tax Rules Engine | Financial | Standard | Declarative tax calculation for VAT, GST, and State/Local Sales Tax. |
| `fin.tax.eu_reverse_charge`| EU VAT Reverse Charge Protocol | Tax/Locale | Standard | Automated reverse charge accounting for cross-border EU trade. |
| `fin.tax.us_sales_tax` | US Nexus-Based Sales Tax | Tax/Locale | Enterprise | Address-level jurisdiction lookup and tax holiday enforcement. |
| `fin.einvoice.peppol` | Peppol E-Invoicing Gateway | Compliance | Enterprise | UBL/XML compliant digital invoice transmission across Peppol network. |
| `fin.bank.camt_parser` | Bank Statement Import (CAMT.053/OFX) | Financial | Enterprise | Automated ISO 20022 bank statement ingestion and reconciliation. |
| `fin.fixed_assets.depr` | Fixed Asset Register & Depreciation | Financial | Enterprise | Straight-line, declining balance, and MACRS asset depreciation runs. |

### 2.3 Supply Chain & Inventory (`scm.*`)
| Capability ID | Name | Category | Tier | Description |
| :--- | :--- | :--- | :---: | :--- |
| `scm.inv.multi_warehouse` | Multi-Warehouse & Bin Management | SCM | Standard | Hierarchical storage locations (Site -> Warehouse -> Aisle -> Bin). |
| `scm.inv.lot_batch_track` | Lot & Batch Tracking with Expiry | SCM | Enterprise | Traceability for perishable goods, chemicals, and pharmaceuticals. |
| `scm.inv.serial_number` | Individual Serial Number Tracking | SCM | Enterprise | Unit-level lifecycle tracking for electronics and capital equipment. |
| `scm.inv.reorder_auto` | Automated Reorder Level Calculations | SCM | Standard | Safety stock alerts, lead-time offsets, and min-max replenishments. |
| `scm.inv.perpetual_fifo` | Perpetual Inventory Valuation (FIFO) | SCM | Standard | Real-time Cost of Goods Sold (COGS) allocation on item dispatch. |
| `scm.inv.cycle_counting` | ABC Cycle Counting & Discrepancies | SCM | Enterprise | Scheduled rolling physical inventory counts without plant shutdown. |
| `scm.proc.po_workflow` | Multi-Tier Purchase Order Approvals | SCM | Standard | Approval matrix based on purchase order amount and cost center. |
| `scm.proc.rfq_portal` | Vendor RFQ Portal & Bid Comparison | SCM | Enterprise | Collaborative vendor bidding and landed-cost comparison matrix. |
| `scm.proc.landed_cost` | Landed Cost Allocation | SCM | Enterprise | Freight, customs duties, and insurance capitalization into inventory cost. |

### 2.4 Sales, CRM & Commerce (`crm.*` & `sales.*`)
| Capability ID | Name | Category | Tier | Description |
| :--- | :--- | :--- | :---: | :--- |
| `sales.order.standard` | Standard Sales Order Management | Sales | Standard | Multi-line sales orders, pricing, discount limits, and tax sums. |
| `sales.price.tiered_matrix`| Tiered Price Books & Volume Discounts| Sales | Standard | Quantity breaks, customer price groups, and promotional validity. |
| `sales.credit.limit_check` | Real-Time Customer Credit Checks | Sales | Enterprise | Automated order hold on credit limit breach or past-due aging. |
| `crm.pipeline.kanban` | Opportunity & Deal Pipeline Kanban | CRM | Standard | Drag-and-drop stage progression, probability-weighted revenue. |
| `sales.contract.blanket` | Blanket Sales Agreements & Call-Offs | Sales | Enterprise | Long-term volume contracts with progressive releases and drawdown. |

### 2.5 Industry Verticals (`ind.*`)
| Capability ID | Name | Category | Tier | Description |
| :--- | :--- | :--- | :---: | :--- |
| `ind.health.surgical_count`| Surgical Sponge & Instrument Counts | Healthcare | Enterprise | Operating room counting protocols with dual nurse verification. |
| `ind.auto.vin_decoder` | Automotive VIN & Parts Fitment Engine| Automotive | Enterprise | Vehicle Identification Number decoding and OEM parts interchange. |
| `ind.mfg.bioreactor_batch` | Regulated Bioprocess Batch Records | Pharma/Bio | Enterprise | FDA 21 CFR Part 11 electronic batch records and signatures. |
| `ind.retail.pos_offline` | Point of Sale (POS) Offline Sync | Retail | Enterprise | Fast in-store barcode checkout with resilient local-first offline cache. |
