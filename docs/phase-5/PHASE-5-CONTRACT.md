# Phase 5 — Billing, Subscription & Entitlements Contract

**Branch:** `erp-development`

## Scope
Phase 5 provides a provider-neutral commercial/billing foundation for ERP instances. It stores billing state and provider references without storing raw card data or payment credentials.

## Invariants
1. Every subscription belongs to exactly one tenant and one ERP instance.
2. An ERP instance has at most one subscription.
3. Subscription plans are global catalog records; tenant sessions may read active plan catalog data, while writes remain control-plane only.
4. Subscription, invoice, invoice-line, payment, and entitlement records are tenant-isolated with FORCE RLS.
5. Billing foreign references must remain same-tenant; database triggers reject cross-tenant references.
6. Payment operations are idempotent per tenant/provider/idempotency key.
7. External provider identifiers are references only; raw card numbers, CVVs, bank credentials, or provider secrets are never persisted by this foundation.
8. Subscription lifecycle transitions fail closed when invalid.
9. Entitlement use requires ACTIVE status and a valid time window.
10. Monetary values use fixed-precision database decimals.
11. Provider-specific API calls/webhooks are intentionally outside the deterministic billing core until a real provider and runtime environment are configured.
12. Billing state changes must be auditable through the existing platform/control-plane audit architecture when production service wiring is added.

## Runtime gate
Runtime completion requires:
- empty-PostgreSQL migration;
- cross-tenant RLS tests;
- cross-tenant FK guard rejection;
- concurrent payment idempotency test;
- subscription lifecycle persistence;
- invoice/payment state transitions;
- entitlement expiry tests;
- real provider webhook signature/idempotency tests once a provider is configured.
