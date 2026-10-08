# The 10,000+ Capability Model

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Atomic, Scalable Functional Unit Architecture  
**Design Standard:** Micro-Capability Granularity with Macro-Module Cohesion

---

## 1. What is an ERP Capability?

In legacy ERP systems, features are bundled into monolithic modules (e.g., "The Inventory Module"). This coarse granularity makes it impossible to enable a single specialized feature (such as *Surgical Instrument Counting* or *EU VAT Reverse Charge*) without pulling in hundreds of irrelevant database tables, menus, and validation rules.

In the Universal ERP platform, the fundamental atomic unit of business functionality is the **Capability**:
- A **Module** is a high-level organizational domain (e.g., `module-procurement`).
- A **Capability** is a discrete, independently-switchable feature unit within or extending a module (e.g., `cap-proc-3way-matching`, `cap-proc-rfq-portal`, `cap-proc-punchout-cxml`).

```
                              [ Universal ERP Platform ]
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 ▼                                                 ▼
        [ Module: Procurement ]                           [ Module: Inventory ]
                 │                                                 │
      ┌──────────┼──────────┐                           ┌──────────┼──────────┐
      ▼          ▼          ▼                           ▼          ▼          ▼
  [Cap: PO]  [Cap: RFQ]  [Cap: 3-Way]               [Cap: Multi-  [Cap: Lot  [Cap: Cycle
                          Matching]                  Warehouse]    Tracking]  Counting]
```

---

## 2. Anatomical Specification of a Capability

Every capability exports a strictly-typed `CapabilityManifest`:

```typescript
export interface CapabilityManifest {
  /** Unique dot-notated identifier: category.module.capability */
  readonly id: string; // e.g., 'scm.procurement.3way_matching'
  
  /** Human-readable display metadata */
  readonly name: string;
  readonly description: string;
  readonly version: string;
  
  /** Parent module association */
  readonly moduleId: string; // e.g., 'erp.module.procurement'
  
  /** Capability classification taxonomy */
  readonly category: CapabilityCategory;
  
  /** Operational requirements */
  readonly minLoadProfile: LoadProfileTier; // 'A' | 'B' | 'C' | 'D' | 'E'
  readonly licensingTier: LicenseTier;      // 'standard' | 'professional' | 'enterprise'
  
  /** Dependency tree */
  readonly requiredCapabilities: readonly string[];
  readonly conflictingCapabilities: readonly string[];
  
  /** Security entitlements */
  readonly requiredPermissions: readonly string[];
  
  /** Dynamic UI hooks & extensions */
  readonly uiSlots?: readonly {
    readonly slotId: string;
    readonly componentPath: string;
  }[];
  
  /** API routes exposed by this capability */
  readonly apiRoutes?: readonly {
    readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    readonly path: string;
    readonly handlerPath: string;
    readonly permission: string;
  }[];
  
  /** Database requirements */
  readonly migrationId?: string;
}
```

---

## 3. Capability Taxonomy

To organize 10,000+ capabilities coherently across diverse industries and jurisdictions, capabilities are classified into six formal tiers:

| Tier | Category Name | Description | Example Capabilities |
| :---: | :--- | :--- | :--- |
| **1** | **Foundational Core** | Essential primitives required by basic operations. | `core.org.single_entity`, `core.currency.base`, `core.auth.password` |
| **2** | **Standard Operational** | Core transactional workflows for common business. | `sales.order.standard`, `inv.stock.receipt`, `gl.journal.manual` |
| **3** | **Advanced Enterprise** | Complex control, audit, and governance features. | `proc.matching.3way`, `rbac.security.sod_enforcement`, `audit.hash_chain` |
| **4** | **Jurisdiction / Localization** | Sovereign tax, legal, language, and e-invoicing rules. | `tax.vat.reverse_charge_eu`, `einvoice.peppol_ubl`, `tax.wht.italy` |
| **5** | **Industry Verticals** | Deep industry-specific compliance and workflows. | `health.surgical.count`, `auto.vin.decoder`, `mfg.batch.bioreactor` |
| **6** | **Integrations & Connectors** | External protocol, bank, and legacy system bridges. | `bank.camt053.parser`, `edi.x12_850.translator`, `shipping.fedex.api` |

---

## 4. Capability Lifecycle State Machine

Each capability advances through a managed lifecycle:

$$\text{Draft} \longrightarrow \text{Experimental} \longrightarrow \text{Active (GA)} \longrightarrow \text{Deprecated} \longrightarrow \text{Retired}$$

1. **Draft / Experimental:** Hidden behind developer flags; available only in canary test environments.
2. **Active (GA):** Fully supported, production-ready, available for tenant activation.
3. **Deprecated:** Emits telemetry warnings when activated; superseded by newer capability; guaranteed support for 12 months.
4. **Retired:** Prevented from new tenant activations; existing tenants migrated via automated schema transform scripts.
