# Universal ERP Product Constitution

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Authority:** Immutable Product Charter  
**Scope:** Applies to all modules, architectures, APIs, schemas, and operational designs.

---

## 1. Preamble & Foundational Doctrine

This ERP platform is engineered not as a single company's bespoke tool, but as a **Universal Enterprise Resource Planning Operating System**. The platform must be capable of orchestrating complex international commerce, multi-jurisdiction compliance, and deep operational workflows across arbitrary industries, legal structures, and scale tiers—from single-proprietor businesses to multinational conglomerates.

**The Core Tenet:** *The platform shall never encode single-company or single-country assumptions into its foundational architecture.*

---

## 2. Universal Dimensionality Principles

Every core entity, transaction, and operational record in the platform must natively support multidimensional organizational context.

### 2.1 Multi-Entity Hierarchy
The platform establishes a strict, recursive organizational hierarchy:
```
Tenant (Data Isolation & Subscription Boundary)
 └── Group Holding / Enterprise Consortium
      └── Legal Entity / Company (Distinct Tax ID, Chart of Accounts, Base Currency)
           └── Division / Operating Unit (Autonomous P&L)
                └── Branch / Facility / Office (Physical Jurisdiction)
                     ├── Cost Center / Department (Managerial Accounting)
                     └── Warehouse / Location (Physical Inventory Boundary)
```
- A single Tenant can operate unlimited legal entities across multiple sovereign states.
- Inter-company transactions (sales, transfers, consolidations, cost allocations) must be first-class primitives with automatic elimination entries.

### 2.2 Multi-Jurisdictional Fiscal & Tax Architecture
- **Tax Agnosticism:** Tax engines must be declarative and rule-driven. The system shall support:
  - Value Added Tax (VAT / IVA / TVA) with input/output offset rules.
  - Goods and Services Tax (GST / HST) with federal/provincial splits.
  - State and Local Sales Tax with nexus-based tax calculation.
  - Withholding Taxes (WHT) at invoice or payment level.
  - Mandatory E-Invoicing schemes (e.g., Peppol, ZATCA, FacturaE, SII, KSeF).
- **Fiscal Calendar Independence:** Each legal entity may define independent fiscal years (e.g., Jan-Dec, Apr-Mar, 4-4-5 retail calendars) with closed periods, adjustments, and multiple open periods.

### 2.3 Universal Currency & Monetary Precision
- **Currency Triplets:** Every financial transaction must record:
  1. *Transaction Currency:* Currency negotiated with the external party.
  2. *Functional / Base Currency:* Sovereign reporting currency of the booking legal entity.
  3. *Group / Reporting Currency:* Standard consolidation currency of the enterprise group.
- **Precision Guarantee:** All monetary amounts must be stored with high fixed-point precision (minimum 18 total digits, 4 decimal places for base amounts; 6 decimal places for unit prices and FX rates) to prevent cumulative rounding distortion. Float/Double types are strictly prohibited in the financial domain.
- **Real-Time FX & Revaluation:** Automated rate feeds, triangulated conversions, and period-end unrealized gain/loss revaluations are mandatory.

### 2.4 Multi-Language, Locale, and RTL Equality
- Internationalization is not an afterthought or presentation patch; it is an architectural invariant.
- **Content vs Interface:** The system distinguishes UI translations (interface strings) from dynamic content translations (product names, category descriptions, invoice terms in multiple languages).
- **RTL as a First-Class Citizen:** Right-to-Left writing systems (Arabic, Hebrew, Persian, Urdu) receive identical visual hierarchy, spatial balance, and usability engineering as Left-to-Right scripts.
- **Calendar & Time Zone Normalization:** All temporal data must be captured and stored in UTC timestamps (`TIMESTAMPTZ`). Display logic respects tenant, entity, branch, or user timezone context. Non-Gregorian calendars (Hijri, Solar Hijri) must be supported.

---

## 3. Operational Agnosticism

The platform must accommodate disparate operational and fulfillment paradigms without forcing uniform workflows:

| Paradigm | Supported Operating Models | Architectural Requirement |
| :--- | :--- | :--- |
| **Manufacturing** | Make-to-Stock (MTS), Make-to-Order (MTO), Configure-to-Order (CTO), Assemble-to-Order (ATO), Process Manufacturing | Dynamic multi-level Bill of Materials (BOM), scrap factors, routing operations, work center capacities. |
| **Supply Chain** | Centralized warehousing, drop-shipping, consignment stock, cross-docking, 3PL integration | Multi-echelon inventory, serialized tracking, lot/batch control, expiration dating, reorder automation. |
| **Commercial** | B2B wholesale, B2C retail, subscription SaaS, project milestones, retainers | Configurable pricing books, tier discounts, credit limits, contracts, automated billing schedules. |
| **Services** | Professional services, field service dispatch, time & expense billing, milestone deliverables | Timesheet approvals, billable utilization rates, expense receipts, project task trees. |

---

## 4. Scalability from Startup to Global Enterprise

The platform must never require an architectural rewrite when a customer grows:

1. **Profile A (Solo / Micro / Small Business):**
   - Single legal entity, single warehouse, simplified single-step workflows.
   - Low cognitive load: Advanced options hidden behind intelligent defaults.
   - Minimal startup cost and instantaneous response.
2. **Profile B (Mid-Market / Growing Business):**
   - Multiple branches, multi-currency commerce, basic approval workflows, delegated roles.
3. **Profile C (Large Enterprise / Multinational):**
   - Dozens of legal entities, hundreds of warehouses, complex Separation of Duties (SoD), automated multi-tier approval hierarchies, compliance audit trails, high throughput batch processing.
4. **Adaptive Activation:** Complexity is unlocked through declarative configuration, feature flags, and module enablement—never through bespoke forks or code mutations.

---

## 5. Architectural Quality Standards (Oracle-Class Tenets)

1. **Transaction Integrity:** ACID guarantees across financial, inventory, and order state mutations. Double-entry bookkeeping is mathematically non-negotiable: Debits must equal Credits in every balanced voucher.
2. **Immutability of Audit Trails:** No financial or compliance record shall ever be deleted with a raw SQL `DELETE`. Historical transactions are adjusted through reversing entries (credit memos, inventory adjustments, correcting journal vouchers).
3. **Auditability by Construction:** Every mutation captures: `Actor`, `Tenant`, `Entity`, `Timestamp (UTC)`, `Previous State Snapshot`, `New State Snapshot`, `Correlation ID`, and `Reason/Authority`.
4. **Zero Vendor / AI Lock-in:** The platform core shall never hard-code dependency on proprietary AI vendors, single cloud providers, or closed third-party engines. Pluggable abstractions govern all peripheral services.

---

## 6. Constitution Enforcement & Review

- Any pull request, architectural decision, or module design that violates these constitutional tenets is considered an **architectural defect** and shall not be merged.
- Architectural exceptions must be approved unanimously by the Principal Architecture Board and recorded in `docs/DECISIONS.md`.
