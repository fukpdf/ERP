# Feature Flag & Entitlement Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Dynamic Capability Activation, Progressive Rollout & Emergency Kill-Switches  
**Standard:** Multi-Dimensional Hierarchical Flag Resolution

---

## 1. Feature Flag Evaluation Hierarchy

In the Universal ERP platform, whether a capability or behavior is active is determined through a **5-tier hierarchical resolution pipeline**. Higher tiers override lower tiers:

```
[ Tier 5: Emergency System Kill-Switch ]  ──► (Global immediate shutdown if breached)
                  │
                  ▼
[ Tier 4: Tenant Subscription Entitlement ] ─► (Enforces commercial license tier)
                  │
                  ▼
[ Tier 3: Organization / Entity Override ] ─► (Enabled only for specific subsidiaries)
                  │
                  ▼
[ Tier 2: User Cohort / Canary Ring ]   ────► (Alpha/Beta testers, pilot branches)
                  │
                  ▼
[ Tier 1: System Baseline Default ]     ────► (Default state declared in manifest)
```

---

## 2. Dynamic Flag Resolution Engine

```typescript
export interface IFeatureFlagService {
  /**
   * Resolves whether a specific feature flag or capability is enabled
   * for the current execution context. Guaranteed < 0.1ms execution.
   */
  isEnabled(flagKey: string, context: EvaluationContext): Promise<boolean>;

  /**
   * Retrieves a typed configuration payload associated with a feature flag
   * (e.g., threshold amounts, API endpoints, retry counts).
   */
  getFlagValue<T>(flagKey: string, context: EvaluationContext, defaultValue: T): Promise<T>;
}

export interface EvaluationContext {
  readonly tenantId: string;
  readonly legalEntityId?: string;
  readonly branchId?: string;
  readonly userId?: string;
  readonly userRoles: readonly string[];
  readonly ipAddress?: string;
}
```

---

## 3. Flag Storage, Cache & Invalidation

1. **Storage:** Flag definitions, rollout rules, and tenant overrides are stored in relational database tables (`feature_flags`, `tenant_flag_overrides`).
2. **Multi-Node In-Memory Cache:** All flags for a tenant are cached in worker memory.
3. **Instantaneous Invalidation:** Changes made via the administrative dashboard publish a `FeatureFlagChangedEvent` to the platform event bus, forcing all running nodes to update their in-memory flag bitsets within $< 50$ milliseconds.
4. **Audit Logging:** Every flag mutation records the administrator who authorized the change, previous state, new state, business justification, and timestamp in the immutable audit log.
