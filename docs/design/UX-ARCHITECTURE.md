# Universal ERP User Experience (UX) Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** High-Velocity Professional Enterprise Workflow Ergonomics  
**Core Directive:** Operational Productivity and Error Prevention over Decorative Trends

---

## 1. Information Architecture & Spatial Shell

The ERP application shell provides an intuitive, deterministic layout that remains consistent across all modules:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [Logo/Tenant] [Org/Branch Switcher] [Global Search Cmd+K] [Actions]│
├──────────────┬──────────────────────────────────────────────────────────────┤
│ SIDEBAR      │ MAIN WORKSPACE AREA                                          │
│ • Workspace  │ 1. Breadcrumbs: Operations / Sales / Orders / SO-2026-001    │
│ • Modules    │ 2. Page Header: Title, Status Badge, Primary Actions         │
│ • Favorites  │ 3. Filter Bar & Quick Search                                 │
│ • Recents    │ 4. Main Data Grid / Master-Detail Workspace                  │
│ • Admin      │ 5. Slide-Over Detail Drawer (Audit Trail & Workflow History) │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 2. Global Navigation & Command Palette (`Cmd+K`)

1. **Universal Command Palette (`Cmd+K` / `Ctrl+K`):**
   - Accessible from anywhere in the application.
   - **Three-Tier Fuzzy Search:**
     - *Navigation:* Quick-jump to any module or settings page (e.g., "Go to Chart of Accounts").
     - *Record Lookup:* Search documents, orders, customers, and parts by SKU, invoice #, or customer name (e.g., "SO-2026-001").
     - *Direct Actions:* Execute immediate operations without navigating (e.g., "Create Sales Order", "Toggle Dark Mode", "Export GL to CSV").
2. **Contextual Breadcrumbs:**
   - Always visible at the top of the workspace. Enables instant traversal up the organizational or document hierarchy.
3. **Workspace Switcher:**
   - Multi-organization operators can switch between Legal Entities and Branches in a single click with instant context reload.

---

## 3. High-Throughput Form & Data Entry Ergonomics

Enterprise operators enter thousands of rows daily. The form engine is optimized for keyboard efficiency:

1. **Auto-Advancing Grid Entry:**
   - Pressing `Enter` or `Tab` in a table cell commits the value and advances focus to the next cell. Pressing `Enter` on the last column automatically appends a new blank row.
2. **Draft Auto-Save & Recovery:**
   - Incomplete forms automatically persist draft state to browser indexedDB/localStorage every 5 seconds. If a browser tab is accidentally closed or network is lost, the form restores with an "Unsaved draft restored" banner.
3. **Optimistic UI Updates:**
   - State-mutating actions (e.g., ticking an approval checkbox, updating a quantity) update the UI immediately with a visual pending state while the background network mutation completes. If the request fails, the UI rolls back gracefully with an actionable error toast.

---

## 4. Workflows, Approvals & Slide-Over Drawers

1. **Slide-Over Inspection Drawers:**
   - Clicking a row in a data table opens an ergonomic right-side slide-over drawer (`<Sheet />`) displaying full document details, attached PDFs, and historical audit logs **without navigating away or losing the table scroll position**.
2. **Unified Approval Inbox:**
   - Consolidates all pending approval tasks across Procurement, Sales, Expenses, and Leave requests into a single unified triaging inbox with batch approval capabilities.

---

## 5. Global Keyboard Shortcuts

| Shortcut | Action | Scope |
| :---: | :--- | :--- |
| `Cmd + K` / `Ctrl + K` | Open Global Command Palette & Fuzzy Search | Global |
| `Cmd + S` / `Ctrl + S` | Save Current Record / Submit Form | Form Context |
| `Cmd + N` / `Ctrl + N` | Create New Record in Current Module | Module Context |
| `Escape` | Close Active Modal, Drawer, or Dropdown | Global |
| `?` | Open Keyboard Shortcuts Reference Sheet | Global |
| `J` / `K` or `Down` / `Up` | Move Selection Down / Up in Data Table | Data Table Context |
| `Enter` | Open Selected Row Details | Data Table Context |
| `E` | Export Active View to Excel / CSV | Data Table Context |
