# Universal ERP Dependency Rules

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Elimination of Monolithic Entanglement & Circular References  
**Enforcement Mechanism:** Automated AST Linting & Build-Time Dependency Verification

---

## 1. The Core Dependency Invariants

The health and modularity of the 10,000+ capability ecosystem depends on absolute adherence to **Strict Layered Dependency Hierarchy**:

```
Layer 4: Capabilities  ───►  Layer 3: Modules  ───►  Layer 2: Platform Services  ───►  Layer 1: Core
```

### Invariant 1: Unidirectional Downward Flow
Code at Layer $N$ may import code from Layer $N-1$ or lower. Code at Layer $N$ may **never** import code from Layer $N+1$.
- `Core` may import **nothing** from Platform Services, Modules, or Capabilities.
- `Platform Services` may import from `Core`, but **nothing** from Modules or Capabilities.
- `Modules` may import from `Platform Services` and `Core`, but **never** from other Modules' internals.
- `Capabilities` may import from their parent Module contract, `Platform Services`, and `Core`.

### Invariant 2: Zero Lateral Module Coupling
Modules exist at the same architectural tier (Tier 3).
- **Prohibited:** `module-sales` importing anything from `module-inventory/src/...`.
- **Allowed:** `module-sales` importing the public contract `@erp/module-inventory` (which exposes only `src/contract/index.ts`).
- **Preferred:** Cross-module decoupling via asynchronous domain events emitted over the platform event bus.

### Invariant 3: Zero Circular Dependencies
Circular dependencies (A depends on B, which directly or transitively depends on A) are **fatal architectural defects**. The build system will reject any code change introducing a cycle.

---

## 2. Prohibited vs Allowed Import Matrix

| Initiating Source File | Target Import File | Allowed? | Rationale |
| :--- | :--- | :---: | :--- |
| `packages/core/...` | `packages/platform-auth/...` | ❌ **PROHIBITED** | Core is the foundation; cannot depend on higher platform layers. |
| `packages/platform-rbac/...` | `packages/core/...` | ✅ **ALLOWED** | Platform services legitimately consume Core utilities. |
| `packages/platform-workflow/...` | `packages/modules/module-sales/...` | ❌ **PROHIBITED** | Platform services are business-neutral; cannot depend on domain modules. |
| `packages/modules/sales/src/domain/...` | `packages/modules/sales/src/presentation/...` | ❌ **PROHIBITED** | Domain layer must remain pure; cannot depend on HTTP/presentation layer. |
| `packages/modules/sales/src/application/...` | `packages/modules/sales/src/domain/...` | ✅ **ALLOWED** | Application layer orchestrates Domain entities. |
| `packages/modules/sales/src/domain/...` | `packages/modules/inventory/src/contract/...` | ❌ **PROHIBITED** | Domain layer must not depend on external modules. Coupling belongs in Application/Infrastructure layer. |
| `packages/modules/sales/src/infrastructure/...` | `packages/modules/inventory/src/contract/...` | ✅ **ALLOWED** | Infrastructure adapter queries external module contract via ACL. |

---

## 3. Automated Enforcement Configuration

These dependency rules will be verified in CI/CD using `dependency-cruiser` and ESLint boundary rules configured in Phase 1:

```javascript
// .dependency-cruiser.js rule snippet
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Warn if there are circular dependencies',
      from: {},
      to: { circular: true }
    },
    {
      name: 'core-isolation',
      severity: 'error',
      comment: 'Core must not depend on platform, modules, or capabilities',
      from: { path: '^packages/core' },
      to: { path: '^packages/(platform|modules|capabilities)' }
    },
    {
      name: 'platform-neutrality',
      severity: 'error',
      comment: 'Platform services must not depend on business modules',
      from: { path: '^packages/platform' },
      to: { path: '^packages/(modules|capabilities)' }
    },
    {
      name: 'no-module-deep-imports',
      severity: 'error',
      comment: 'Modules must only be imported via their public contract index',
      from: { path: '^packages/modules/([a-zA-Z0-9-]+)' },
      to: {
        path: '^packages/modules/((?!\$1)[a-zA-Z0-9-]+)/(?!src/contract/index)',
      }
    }
  ]
};
```
