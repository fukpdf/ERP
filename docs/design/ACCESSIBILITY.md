# Enterprise Accessibility (a11y) Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Compliance Target:** W3C Web Content Accessibility Guidelines (WCAG) 2.1 Level AA Mandatory, Level AAA Desirable  
**Standard:** Section 508 & European Accessibility Act (EN 301 549) Compliance

---

## 1. Core Accessibility Principles

Accessibility in enterprise software is both an ethical mandate and a legal requirement for public sector and multinational enterprise procurement.

```
┌─────────────────────────────────────────────────────────────┐
│                 FOUR PRINCIPLES OF WCAG                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Perceivable:  High contrast, screen reader labels, a11y  │
│ 2. Operable:     100% Keyboard navigation, no keyboard traps │
│ 3. Understandable: Deterministic error messages, clear flows│
│ 4. Robust:       Semantic HTML5, standard ARIA landmarks    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Keyboard Navigation & Focus Management

1. **Focus Ring Architecture:**
   - Universal high-visibility focus ring:
     `outline: 2px solid var(--erp-color-primary); outline-offset: 2px;`
   - Using `:focus-visible` ensures focus rings only appear during keyboard navigation, maintaining a clean visual interface during mouse interaction.
2. **Logical Tab Sequence:**
   - Forms and screens must follow a strict reading-order tab sequence. Arbitrary `tabindex > 0` is strictly prohibited.
3. **Skip-to-Content Link:**
   - Every page provides a hidden-until-focused skip link at the top of the DOM:
     `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>`
4. **Data Grid Arrow Navigation (Roving TabIndex):**
   - High-density data tables support Excel-style arrow key navigation between table cells (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`).

---

## 3. Screen Reader Support & ARIA Landmarks

1. **Semantic Page Structure:**
   - Top navigation: `<header role="banner">`
   - Main content: `<main id="main-content" role="main">`
   - Sidebar navigation: `<nav aria-label="Main Navigation">`
   - Auxiliary details: `<aside aria-label="Contextual Help">`
2. **Live Announcements (`aria-live`):**
   - Notification toasts, asynchronous background task completions, and form submission errors are announced through an `aria-live="polite"` region.
   - High-urgency security alerts and session expiration warnings use `aria-live="assertive"`.
3. **Form Error Association:**
   - Invalid fields automatically bind to error text via `aria-describedby="[field-id]-error"` and `aria-invalid="true"`.
