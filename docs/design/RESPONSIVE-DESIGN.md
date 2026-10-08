# Responsive Design & Display Hierarchy

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Flawless Display across Devices from Mobile Handhelds to Ultra-Wide Enterprise Desks  
**Standard:** Mobile-Aware, Desktop-First Enterprise Optimization

---

## 1. Breakpoint Taxonomy

Enterprise ERP systems are predominantly operated on large desktop screens, but warehouse barcode scanning, executive approvals, and field service require seamless mobile and tablet experiences:

```css
/* Breakpoint Scale */
--erp-bp-mobile:     640px;   /* Phone portrait & small landscape (< 640px) */
--erp-bp-tablet:     768px;   /* Tablets & warehouse handheld scanners */
--erp-bp-laptop:     1024px;  /* Laptops & compact workstations */
--erp-bp-desktop:    1280px;  /* Standard office desktop monitors */
--erp-bp-wide:       1536px;  /* Large enterprise displays (1080p Full HD) */
--erp-bp-ultrawide:  1920px;  /* Multi-pane 4K & Ultra-Wide accounting desks */
```

---

## 2. Layout Adaptations by Form Factor

### 2.1 Mobile Viewports (< 768px)
- **Collapsible Off-Canvas Navigation:** The main navigation sidebar tucks into a sliding off-canvas drawer accessed via a hamburger menu.
- **Table Adaptations:** Complex multi-column data tables provide smooth horizontal scrolling with sticky left-most identifier columns (e.g., Order # remains fixed while scrolling line item details).
- **Form Layouts:** Two-column grid layouts collapse into single-column vertical flows.
- **Bottom Action Sheets:** Action menus and filters open as bottom drawers (`<Drawer />`) for ergonomic thumb access.

### 2.2 Standard & Large Desktop (1024px – 1536px)
- **Persistent Pinned Sidebar:** Primary navigation sidebar stays pinned for instant access.
- **Multi-Panel Workspaces:** Two-column split views (e.g., Master list on the left, active record details and audit timeline on the right).
- **Dense Grid Layouts:** 4-column statistical dashboard cards, wide data tables showing 8–12 columns without horizontal scroll.

### 2.3 Ultra-Wide & Multi-Monitor Workstations (>= 1920px)
- **Max Content Ceilings:** Content containers enforce an ergonomic max-width (`max-width: 1920px; margin-inline: auto`) to prevent line lengths from stretching excessively across 4K monitors.
- **Dockable Multi-Window Layouts:** Financial analysts can pop out sub-ledgers or report previews into auxiliary browser windows or side-by-side dock panels.
