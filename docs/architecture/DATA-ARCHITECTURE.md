# Universal ERP Data Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** High-Integrity, Multi-Tenant, Relational Data Platform  
**Standard:** Double-Entry Relational Rigor with CQRS Analytical Projections

---

## 1. Data Modeling Philosophy & Hybrid CQRS

The Universal ERP data platform distinguishes between **Transactional Mutation (OLTP)** and **Analytical Consumption (OLAP)**:

```
[ Command / Write Path ]               [ Query / Read Path ]
          │                                      ▲
          ▼ (Strict 3NF ACID)                    │ (Optimized Projections)
┌─────────────────────────────┐        ┌─────────────────────────────┐
│  Core Relational Tables     │        │  Read Projections / Views   │
│  (sales_orders, line_items, │        │  (denormalized customer     │
│   gl_entries, stock_ledger) │        │   aging, real-time KPI      │
│  Enforced by PK/FK & RLS    │        │   dashboards, materialized) │
└──────────────┬──────────────┘        └──────────────▲──────────────┘
               │                                      │
               ▼ (Transactional Outbox)               │
          [ Domain Events ] ──────────────────────────┘
```

1. **OLTP Core (Strict Third Normal Form - 3NF):**
   - Eliminates data redundancy, prevents orphan records, guarantees ACID transaction integrity.
   - Foreign keys, check constraints, and non-null rules strictly enforced at the database engine level.
2. **OLAP & Reporting (Read-Optimized Projections):**
   - High-throughput reporting and dashboards consume denormalized projections updated asynchronously via domain events or PostgreSQL materialized views with background refresh.
   - Prevents long-running analytics queries from acquiring locks on active transactional tables.

---

## 2. Multi-Tenant Data Isolation Strategy

The platform provides a 3-tier adaptive data isolation model matching tenant scale and compliance mandates:

```
Tier 1: Shared Database, Shared Schema (Default - Profiles A & B)
   ├── Every table contains `tenant_id UUID NOT NULL`
   └── Enforced by PostgreSQL Row-Level Security (RLS) policies

Tier 2: Shared Database, Dedicated Schema (Mid-Market / Compliance - Profile C)
   ├── Each tenant is assigned a dedicated PostgreSQL schema: `tenant_[uuid]`
   └── Shared platform tables remain in `public` schema

Tier 3: Dedicated Database Instance (Large Enterprise / Government - Profiles D & E)
   ├── Physically isolated PostgreSQL database cluster
   └── Encrypted with customer-managed encryption keys (CMEK)
```

---

## 3. Immutability of Ledgers & Auditing

### 3.1 Financial & Inventory Immutability
- In the General Ledger (`gl_entries`) and Stock Ledger (`stock_ledger_entries`), records are **strictly append-only**.
- Raw SQL `UPDATE` and `DELETE` commands are permanently revoked for the application database role on ledger tables.
- Corrections must be performed through reversing transactions (e.g., Credit Memos, Voided Checks, Inventory Reconciliation Adjustments).

### 3.2 Audit Log Hash Chaining
Every write operation across audited tables triggers an insert into the append-only `audit_logs` table:
$$\text{Hash}_n = \text{HMAC-SHA256}(\text{Hash}_{n-1} + \text{Timestamp} + \text{TenantId} + \text{ActorId} + \text{RecordPayload})$$
This cryptographic hash chain provides verifiable tamper-evidence for compliance audits (SOC 2, ISO 27001).

---

## 4. Temporal Data & Effective Dating (SCD Type 2)

Entities whose attributes change over time without invalidating historical records (such as Employee Salaries, Price Books, Sales Tax Rates, and Exchange Rates) utilize **Slowly Changing Dimension Type 2 (SCD2)** with temporal validity windows:

```sql
CREATE TABLE price_book_entries (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    product_id UUID NOT NULL,
    price_cents BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ, -- NULL indicates current active rate
    is_current BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT chk_price_dates CHECK (valid_to IS NULL OR valid_to > valid_from)
);
CREATE INDEX idx_price_effective ON price_book_entries (tenant_id, product_id, valid_from, valid_to);
```

---

## 5. Structured vs Semi-Structured JSONB Policy

To prevent schema rot while allowing flexible extensibility:
- **Core Relational Attributes (STRICT SQL COLUMNS):** Identifiers, monetary amounts, foreign keys, timestamps, statuses, quantities, codes, and tax rates **must** be native SQL columns.
- **Semi-Structured Metadata (JSONB ALLOWED):** Third-party webhook payloads, user UI preferences, unstructured custom attributes, and raw audit snapshot diffs are stored in validated `JSONB` columns with JSON Schema validation.
- JSONB columns must **never** be used to store relational foreign keys or unindexed queryable search predicates.
