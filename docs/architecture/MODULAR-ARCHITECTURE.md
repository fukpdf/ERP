# Modular Architecture Specification

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** High-Cohesion, Loose-Coupling Domain Modularity  
**Governing Standard:** Hexagonal Domain-Driven Modular Design

---

## 1. Anatomy of an ERP Business Module

Every business module in the Universal ERP platform conforms to a strictly defined, uniform internal directory anatomy. No module may expose its internal database tables, internal domain models, or low-level services to other modules.

```
packages/modules/module-[name]/
├── src/
│   ├── contract/                  # PUBLIC: The ONLY exportable interface to other modules
│   │   ├── index.ts               # Public exports barrel
│   │   ├── [name].contract.ts     # Interface declarations (e.g., ISalesPublicService)
│   │   ├── [name].dto.ts          # Strongly typed input/output Data Transfer Objects
│   │   └── [name].events.ts       # Domain events published by this module
│   │
│   ├── domain/                    # PRIVATE: Pure business entities & invariant logic
│   │   ├── entities/              # Rich domain models with validation & invariants
│   │   ├── value-objects/         # Immutable value objects (e.g., Money, SKU, Address)
│   │   ├── exceptions/            # Domain-specific error types
│   │   └── repositories/          # Repository interfaces (abstract data contracts)
│   │
│   ├── application/               # PRIVATE: Orchestration & Use Case workflows
│   │   ├── commands/              # CQRS Write Command Handlers
│   │   ├── queries/               # CQRS Read Query Handlers
│   │   └── services/              # Domain orchestration & contract implementations
│   │
│   ├── infrastructure/            # PRIVATE: Technical implementations
│   │   ├── persistence/           # Drizzle/ORM table schemas, entity mappers
│   │   ├── repositories/          # Concrete database repository implementations
│   │   └── adapters/              # External service adapters & contract clients
│   │
│   ├── presentation/              # OPTIONAL: HTTP / REST / GraphQL Endpoints
│   │   ├── controllers/           # Route handlers & input parsers
│   │   └── validators/            # Request payload Zod schemas
│   │
│   └── manifest.ts                # Module registration manifest & metadata
├── tests/
│   ├── unit/                      # Fast domain & application unit tests
│   └── integration/               # Database repository & contract tests
└── package.json
```

---

## 2. Encapsulation Rules & Package Exports

### 2.1 The Contract Gateway
In `package.json`, the module explicitly restricts what can be imported by other workspace packages:

```json
{
  "name": "@erp/module-sales",
  "exports": {
    ".": "./src/contract/index.ts",
    "./manifest": "./src/manifest.ts"
  }
}
```

- Any attempt by another module to deep-import an internal file (e.g., `import { SalesOrderEntity } from '@erp/module-sales/src/domain/entities/order'`) will be flagged as a build error and rejected by the ESLint architecture boundary rules.
- Only types, DTOs, and interfaces defined in `./src/contract/index.ts` are legally consumable by external callers.

### 2.2 Anti-Corruption Layers (ACL)
When Module A consumes Module B's contract, it must not allow Module B's DTOs to bleed deep into its core domain entities. Module A's infrastructure layer contains an adapter that maps Module B's external DTO into Module A's internal domain representations.

---

## 3. Module Manifest & Lifecycle

Every module exports a `ModuleManifest` that platform services use to discover, register, validate, and dynamically boot the system.

```typescript
export interface ModuleManifest {
  readonly id: string;                      // Unique slug (e.g., 'erp.module.sales')
  readonly name: string;                    // Human-readable title
  readonly version: string;                 // Semantic version (e.g., '1.0.0')
  readonly category: ModuleCategory;        // 'finance' | 'supply_chain' | 'crm' | 'hr' | etc.
  readonly dependencies: readonly ModuleDependency[];
  readonly requiredCapabilities: readonly string[];
  readonly providesServices: readonly ServiceRegistration[];
  readonly publishedEvents: readonly string[];
  readonly subscribedEvents: readonly EventSubscription[];
  readonly permissions: readonly PermissionDefinition[];
  readonly databaseMigrations?: string;
  readonly loadPriority: number;           // Execution order during platform boot
}
```

### Module Lifecycle Stages:
1. **Discovery:** Platform Registry inspects registered manifests on cold start or plugin loading.
2. **Dependency Resolution:** Topologically sorts modules by declared dependencies; verifies absence of cycles.
3. **Registration:** Registers public service implementations into the central Inversion of Control (IoC) container.
4. **Schema Validation:** Verifies required database tables and migrations exist for the tenant.
5. **Subscription Binding:** Attaches event consumers to the central Event Bus.
6. **Health Check:** Module executes a self-diagnostic ping to confirm operational readiness.
7. **Teardown / Unload:** Gracefully flushes pending outbox messages, detaches event listeners, and releases resource handles.
