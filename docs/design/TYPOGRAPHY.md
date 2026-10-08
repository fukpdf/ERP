# Enterprise Typography Specification

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Design Standard:** Multi-Script International Typography with Tabular Numeric Rigor  
**Primary Engine:** Native Web & Google Fonts with Zero-FOUC Optimization

---

## 1. Font Family Architecture

The typography system pairs high-legibility Grotesque sans-serif typefaces for application UI with specialized international fonts and monospace engines for financial ledgers:

```css
:root {
  /* UI Sans-Serif Stack (Latin, Cyrillic, Greek) */
  --erp-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  
  /* Monospace & Tabular Data Stack (Financial Ledgers, SKUs, UUIDs, IBANs) */
  --erp-font-mono: 'JetBrains Mono', 'Fira Code', 'Roboto Mono', Menlo, Monaco, Consolas, monospace;
  
  /* Arabic Script Stack */
  --erp-font-arabic: 'IBM Plex Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, sans-serif;
  
  /* East Asian Script Stacks */
  --erp-font-cjk: 'Noto Sans SC', 'Noto Sans JP', 'Noto Sans KR', sans-serif;
}
```

---

## 2. Modular Type Scale

All type sizes are mapped to standardized semantic scale tokens:

| Token Name | Font Size | Line Height | Letter Spacing | Semantic Role |
| :--- | :---: | :---: | :---: | :--- |
| `--erp-text-3xs` | 10 px (0.625rem) | 14 px | +0.05em | Micro badges, status dot indicators, legal disclaimers |
| `--erp-text-2xs` | 11 px (0.6875rem)| 16 px | +0.02em | Compact table cells, sidebar labels, field helper text |
| `--erp-text-xs`  | 12 px (0.75rem)  | 18 px | 0.00em | Standard table cells, form labels, tooltips |
| `--erp-text-sm`  | 13 px (0.8125rem)| 20 px | 0.00em | Default body text (Compact Density), button text |
| `--erp-text-base`| 14 px (0.875rem) | 22 px | 0.00em | Default body text (Comfortable Density), form inputs |
| `--erp-text-md`  | 16 px (1.0rem)   | 24 px | -0.01em | Panel titles, modal headers, highlighted metrics |
| `--erp-text-lg`  | 18 px (1.125rem) | 26 px | -0.01em | Section headers, card titles |
| `--erp-text-xl`  | 20 px (1.25rem)  | 28 px | -0.02em | Page headers, primary KPIs |
| `--erp-text-2xl` | 24 px (1.5rem)   | 32 px | -0.03em | Primary dashboard headers, hero metrics |
| `--erp-text-3xl` | 30 px (1.875rem) | 38 px | -0.04em | High-impact analytics headline numbers |

---

## 3. Tabular Numeric Alignment Rule

In financial and inventory applications, decimal points and digits must align vertically across thousands of table rows.

**Mandatory Rule:** All numbers, quantities, monetary values, timestamps, and codes in tables, summaries, and inputs **must enable tabular numbers**:

```css
.tabular-nums, .data-table td.numeric, .stat-card strong {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
}
```

---

## 4. Text Truncation & Overflow Safety

Enterprise tables often receive unpredictably long strings (e.g., German composite nouns, long supplier names).
- Cells must use `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`.
- Truncated cells must provide an automatic HTML `title` or Radix `Tooltip` revealing the full text on hover/focus.
