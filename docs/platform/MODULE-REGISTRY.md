# Module & Capability Registry Specification

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Dynamic Module Discovery, Registration, and Dependency Resolution  
**Standard:** Topologically Sorted Inversion of Control (IoC) Service Container

---

## 1. Registry Architecture & Mission

The **Platform Module Registry** (`@erp/platform-registry`) is the single source of truth for all modules, capabilities, extension points, and service contracts active in the ERP instance.

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM MODULE REGISTRY                 │
├─────────────────────────────────────────────────────────────┤
│ • Module Manifest Store      • Capability Dependency Graph   │
│ • Service Contract IoC Map   • Dynamic Extension Hook Matrix │
│ • Tenant Feature Resolver    • Health Diagnostics Engine     │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
[ Boot Phase Discovery ]  [ Tenant Activation ]   [ Request Route Guard ]
 (Validates DAG & Boot)    (Checks Entitlements)   (Enforces Permissions)
```

---

## 2. Dependency Graph Resolution (Topological Sort)

Before the platform boots, the Registry builds a **Directed Acyclic Graph (DAG)** of all registered modules and capabilities:

1. **Cycle Detection (Tarjan's / Kahn's Algorithm):** If any circular dependency exists (e.g., Module A requires Module B, which requires Module A), the boot sequence is halted with an `UnresolvableDependencyCycleError` detailing the exact cycle path.
2. **Topological Order:** The modules are ordered by initialization sequence, ensuring that foundational providers (Database, Core, Tenancy, RBAC) are fully booted before dependent business modules (Inventory, Sales, Invoicing) execute their initialization hooks.

---

## 3. Dynamic Registration API

```typescript
export interface IModuleRegistry {
  /** Registers a module manifest into the global platform registry */
  registerModule(manifest: ModuleManifest): void;

  /** Registers an atomic capability manifest */
  registerCapability(manifest: CapabilityManifest): void;

  /** Resolves whether a capability is currently active for a specific tenant and legal entity */
  isCapabilityActive(
    tenantId: string, 
    legalEntityId: string, 
    capabilityId: string
  ): Promise<boolean>;

  /** Retrieves the concrete implementation of a public service contract */
  resolveService<T>(contractToken: symbol): T;

  /** Returns all active UI slot extensions for a designated application slot */
  resolveUiSlots(
    tenantId: string, 
    slotId: string
  ): Promise<readonly UiSlotRegistration[]>;

  /** Executes health check diagnostics across all registered modules */
  runHealthDiagnostics(): Promise<readonly ModuleHealthReport[]>;
}
```

---

## 4. Tenant Feature Resolution & Cache Layer

Evaluating tenant entitlements across thousands of capabilities must not add database overhead to every HTTP request.

1. **Tenant Capability Bitset / Set Cache:** When a tenant authenticates, their active capability IDs are compiled into a compressed lookup `Set<string>` and stored in the high-speed L1 in-memory cache and Redis with a 300-second TTL.
2. **Sub-Millisecond Evaluation:** Evaluating `registry.isCapabilityActive(tenantId, entityId, 'scm.procurement.3way_matching')` executes as an $O(1)$ memory lookup taking $< 0.05$ ms.
3. **Invalidation:** Modifying a tenant's subscription or enabling a feature flag emits an instantaneous `TenantEntitlementsUpdatedEvent` that invalidates the cached capability set across all running application nodes.
