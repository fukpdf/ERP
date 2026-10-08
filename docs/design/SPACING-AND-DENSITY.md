# Spacing & Operational Density Specification

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Design Standard:** 4px Strict Baseline Grid with Dynamic Ergonomic Density Modes  
**Optimization Target:** High-Efficiency Enterprise Data Density without Visual Clutter

---

## 1. The 4px Baseline Grid

All margins, paddings, gap dimensions, component heights, and icon sizes are strict multiples of **4 pixels**:

$$\text{Dimension} = n \times 4\text{ px} \quad (n \in \{0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24\})$$

```css
--erp-grid-half: 2px;  /* Micro-alignments */
--erp-grid-1:    4px;
--erp-grid-2:    8px;
--erp-grid-3:    12px;
--erp-grid-4:    16px;
--erp-grid-6:    24px;
--erp-grid-8:    32px;
--erp-grid-12:   48px;
--erp-grid-16:   64px;
```

---

## 2. Dynamic Operational Density Modes

Density modes allow users to adapt their workspace layout dynamically via a global toggle without breaking responsive rules:

```html
<!-- Set on root html or specific workspace container -->
<html data-density="compact">    <!-- Accounting, high-density data entry -->
<html data-density="comfortable"> <!-- Default balanced operational view -->
<html data-density="spacious">   <!-- Touch tablets, warehouse kiosks -->
```

### 2.1 Component Spacing Breakdown by Density

| Component / Layout Unit | Compact Mode (`data-density="compact"`) | Comfortable Mode (`data-density="comfortable"`) | Spacious Mode (`data-density="spacious"`) |
| :--- | :---: | :---: | :---: |
| **Table Row Height** | 32 px | 44 px | 56 px |
| **Table Cell Padding** | `padding: 6px 12px` | `padding: 12px 16px` | `padding: 16px 20px` |
| **Form Input Height** | 30 px | 38 px | 48 px |
| **Form Input Padding** | `padding: 4px 8px` | `padding: 8px 12px` | `padding: 12px 16px` |
| **Button Height (Sm / Md / Lg)** | 28 px / 32 px / 36 px | 32 px / 40 px / 48 px | 40 px / 48 px / 56 px |
| **Card / Panel Padding** | 16 px | 24 px | 32 px |
| **Form Field Gap** | 10 px | 16 px | 24 px |
| **Grid Gap (Dashboards)** | 12 px | 20 px | 28 px |

---

## 3. CSS Variable Implementation of Density

```css
:root {
  --erp-row-height: 44px;
  --erp-cell-padding-y: 12px;
  --erp-cell-padding-x: 16px;
  --erp-input-height: 38px;
  --erp-input-padding-y: 8px;
}

[data-density="compact"] {
  --erp-row-height: 32px;
  --erp-cell-padding-y: 6px;
  --erp-cell-padding-x: 12px;
  --erp-input-height: 30px;
  --erp-input-padding-y: 4px;
}

[data-density="spacious"] {
  --erp-row-height: 56px;
  --erp-cell-padding-y: 16px;
  --erp-cell-padding-x: 20px;
  --erp-input-height: 48px;
  --erp-input-padding-y: 12px;
}
```
