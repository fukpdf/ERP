# Comprehensive Database Strategy & Architectural Blueprint

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Oracle-Class Relational Data Architecture on PostgreSQL 16+  
**Phase 0 Constraint:** Forensic Audit & Strategy ONLY. No database migration is performed in Phase 0.

---

## 1. Forensic Audit of Current Database State

| Subsystem | Inspected Reality in Repository | Architectural Finding |
| :--- | :--- | :--- |
| **Active Runtime Persistence** | `artifacts/erp-preview/imported/data/db.json` | Standalone JSON file with atomic temporary swap on save. Sufficient for the current local preview, but non-scalable, non-relational, and ephemeral in containerized cloud environments. |
| **Drizzle ORM Package** | `lib/db/src/schema/index.ts` | Schema file contains `export {}` (0 tables defined). Connection helper in `src/index.ts` has a mock proxy fallback when `DATABASE_URL` is unconfigured. |
| **Prisma Mentions** | `artifacts/erp-preview/imported/package.json` | Package declares `@prisma/client` and `prisma` dependencies, but **zero `.prisma` schema files** exist in the repository tree. |
| **SQL Migrations** | Whole repository | **Zero SQL migration scripts** exist. All documented "Stage 50 PostgreSQL catalog" tables were omitted from the imported repository. |

---

## 2. Canonical Database Engine: PostgreSQL 16+

The platform standardizes on **PostgreSQL 16+** as its foundational relational database engine due to its enterprise ACID guarantees, rich JSONB support, robust Row-Level Security (RLS), declarative partitioning, and high-performance connection scaling.

### Oracle-Class Relational Invariants:
1. **Foreign Key Integrity:** Every child relationship must enforce explicit foreign key constraints (`ON DELETE RESTRICT` or `ON DELETE CASCADE` where aggregate lifecycle demands it). Dangling records are strictly prohibited.
2. **Deterministic Constraint Naming:** All constraints conform to strict naming conventions:
   - Primary Keys: `pk_[table_name]`
   - Foreign Keys: `fk_[table_name]_[referenced_table]_[column]`
   - Unique Constraints: `uq_[table_name]_[column_list]`
   - Check Constraints: `chk_[table_name]_[condition]`
   - Indexes: `idx_[table_name]_[column_list]`
3. **Compound Tenant Indexing:** In shared-schema multi-tenant tables, all primary and secondary indexes **must prefix the tenant identifier**:
   `CREATE INDEX idx_sales_orders_tenant_status ON sales_orders (tenant_id, legal_entity_id, status, created_at DESC);`
4. **Transaction Isolation Levels:**
   - Default Operations: `READ COMMITTED`.
   - Inventory Depletion & Financial Voucher Balancing: Explicit row-level locking via `SELECT ... FOR UPDATE` within an atomic transaction.
   - High-Contention Period Closes & Tax Runs: Executed under `REPEATABLE READ` or `SERIALIZABLE` isolation with automated retry handlers for serialization anomalies.

---

## 3. Multi-Tenant Row-Level Security (RLS) Architecture

For shared-schema deployments (Profiles A, B, and C), PostgreSQL Row-Level Security guarantees cross-tenant isolation at the database engine level, ensuring that an application-layer software bug can never leak data across tenants:

```sql
-- 1. Enable RLS on every tenant-scoped table
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders FORCE ROW LEVEL SECURITY;

-- 2. Define tenant isolation policy using session context variable
CREATE POLICY tenant_isolation_policy ON sales_orders
    FOR ALL
    TO erp_application_role
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
```

### Connection Pool Integration:
Before running any query on a pooled connection, the database adapter sets the transaction-scoped tenant context:
```sql
BEGIN;
SELECT set_config('app.current_tenant_id', $1, true); -- true = transaction-local
-- Execute domain operations
COMMIT;
```

---

## 4. Soft Deletion vs. Ledger Immutability

The platform enforces a strict dichotomy based on data nature:

1. **Master & Dimensional Data (Soft Delete Permitted):**
   - Entities like `products`, `customers`, `warehouses`, and `tax_codes` include `deleted_at TIMESTAMPTZ`, `deleted_by UUID`.
   - Soft-deleted entities are filtered from active operational lookups via partial indexes:
     `CREATE INDEX idx_products_active ON products (tenant_id, sku) WHERE deleted_at IS NULL;`
2. **Transactional & Ledger Data (SOFT DELETE STRICTLY FORBIDDEN):**
   - Tables like `gl_entries`, `stock_ledger_entries`, `sales_invoices`, and `audit_logs` **prohibit soft deletion and hard deletion**.
   - Attempting to issue a `DELETE` or alter `deleted_at` on ledger tables is blocked by database triggers and revoked role privileges.
   - Adjustments must be performed through reversing transactions (e.g., Credit Memos, Reversing Journals).

---

## 5. Backup, Disaster Recovery & High Availability

1. **Continuous Write-Ahead Log (WAL) Archiving:**
   - Real-time WAL streaming to redundant cloud object storage ensures Point-in-Time Recovery (PITR) with an RPO of $< 1\text{ minute}$.
2. **Automated Daily Snapshots:**
   - Full automated encrypted database snapshots taken daily, retained for 30 days, and replicated to a geographically distinct secondary cloud region.
3. **Disaster Recovery Drills:**
   - Automated sandbox restore pipelines execute weekly validation tests to verify backup snapshot integrity and measure recovery time (RTO target: $< 15\text{ minutes}$).
