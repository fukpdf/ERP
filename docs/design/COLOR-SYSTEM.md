# Universal ERP Color System & Semantic Palette

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Design Standard:** Semantic Color Roles with WCAG 2.1 AAA Accessibility Compliance  
**Rule:** Zero Arbitrary Hardcoded Hex Codes in Component Code

---

## 1. Semantic Color Philosophy

Colors in an enterprise ERP must communicate state, urgency, and operational boundaries unambiguously. Decorative or whimsical color usage is prohibited. All colors are resolved through **Semantic CSS Variables**.

```
State / Role       Light Mode Purpose                      Dark Mode Purpose
──────────────────────────────────────────────────────────────────────────────
Canvas / Base      Clean neutral backdrop (#F8FAFC)        Deep obsidian surface (#090D16)
Surface / Card     Crisp pure white (#FFFFFF)               Elevated panel (#111827)
Border / Line      Subtle structure separation (#E2E8F0)    Subtle dark boundary (#1F2937)
Brand / Primary    Commanding Electric Cobalt (#4D6BFE)     Vibrant Cobalt Blue (#6380FF)
Ink / Foreground   High-contrast legible slate (#0F172A)    Bright crisp text (#F8FAFC)
Success            Verified transaction green (#16A34A)     Emphasized emerald (#22C55E)
Warning            Low stock / Reorder amber (#D97706)      Vibrant amber warning (#F59E0B)
Destructive        Financial deficit / Void red (#DC2626)   Clear red alert (#EF4444)
Info               Audit telemetry cyan/sky (#0284C7)       Luminous sky blue (#38BDF8)
```

---

## 2. Complete Token Definitions (Light & Dark)

### 2.1 Light Theme Root Variables
```css
:root {
  /* Surfaces & Backgrounds */
  --erp-color-canvas: hsl(210, 40%, 98%);         /* Main body canvas */
  --erp-color-surface: hsl(0, 0%, 100%);          /* Cards, panels, modals */
  --erp-color-surface-subtle: hsl(210, 40%, 96%); /* Table headers, zebra rows */
  
  /* Borders & Dividers */
  --erp-color-border: hsl(214, 32%, 91%);         /* Standard borders */
  --erp-color-border-subtle: hsl(214, 32%, 95%);  /* Inner dividers */
  --erp-color-border-strong: hsl(215, 25%, 75%);  /* Input active borders */
  
  /* Text & Foreground */
  --erp-color-text-primary: hsl(222, 47%, 11%);   /* Primary titles, body text */
  --erp-color-text-secondary: hsl(215, 16%, 47%); /* Metadata, labels, breadcrumbs */
  --erp-color-text-muted: hsl(215, 16%, 65%);     /* Disabled text, placeholders */
  
  /* Brand & Interactive */
  --erp-color-primary: hsl(230, 98%, 65%);        /* Primary buttons, active tabs */
  --erp-color-primary-hover: hsl(230, 85%, 55%);
  --erp-color-primary-fg: hsl(0, 0%, 100%);
  
  /* Operational Status Badges */
  --erp-color-success-bg: hsl(142, 76%, 95%);
  --erp-color-success-fg: hsl(142, 72%, 29%);
  --erp-color-warning-bg: hsl(38, 92%, 95%);
  --erp-color-warning-fg: hsl(38, 92%, 35%);
  --erp-color-danger-bg: hsl(0, 86%, 97%);
  --erp-color-danger-fg: hsl(0, 74%, 42%);
  --erp-color-info-bg: hsl(199, 89%, 96%);
  --erp-color-info-fg: hsl(199, 89%, 36%);
}
```

### 2.2 Dark Theme Root Variables
```css
.dark {
  --erp-color-canvas: hsl(222, 47%, 7%);
  --erp-color-surface: hsl(217, 33%, 12%);
  --erp-color-surface-subtle: hsl(217, 33%, 15%);
  
  --erp-color-border: hsl(217, 33%, 20%);
  --erp-color-border-subtle: hsl(217, 33%, 16%);
  --erp-color-border-strong: hsl(217, 33%, 35%);
  
  --erp-color-text-primary: hsl(210, 40%, 98%);
  --erp-color-text-secondary: hsl(215, 20%, 70%);
  --erp-color-text-muted: hsl(215, 20%, 50%);
  
  --erp-color-primary: hsl(230, 98%, 68%);
  --erp-color-primary-hover: hsl(230, 98%, 75%);
  --erp-color-primary-fg: hsl(0, 0%, 100%);
  
  --erp-color-success-bg: hsl(142, 70%, 15%);
  --erp-color-success-fg: hsl(142, 70%, 65%);
  --erp-color-warning-bg: hsl(38, 70%, 15%);
  --erp-color-warning-fg: hsl(38, 70%, 65%);
  --erp-color-danger-bg: hsl(0, 70%, 15%);
  --erp-color-danger-fg: hsl(0, 70%, 65%);
  --erp-color-info-bg: hsl(199, 70%, 15%);
  --erp-color-info-fg: hsl(199, 70%, 65%);
}
```

---

## 3. Contrast Ratios & Accessibility Compliance

1. **Normal Text (Body & Data Grids):** Minimum **4.5:1** contrast ratio against surrounding surface.
2. **Large Text & Headings:** Minimum **3.0:1** contrast ratio.
3. **Interactive Controls & Focus Rings:** Minimum **3.0:1** contrast ratio against background.
4. **High Contrast Mode:** An optional user preference setting that boosts all borders to 2px solid and achieves **7.0:1 (WCAG AAA)** contrast across all text elements.
