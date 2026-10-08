# Enterprise Design Tokens Specification

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Token Standard:** W3C Design Tokens Community Group Specification  
**Architecture:** 3-Tier Hierarchical Token Resolution (Primitive -> Semantic -> Component)

---

## 1. Token Naming Hierarchy

All design tokens follow a strict BEM-inspired kebab-case naming standard:
`--erp-[category]-[concept]-[property]-[variant]`

```
Tier 1: Global Primitives ──► Tier 2: Semantic System ──► Tier 3: Component Scoped
(e.g., --erp-blue-500)         (e.g., --erp-color-primary)  (e.g., --erp-button-bg-primary)
```

---

## 2. Token Catalogs

### 2.1 Spacing & Layout Tokens
```css
:root {
  --erp-space-3xs: 2px;
  --erp-space-2xs: 4px;
  --erp-space-xs:  8px;
  --erp-space-sm:  12px;
  --erp-space-md:  16px;
  --erp-space-lg:  24px;
  --erp-space-xl:  32px;
  --erp-space-2xl: 48px;
  --erp-space-3xl: 64px;
}
```

### 2.2 Border Radius Tokens
```css
:root {
  --erp-radius-none: 0px;
  --erp-radius-sm:   4px;  /* Badges, tags, dense buttons */
  --erp-radius-md:   6px;  /* Form inputs, select dropdowns */
  --erp-radius-lg:   8px;  /* Cards, panels, modals */
  --erp-radius-xl:   12px; /* Large floating drawers */
  --erp-radius-full: 9999px; /* Avatars, pill status indicators */
}
```

### 2.3 Elevation & Shadow Tokens
```css
:root {
  --erp-shadow-none: none;
  --erp-shadow-xs:   0 1px 2px 0 rgba(16, 24, 40, 0.05);
  --erp-shadow-sm:   0 1px 3px 0 rgba(16, 24, 40, 0.1), 0 1px 2px 0 rgba(16, 24, 40, 0.06);
  --erp-shadow-md:   0 4px 8px -2px rgba(16, 24, 40, 0.1), 0 2px 4px -2px rgba(16, 24, 40, 0.06);
  --erp-shadow-lg:   0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03);
  --erp-shadow-xl:   0 20px 24px -4px rgba(16, 24, 40, 0.1), 0 8px 8px -4px rgba(16, 24, 40, 0.04);
}
```

### 2.4 Z-Index Hierarchy Tokens
```css
:root {
  --erp-z-deep:      -1;
  --erp-z-base:       0;
  --erp-z-docked:     10; /* Sticky table headers */
  --erp-z-dropdown:   1000;
  --erp-z-sticky:     1100; /* Sticky topbars */
  --erp-z-banner:     1200;
  --erp-z-drawer:     1300;
  --erp-z-backdrop:   1400;
  --erp-z-modal:      1500;
  --erp-z-popover:    1600;
  --erp-z-toast:      1700; /* Floating notification toasts */
  --erp-z-tooltip:    1800;
}
```
