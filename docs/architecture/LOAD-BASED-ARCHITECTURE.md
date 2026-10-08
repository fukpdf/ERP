# Load-Based Adaptive Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Dynamic Execution Scaling across 10,000+ Potential Capabilities  
**Guiding Principle:** Only pay in memory, CPU, and latency for what a tenant actively executes.

---

## 1. The Scaling Paradox & Solution

An ERP system capable of supporting 10,000+ enterprise capabilities faces a lethal architectural failure if designed naively:
- **The Monolithic Death Spiral:** If every module, route, validator, database model, seeder, and background worker is loaded into memory on process startup, the application cold-start exceeds several minutes, memory consumption balloons to tens of gigabytes, and small business tenants are priced out or crippled by system bloat.

### The Solution: Load-Based Adaptive Architecture
The platform implements an **adaptive execution engine** that dynamically provisions, compiles, and loads capabilities on-demand based on tenant entitlement, user role, and active operational profile.

```
Incoming Request / User Session
             │
             ▼
    [Tenant Context Resolver]
             │
             ▼
    [Load Profile & Entitlement Filter]
    (Resolves active capabilities: e.g., 25 out of 10,000)
             │
   ┌─────────┴─────────┐
   ▼                   ▼
In-Memory Cache     Lazy Module Loader (Dynamic ESM Import)
   │                   │
   └─────────┬─────────┘
             ▼
   [Scoped Execution Context]
   (Runs only required controllers, services & SQL queries)
```

---

## 2. Platform Load Profiles

The platform formally defines five standardized operational tiers:

| Metric / Dimension | Profile A (Small Business) | Profile B (Mid-Market) | Profile C (Enterprise) | Profile D (Multinational) | Profile E (Global Conglomerate) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Typical Organizations** | 1 Legal Entity, 1 Branch | 1–3 Entities, 5 Branches | 5–20 Entities, 50 Branches | 20–100 Entities, Global | 100+ Entities, Thousands of Units |
| **Active Capabilities** | 10 – 30 | 50 – 200 | 300 – 1,000 | 1,000 – 4,000 | 4,000 – 10,000+ |
| **Concurrent Users** | 1 – 25 | 25 – 250 | 250 – 2,500 | 2,500 – 25,000 | 25,000 – 250,000+ |
| **Target Cold Start** | < 250 ms | < 800 ms | < 2.0 s (Cluster) | Instant (Warm Pool) | Instant (Global Mesh) |
| **Memory Footprint** | < 128 MB per worker | < 256 MB per worker | < 512 MB per worker | 1–2 GB per worker | Dynamic Microservices |
| **Persistence Isolation** | Shared DB, Shared Schema (Tenant ID) | Shared DB, Dedicated Schema / RLS | Isolated Database or Dedicated Schema | Dedicated Multi-Region DB Cluster | Partitioned Distributed Database |
| **Workflow Engine** | Inline synchronous steps | Basic in-process queue | Distributed Celery / BullMQ | Dedicated Workflow Worker Pool | High-throughput Orchestration Mesh |

---

## 3. Dynamic Loading Mechanisms

### 3.1 Route-Level Code Splitting (Frontend & Gateway)
- Frontend client bundles are split at the module and capability boundary using dynamic imports (`React.lazy(() => import('@erp/cap-sales-quote'))`).
- A small business user accessing Sales Orders never downloads the JavaScript bytecode or translations for Hospital Surgical Tracking, Advanced BOM Routing, or Japanese Consumption Tax.

### 3.2 Demand-Driven Service Instantiation (Backend)
- Services are registered in the Inversion of Control (IoC) container using **Lazy Provider Factories**.
- If a tenant does not have `cap-advanced-3way-matching` enabled in their subscription, the service class, validators, and database query maps for that capability are **never loaded or instantiated** during that tenant's requests.

### 3.3 Database Query Scoping & Dynamic Schema Loading
- The platform avoids loading giant monolithic ORM schemas with thousands of foreign key relations into memory.
- Schema definitions are partitioned by domain. Repositories dynamically resolve and prepare only the SQL queries relevant to the actively invoked capability.
- Tenant configuration flags determine whether extended columns and auxiliary tables are joined during execution.

### 3.4 Multi-Tier Cache Boundaries
1. **Tier 1 (L1 In-Memory Fast Cache):** Tenant permission matrices, active capability manifests, and exchange rates cached per-process with short TTL (60s).
2. **Tier 2 (L2 Distributed Cache - Redis / Valkey):** Tenant settings, user sessions, and read-heavy catalog projections shared across worker nodes.
3. **Tier 3 (L3 Database Persistence):** ACID transactions and relational persistence.
