# Component Construction Rules & Standards

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** High-Quality, Predictable, Accessible Component Library  
**Standard:** Radix UI Headless Primitives + Tailwind CSS Design Tokens

---

## 1. Global Component Invariants

1. **Accessibility by Construction:** Every interactive component must support complete keyboard navigation, explicit ARIA attributes, and screen reader announcements.
2. **Deterministic States:** Components must explicitly handle and style all interactive states: `default`, `hover`, `active`, `focus-visible`, `disabled`, `loading`, and `error`.
3. **No Unlabelled Status Indicators:** Status badges and indicators must **never** rely solely on color (e.g., an unlabelled red or green dot). Every badge must combine a semantic icon or color with a visible text label.

---

## 2. Key Component Specifications

### 2.1 Enterprise Data Table (`<DataTable />`)
The Data Table is the primary workhorse of the ERP platform:
- **Sticky Headers:** Table headers remain fixed at the top of the viewport during vertical scrolling (`position: sticky; top: 0; z-index: var(--erp-z-docked)`).
- **Tabular Numeric Alignment:** Column headers and cells for numbers, prices, and dates align to the right (`text-align: end;`); text aligns to the start (`text-align: start;`).
- **Virtualization for Large Datasets:** When tables exceed 100 rows, virtualization (`@tanstack/react-virtual`) must be enabled to render only rows currently within the scroll viewport, guaranteeing constant 60 FPS scrolling even with 100,000+ records.
- **Bulk Operations:** Multi-row checkboxes trigger a persistent bottom floating action bar for bulk operations (e.g., "Approve 14 Orders", "Print Invoices", "Export CSV").

### 2.2 Form Controls & Field Validation
- **Label Association:** Every input must be explicitly bound to an `<label>` via `htmlFor` / `id`.
- **Inline Validation:** Errors appear directly below the field with an accessible `aria-invalid="true"` and `aria-describedby="[field]-error"`.
- **Specialized Financial Inputs:** Monetary inputs automatically format digits and symbols according to active currency locale rules.

### 2.3 Dialogs, Drawers & Modals
- **Focus Trapping:** Opening a modal traps keyboard focus within the dialog; pressing `Tab` cycles only through dialog elements.
- **Escape Key:** Pressing `Escape` closes the modal, returning focus to the triggering element.
- **Backdrop Lock:** Body scrolling is locked when a modal or drawer is open (`overflow: hidden`).
- **Destructive Confirmation:** Destructive actions (e.g., canceling a posted order, deleting an unposted draft) require an explicit confirmation modal with a red destructive button.

### 2.4 Button Hierarchy
| Button Variant | Visual Role | Permitted Frequency | Example Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | Solid Electric Cobalt (`--erp-color-primary`) | **Max 1 per screen context** | "Create Sales Order", "Submit for Approval" |
| **Secondary** | Clean border with neutral background | Standard operational actions | "Save as Draft", "Export CSV", "Filter" |
| **Ghost / Outline** | Borderless or subtle outline | Tertiary / inline utility | "Cancel", "Close", "View Details" |
| **Destructive** | Solid Crimson Red (`--erp-color-danger`) | High-consequence destructive acts | "Delete Draft", "Revoke Authority" |
