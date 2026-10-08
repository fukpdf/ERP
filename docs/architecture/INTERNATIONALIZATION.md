# Internationalization, Localization & RTL Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Global Operational Reach with Native Multilingual & Multi-Jurisdictional Precision  
**Standard:** Unicode CLDR, ISO 8601, ISO 4217, W3C Internationalization Standards

---

## 1. Foundational Internationalization Doctrine

Internationalization (i18n) and Localization (l10n) are **architectural invariants** of the Universal ERP platform, not cosmetic presentation layers. The platform must operate identically across languages, scripts, reading directions, numbering conventions, calendar systems, and tax jurisdictions.

```
Incoming User / Request Context
              │
              ▼
    [ Context Resolver ] ──► Extracts: Language, Country/Region, Locale,
              │                        Timezone, Currency, Reading Direction
              ▼
    ┌─────────────────────────┬─────────────────────────┐
    ▼                         ▼                         ▼
[ UI Locale Manager ]   [ Number & Currency ]    [ Date & Temporal ]
• Namespace JSON i18n   • Unicode CLDR Format    • UTC normalization
• CSS Logical Props     • Precision matrix       • Multi-calendar
• RTL Layout Engine     • Symbol placement       • Timezone offset
```

---

## 2. Multi-Dimensional Locale Architecture

A user context combines four independent localized dimensions:
1. **Language (`lang`):** BCP 47 code (e.g., `en`, `ar`, `de`, `fr`, `ja`, `zh-Hans`, `ur`). Governs UI text and message translations.
2. **Territory / Region (`region`):** ISO 3166-1 alpha-2 code (e.g., `US`, `GB`, `DE`, `SA`, `IN`, `JP`). Governs tax rules, legal compliance, and statutory formats.
3. **Number & Formatting Locale (`formatLocale`):** Unicode locale identifier (e.g., `de-DE` for `1.234,56 €`, `en-IN` for `₹ 1,23,456.00`). Governs decimal separators, digit grouping, and currency symbols.
4. **Time Zone (`timezone`):** IANA Time Zone Database string (e.g., `America/New_York`, `Europe/Berlin`, `Asia/Riyadh`).

---

## 3. Monetary & Numeric Formatting Engine

### 3.1 Currency Decimal Precision Matrix
The platform strictly enforces native decimal precision per currency (ISO 4217):
- **Zero Decimals (Minor Unit = 1):** Japanese Yen (`JPY`), South Korean Won (`KRW`), Chilean Peso (`CLP`).
- **Two Decimals (Minor Unit = 100):** US Dollar (`USD`), Euro (`EUR`), British Pound (`GBP`), Swiss Franc (`CHF`).
- **Three Decimals (Minor Unit = 1000):** Kuwaiti Dinar (`KWD`), Bahraini Dinar (`BHD`), Omani Rial (`OMR`).

### 3.2 Digit Grouping & Non-Western Number Systems
- **Standard International (Thousands Grouping):** `1,000,000.00`
- **Indian Numbering System (Lakh & Crore):** `10,00,000.00` (10 Lakhs)
- **Continental European Format:** `1.000.000,00`

---

## 4. Date, Time & Calendar Architecture

1. **Storage Invariant:** All temporal fields in database tables **must be stored in UTC** (`TIMESTAMPTZ`).
2. **Presentation Context:** Dates and times are converted to the user's or branch's designated IANA timezone only at the presentation boundary.
3. **Multi-Calendar Engine:**
   - Gregorian Calendar (Default International Standard).
   - Umm al-Qura Hijri Calendar (Saudi Arabia & Islamic Jurisdictions).
   - Solar Hijri Calendar (Iran & Afghanistan).
   - Japanese Era Calendar (Reiwa Imperial System).

---

## 5. Right-to-Left (RTL) First-Class Architecture

Arabic, Hebrew, Persian, and Urdu read from right to left. The platform guarantees **spatial and visual equality** for RTL languages:

### 5.1 CSS Logical Properties (Mandatory Rule)
Physical directional CSS properties (`left`, `right`, `margin-left`, `padding-right`, `border-left`) are **strictly prohibited**. Developers must use CSS Logical Properties:

```css
/* PROHIBITED (Breaks RTL) */
.stat-card { margin-left: 16px; padding-right: 24px; text-align: left; }

/* MANDATORY (Automatically adapts to LTR and RTL) */
.stat-card { margin-inline-start: 16px; padding-inline-end: 24px; text-align: start; }
```

### 5.2 Directional Iconography Rules
- **Bidirectional Mirrors:** Navigation chevrons (`>`, `<`), back buttons, breadcrumb separators, and progress bars mirror horizontally in RTL (`transform: scaleX(-1)` or dynamic icon swap).
- **Asymmetric Universal Icons:** Clocks, checkmarks, download icons, and currency symbols do **not** mirror.

---

## 6. Translation Architecture & Dynamic Content

1. **Static UI String Namespaces:** UI strings are partitioned by domain into lightweight JSON catalogs (`common.json`, `sales.json`, `inventory.json`, `errors.json`) loaded on-demand.
2. **Dynamic Translatable Content:** For database entities that require translation (e.g., Product Names, Category Titles, Invoicing Payment Terms), the platform provides a normalized `entity_translations` table:
   ```sql
   CREATE TABLE entity_translations (
       entity_id UUID NOT NULL,
       entity_type VARCHAR(64) NOT NULL, -- 'product', 'category', etc.
       field_name VARCHAR(64) NOT NULL,   -- 'name', 'description'
       locale VARCHAR(16) NOT NULL,       -- 'ar-SA', 'de-DE', 'fr-FR'
       translation TEXT NOT NULL,
       PRIMARY KEY (entity_id, entity_type, field_name, locale)
   );
   ```
3. **Locale Fallback Chain:**
   $$\text{User Variant (e.g., ar-EG)} \longrightarrow \text{Base Language (ar)} \longrightarrow \text{System Fallback (en-US)}$$
