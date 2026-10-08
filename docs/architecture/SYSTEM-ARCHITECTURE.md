# Universal ERP System Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Enterprise-Grade Modular ERP Platform  
**Anti-Monolith Strategy:** Strict 4-Tier Layered Architecture with Contract-Driven Interfaces

---

## 1. Architectural Philosophy & Layer Model

To support eventual expansion to **10,000+ distinct business capabilities** without collapsing into an unmaintainable monolith, the Universal ERP platform strictly enforces a 4-tier hierarchical dependency architecture.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 4: CAPABILITIES                            │
│   (10,000+ atomic business features: e.g., VAT-ReverseCharge-EU,       │
│    SurgicalCount-Check, MultiCurrency-Revaluation, 3Way-PO-Matching)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ consumes
┌───────────────────────────────────▼────────────────────────────────────┐
│                         TIER 3: MODULES                                │
│   (Cohesive business domains: General Ledger, Sales & CRM,             │
│    Inventory & Warehousing, Procurement, Human Resources, Projects)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ consumes
┌───────────────────────────────────▼────────────────────────────────────┐
│                    TIER 2: PLATFORM SERVICES                           │
│   (Tenancy, Auth/RBAC, Workflow/BPMN, Events/Bus, Document Store,      │
│    Audit Logging, Localization, Reporting Engine, Notifications)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ consumes
┌───────────────────────────────────▼────────────────────────────────────┐
│                          TIER 1: CORE                                  │
│   (Database Abstraction, Transaction Context, Cryptography, Di/IoC,    │
│    Configuration, Logging, Telemetry Primitives, Money/Units Math)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Dependency Law
Dependencies may **only point downward**.
- A Capability may depend on its parent Module and Platform Services.
- A Module may depend on Platform Services and Core. Modules may **never** directly import other Modules; all cross-module interactions must be orchestrated via Platform Events, Public Module Contracts, or Platform Services.
- Platform Services depend solely on Core.
- Core has **zero internal dependencies** and minimal, audited external dependencies.

---

## 2. Four-Tier Architectural Definitions

### 2.1 Tier 1: Core (`@erp/core`)
- **Mission:** High-performance, low-level technical infrastructure.
- **Responsibilities:**
  - Database connection management, connection pooling, and transactional boundary contexts (`UnitOfWork`).
  - Cryptographic primitives (envelope encryption, key derivation, PII hashing).
  - High-precision fixed-point numeric arithmetic (currencies, unit conversions).
  - Context propagation (AsyncLocalStorage for request ID, tenant context, correlation ID, audit actor).
  - Centralized structured logging and OpenTelemetry tracing interfaces.
  - Base error hierarchy (`DomainError`, `SecurityError`, `ConcurrencyError`, `NotFoundError`).

### 2.2 Tier 2: Platform Services (`@erp/platform-*`)
- **Mission:** Reusable business-neutral platform engines.
- **Components:**
  - `@erp/platform-tenancy`: Multi-tenant resolution, organization hierarchies, database isolation routing.
  - `@erp/platform-auth`: JWT session verification, token rotation, federated SSO (SAML/OIDC), zero-trust service tokens.
  - `@erp/platform-rbac`: Hierarchical RBAC, Attribute-Based Access Control (ABAC), permission cache, Separation of Duties (SoD) engine.
  - `@erp/platform-workflow`: BPMN 2.0 execution engine, Common Expression Language (CEL) rule evaluator, human task assignment, escalation timer.
  - `@erp/platform-events`: Asynchronous event broker, outbox publisher, idempotency store, dead-letter queue.
  - `@erp/platform-audit`: Append-only immutable audit log, differential change capture, tamper-evident hash chaining.
  - `@erp/platform-i18n`: Locale resolution, number/currency/date formatters, RTL direction management, localized content repository.
  - `@erp/platform-registry`: Module & capability registration, dynamic manifest resolver, load profile coordinator.

### 2.3 Tier 3: Business Modules (`@erp/module-*`)
- **Mission:** Domain-specific business logic encapsulated with explicit public contracts.
- **Core Domain Modules:**
  - `module-general-ledger`: Chart of Accounts, Journal Vouchers, Financial Periods, Multi-Currency Revaluation, Trial Balance.
  - `module-inventory`: Multi-warehouse, Lot & Serial tracking, Stock movements, Valuation (FIFO, Weighted Average), Cycle counts.
  - `module-procurement`: Requisitions, RFQs, Purchase Orders, Goods Receipt Notes (GRN), Vendor Invoicing, 3-Way Matching.
  - `module-sales`: Customer master, Price books, Quotations, Sales Orders, Credit checks, Invoicing, Fulfillment requests.
  - `module-crm`: Leads, Opportunities, Pipelines, Customer interactions, Contacts.
  - `module-hr-payroll`: Employee master, Departments, Compensation packages, Timesheets, Payroll generation, Tax withholdings.
  - `module-projects`: Work Breakdown Structure (WBS), Milestones, Resource allocation, Cost accumulation, Time billing.

### 2.4 Tier 4: Business Capabilities (`@erp/capability-*`)
- **Mission:** Atomic, pluggable, jurisdiction-specific or industry-specific feature units.
- **Characteristics:**
  - Each capability exposes a lightweight manifest (`CapabilityManifest`).
  - Capabilities can be dynamically enabled/disabled per tenant, per legal entity, or per license tier.
  - Examples:
    - `cap-tax-vat-uk`: HMRC Making Tax Digital (MTD) integration and VAT return calculations.
    - `cap-inv-surgical-count`: Operating room surgical count protocol and sterile instrument tracking.
    - `cap-sales-auto-dunning`: Automated overdue invoice escalation and dunning letter dispatch.
    - `cap-fin-peppol-einvoice`: Standardized UBL/Peppol XML invoice generation and transmission.

---

## 3. Communication Patterns

### 3.1 Synchronous Intra-Process Calls (Direct Contract)
- When Module A needs data or actions from Module B synchronously (e.g., Sales Order checking inventory availability):
- Module B publishes an explicit, versioned TypeScript Interface: `IInventoryPublicService`.
- Module A consumes `IInventoryPublicService` via Dependency Injection.
- **Rule:** Module A never imports internal entities, repositories, or services of Module B. It interacts solely with the declared contract.

### 3.2 Asynchronous Cross-Domain Events (Event-Driven)
- When a business state changes that impacts multiple domains (e.g., `SalesOrderConfirmedEvent`):
- The originating module writes the event to the **Transactional Outbox Table** in the same ACID transaction as the state change.
- The Outbox Processor delivers the event to the Event Bus.
- Subscribed modules (Inventory for stock reservation, General Ledger for deferred revenue accrual, Notifications for customer email) consume the event independently.
- Guaranteed **at-least-once delivery** with mandatory idempotent consumer handlers.

---

## 4. Deployment Topologies

The system architecture supports multiple deployment profiles using the exact same codebase:

1. **Modular Monolith (Profiles A & B - Small to Mid-Market):**
   - Single Node.js process / container running the API gateway and enabled modules in-process.
   - Low memory footprint, zero network latency between modules, single unified PostgreSQL database.
2. **Distributed Modular Services (Profiles C, D & E - Large Enterprise):**
   - High-throughput modules (e.g., Inventory, Sales, Reporting) separated into independent microservices or worker pools.
   - Shared platform event bus (Kafka / RabbitMQ / Cloud Pub/Sub) replaces in-memory event bus.
   - Read-replica offloading for heavy reporting and analytical queries.
