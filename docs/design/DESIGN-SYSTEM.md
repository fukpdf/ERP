# Universal ERP Design System Constitution

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Design Direction:** Premium, International, Enterprise, Clean, Fast, Accessible, Professional  
**Primary Mandate:** High-Productivity Operational Workspaces over Decorative Trends

---

## 1. Design Philosophy & Core Principles

The Universal ERP user interface is engineered for professional operators managing high-stakes enterprise workflows: accountants reconciling journals, logistics coordinators managing cross-dock transfers, and surgeons verifying instrument counts. Every visual and interactive decision is optimized for **speed, accuracy, cognitive clarity, and sustained focus**.

```
┌─────────────────────────────────────────────────────────────┐
│                 ENTERPRISE DESIGN PILLARS                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Maximum Information Density with High Scannability       │
│ 2. Predictable, Deterministic Spatial Hierarchy             │
│ 3. Keyboard-First Operational Velocity                      │
│ 4. Universal Cultural & Reading Direction Neutrality        │
│ 5. Sub-16ms Frame Budget & Smooth State Transitions         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Architecture & Component Stack

1. **Styling Engine:** Tailwind CSS v4 using CSS Custom Properties (Design Tokens) defined in root themes.
2. **Accessible Primitives:** Headless accessible primitives powered by `@radix-ui/react-*` ensuring WCAG 2.1 AA compliance (ARIA landmarks, focus management, screen reader announcements).
3. **Typography Engine:** Internationalized font stacks pairing crisp grotesque sans-serifs (`Inter`, `Plus Jakarta Sans`) with specialized non-Latin typefaces (`IBM Plex Sans Arabic`, `Noto Sans JP/KR`).
4. **Color Tokens:** Semantic HSL color scales supporting Light Mode, Dark Mode, and High Contrast Mode.

---

## 3. Density Modes for Diverse Workspaces

Enterprise users operate across diverse display environments—from touch tablets on warehouse floors to multi-monitor trading and accounting desks. The design system supports **Three Dynamic Density Modes**:

| Dimension | Compact Density (High-Throughput) | Comfortable Density (Standard) | Spacious Density (Touch/Tablet) |
| :--- | :---: | :---: | :---: |
| **Target User** | Accountants, Traders, Data Entry | General Management, CRM, Approvers | Warehouse Operators, Point-of-Sale |
| **Row Height** | 32 px | 44 px | 56 px |
| **Base Font Size** | 12 px (0.75rem) | 14 px (0.875rem) | 16 px (1.0rem) |
| **Form Input Padding** | `padding-block: 4px` | `padding-block: 8px` | `padding-block: 12px` |
| **Visible Grid Rows** | 25–35 rows per viewport | 12–18 rows per viewport | 8–10 rows per viewport |
