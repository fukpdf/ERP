# Enterprise Scalability & High Availability Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Linear Horizontal Scaling from Startup to Global Enterprise  
**Availability Objective:** 99.99% Availability with RPO < 1 min, RTO < 15 min

---

## 1. Horizontal Scalability Principles

The Universal ERP platform adheres to a **Shared-Nothing Stateless Compute Architecture**:

```
                       [ Global Anycast CDN & Load Balancer ]
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
   [ App Worker Node 1 ]        [ App Worker Node 2 ]        [ App Worker Node N ]
   (Stateless Node.js)          (Stateless Node.js)          (Stateless Node.js)
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
           [ PgBouncer Connection Pooler ]       [ Distributed Redis Cluster ]
                     │                           (Sessions, L2 Cache, Locks)
                     ▼
       [ Primary PostgreSQL Instance ] ──► Streaming ──► [ Read Replicas ]
       (ACID Writes, Primary State)       Replication     (Reporting, Queries)
```

1. **Stateless Application Servers:** Compute nodes store zero session state in local memory or local disk. User sessions are verified via cryptographically signed JWTs and checked against distributed Redis caches. Nodes can be dynamically autoscaled (0 to 1,000+ instances) without connection interruption.
2. **Database Connection Multiplexing:** PostgreSQL connection overhead is mitigated using `PgBouncer` operating in transaction pooling mode. This allows thousands of concurrent application fibers to share a compact pool of physical database connections.
3. **Graceful Autoscaling & Drain:** During scale-down or redeployments, SIGTERM handlers allow in-flight HTTP requests to complete within a 30-second drain window before process termination.

---

## 2. Database Partitioning & Archival

As enterprise transaction volumes reach hundreds of millions of rows, monolithic tables degrade query performance:

### 2.1 Table Partitioning (Range & Hash)
- **High-Volume Ledger Partitioning:** `gl_entries` and `stock_ledger_entries` are partitioned by **Range on Fiscal Year / Quarter**:
  ```sql
  CREATE TABLE gl_entries (
      id UUID NOT NULL,
      tenant_id UUID NOT NULL,
      posting_date TIMESTAMPTZ NOT NULL,
      ...
  ) PARTITION BY RANGE (posting_date);

  CREATE TABLE gl_entries_2026_q1 PARTITION OF gl_entries
      FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
  ```
- **Tenant Hash Partitioning (Profile E):** Large enterprise tables partition high-volume document tables by hash on `tenant_id`.

### 2.2 Cold Data Tiering & Archival
- Transactions older than statutory retention requirements (e.g., 7 years) are automatically compressed and moved from hot NVMe SSD storage to cold columnar storage (Parquet / S3 / Google Cloud Storage) with query access available via foreign data wrappers (FDW) or Athena/BigQuery.

---

## 3. High Availability, Replication & Disaster Recovery

| Metric | Target SLA | Strategy |
| :--- | :--- | :--- |
| **Availability** | 99.99% Uptime | Multi-zone active-active compute nodes with automated health check failover. |
| **RPO (Recovery Point Objective)** | < 1 minute | Synchronous replication to standby PostgreSQL replica in secondary availability zone. Continuous WAL archiving. |
| **RTO (Recovery Time Objective)** | < 15 minutes | Automated database failover via Patroni / cloud-managed High Availability orchestration. |
| **Disaster Recovery** | Cross-Region Recovery | Asynchronous cross-region replication of database snapshots and encrypted WAL logs to a secondary cloud region. |
