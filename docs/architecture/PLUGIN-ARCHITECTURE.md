# Plugin & Extension Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Safe, Extensible Third-Party & Custom Business Capability Integration  
**Design Standard:** Open-Closed Principle (OCP) via Declarative Extension Points

---

## 1. Extension Point Model

To allow vertical industry customization (e.g., Automotive, Aerospace, Healthcare, Fashion) without forking the core codebase, the Universal ERP platform exposes **Standardized Extension Points**:

```
                         [ Core ERP Processing Pipeline ]
                                      │
  1. UI Extension Hook ───────────────┼──► Inject custom widgets, action buttons, table columns
  2. Validation Hook ─────────────────┼──► Validate domain invariants (e.g., custom credit rules)
  3. Calculation Pipeline ────────────┼──► Custom pricing engines, tax formulas, scrap factors
  4. Workflow Action Step ────────────┼──► Execute custom BPMN task (e.g., send SMS via Twilio)
  5. Post-Commit Domain Event ────────┼──► Async webhook to external legacy systems
                                      │
```

### 1.1 Registered Hook Types
1. **`UI_RENDER_SLOT`:** Injects React components into designated application slots (e.g., `sales.order.header.actions`, `customer.detail.tabs`, `inventory.item.alerts`).
2. **`BEFORE_RECORD_SAVE`:** Synchronous validator running inside the pre-commit boundary. Can reject transactions with localized error messages.
3. **`CALCULATION_TRANSFORMER`:** Modifies calculations within a pipeline (e.g., applying dynamic multi-attribute tier discounts).
4. **`CUSTOM_FIELD_PROVIDER`:** Attaches schema-validated custom attributes to core entities without altering the core database schema (using JSONB or metadata tables).
5. **`EXTERNAL_INTEGRATION_SYNC`:** Two-way synchronization adapters (e.g., Shopify, EDI 850, Salesforce).

---

## 2. Plugin Manifest Specification

Every plugin or extension capability declares its configuration in a `plugin.manifest.json`:

```json
{
  "id": "com.partner.automotive-vin-lookup",
  "name": "Automotive VIN & Parts Catalog Extension",
  "version": "1.2.0",
  "minPlatformVersion": "1.0.0",
  "author": "Enterprise Partner Solutions Ltd",
  "license": "Commercial",
  "extensionPoints": [
    {
      "type": "CUSTOM_FIELD_PROVIDER",
      "targetEntity": "inventory.item",
      "fields": [
        { "key": "vin_number", "type": "string", "required": false, "indexed": true },
        { "key": "oem_part_code", "type": "string", "required": true }
      ]
    },
    {
      "type": "UI_RENDER_SLOT",
      "slotId": "inventory.item.detail.panels",
      "entrypoint": "./dist/ui/VinPartsPanel.js"
    },
    {
      "type": "BEFORE_RECORD_SAVE",
      "targetEntity": "inventory.item",
      "handler": "./dist/server/validateVin.js"
    }
  ],
  "permissionsRequired": [
    "inventory.item.read",
    "inventory.item.write"
  ]
}
```

---

## 3. Sandboxing & Security Safeguards

To prevent untrusted or buggy plugins from compromising the security or stability of the ERP platform:

1. **Process Isolation:** High-risk custom code runs in a sandboxed V8 worker (`node:vm` or WebAssembly runtime) with strictly bounded CPU execution timeouts (max 500ms) and memory ceilings (max 64MB).
2. **Restricted Platform Facade:** Sandboxed plugins cannot execute arbitrary file system access, raw network calls, or direct database SQL queries. They communicate strictly through an injected `PlatformContext` facade providing scoped, auditable APIs.
3. **Tenant Sandboxing:** Plugins are strictly tenant-scoped. A plugin configured for Tenant X cannot read, write, or leak data belonging to Tenant Y.
4. **Failure Fault Tolerance:** A failure in an asynchronous plugin hook never crashes the core ERP transaction; failures are isolated, captured in error logs, and routed to the Dead Letter Queue for inspection.
