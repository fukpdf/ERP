# Enterprise Load Profiles Specification

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Standardized Operational Sizing & Infrastructure Blueprints  
**Standard:** Scale-Adaptive Resource Provisioning

---

## 1. Load Profile Spectrum

The Universal ERP platform defines **Five Standardized Load Profiles**. Each profile represents an exact configuration blueprint spanning compute, database, caching, queueing, and network topology.

---

## 2. Detailed Profile Specifications

### 2.1 Profile A: Solo & Small Business
- **Target Organization:** Boutique consultancy, single retail shop, independent contractor, seed startup.
- **Scale Metrics:** 1 Legal Entity, 1 Location, 1–10 Concurrent Users, 10–30 Active Capabilities.
- **Compute Topology:**
  - Single lightweight container instance (Node.js runtime, 1 vCPU, 512MB RAM).
  - Memory ceiling for application process: $< 128\text{ MB}$.
- **Data & Persistence:**
  - Shared PostgreSQL database, single shared schema with `tenant_id` column.
  - In-process SQLite or embedded mock for developer local evaluation.
- **Event & Workflow Processing:**
  - Synchronous in-memory event bus; in-memory timer queues.
- **Cold-Start Target:** $< 250\text{ ms}$ (instant container wakeup).

### 2.2 Profile B: Growing Business / Mid-Market
- **Target Organization:** Regional distributor, professional services firm, growing e-commerce merchant.
- **Scale Metrics:** 1–3 Legal Entities, 2–10 Branches/Warehouses, 10–100 Concurrent Users, 50–150 Active Capabilities.
- **Compute Topology:**
  - 2 Autoscaled stateless container nodes behind standard reverse-proxy load balancer.
- **Data & Persistence:**
  - Managed PostgreSQL instance with connection pooling (PgBouncer).
  - PostgreSQL Row-Level Security (RLS) actively enforced.
- **Event & Workflow Processing:**
  - Redis-backed distributed queue (BullMQ / Valkey) for background jobs and notifications.

### 2.3 Profile C: Enterprise
- **Target Organization:** National hospital group, mid-tier manufacturing enterprise, logistics provider.
- **Scale Metrics:** 5–25 Legal Entities, 20–100 Warehouses/Facilities, 100–1,000 Concurrent Users, 300–800 Active Capabilities.
- **Compute Topology:**
  - Kubernetes cluster (3–10 worker pods) with automated Horizontal Pod Autoscaling (HPA).
- **Data & Persistence:**
  - High-Availability PostgreSQL cluster (Primary + Read Replica with automated failover).
  - Dedicated tenant database schema (`tenant_[uuid]`).
- **Event & Workflow Processing:**
  - Dedicated background worker pods for heavy report generation and EDI parsing.

### 2.4 Profile D: Large Multinational Enterprise
- **Target Organization:** Global pharmaceutical company, international automotive manufacturer, multi-brand holding corporation.
- **Scale Metrics:** 25–100 Sovereign Legal Entities, Hundreds of Warehouses, 1,000–10,000 Concurrent Users, 1,000–3,000 Active Capabilities.
- **Compute Topology:**
  - Dedicated microservice clusters for high-volume domains (Sales API cluster, Inventory Engine cluster, Reporting cluster).
- **Data & Persistence:**
  - Physically isolated PostgreSQL database cluster with dedicated NVMe storage and CMEK encryption.
  - Range and hash partitioning enabled on ledger tables.
- **Event & Workflow Processing:**
  - Apache Kafka / Google Cloud Pub/Sub distributed event streaming broker.

### 2.5 Profile E: Global Conglomerate & Sovereign Tier
- **Target Organization:** Multinational conglomerate (e.g., General Electric, Siemens), national defense contractor, central banking authority.
- **Scale Metrics:** 100+ Sovereign Entities, Global mesh across multiple continents, 10,000–100,000+ Concurrent Users, 3,000–10,000+ Active Capabilities.
- **Compute Topology:**
  - Multi-region distributed cloud mesh with edge routing.
- **Data & Persistence:**
  - Distributed SQL database (Spanner / CockroachDB / Multi-Region Aurora) with strict jurisdictional data residency compliance (EU data stays in EU, US data stays in US).
- **Compliance & Encryption:**
  - Hardware Security Module (HSM) root of trust, customer-managed keys (BYOK), real-time SOC 2 Type II audit telemetry.
