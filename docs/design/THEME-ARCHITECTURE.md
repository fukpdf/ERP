# Enterprise Theme Architecture & Multi-Tenancy Customization

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Dynamic Theme Switching & White-Label Tenant Customization  
**Engine:** Zero-FOUC CSS Custom Property Injection

---

## 1. Theme Mode Resolution

The platform supports **Four Standard Theme Modes**:
1. **Light Mode (Default):** Clean slate canvas with crisp white cards for bright office environments.
2. **Dark Mode:** Deep obsidian canvas with elevated panels for low-light trading and monitoring desks.
3. **High Contrast Mode:** Pure black-and-white borders and maximum contrast text meeting WCAG AAA (7.0:1) criteria.
4. **System Automatic:** Synchronizes dynamically with the user's OS preference via `@media (prefers-color-scheme: dark)`.

Theme switching executes dynamically by toggling the class on the `<html>` root element (`class="dark"`) with **zero page reloads** and zero flash of unstyled content (FOUC).

---

## 2. White-Label & Tenant Customization Architecture

Enterprise tenants require white-label customization (logos, primary brand color) without compromising accessibility contrast guarantees:

```
[ Tenant Admin Sets Primary Brand: #1E40AF ]
                    │
                    ▼
       [ Color Contrast Guard ]
 (Validates that #1E40AF against white achieves >= 4.5:1 ratio)
                    │
                    ▼
     [ Dynamic Token Generation ]
 ├── Generates --erp-color-primary: #1E40AF
 ├── Calculates hover tint: #1D4ED8
 ├── Calculates focus ring: #3B82F6
 └── Generates accessible foreground text (white vs black)
                    │
                    ▼
      [ Injected Tenant CSS Block ]
```

### Safety Guardrail:
If a tenant administrator attempts to select a brand color with insufficient contrast (e.g., light yellow text on white background), the system automatically rejects the selection or dynamically shifts the luminosity until the WCAG 2.1 AA contrast threshold is satisfied.
