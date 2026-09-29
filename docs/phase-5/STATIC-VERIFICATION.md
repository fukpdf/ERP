# Phase 5 — Static Verification

## Final static checks
- 6 Phase-5 Prisma models added.
- Tenant reverse relations exist for all tenant-scoped billing records.
- ERP instance ↔ subscription is one-to-one.
- Subscription plan ↔ subscription relation is bidirectional.
- 6/6 Phase-5 tables use FORCE RLS.
- 6/6 Phase-5 policies contain USING + WITH CHECK.
- Subscription plan reads are permitted to tenant sessions, but plan writes require the dedicated control-plane role.
- 5 database same-tenant reference triggers protect subscription, invoice, invoice-line, payment, and entitlement relationships.
- Payment idempotency is enforced by a database uniqueness constraint.
- Deterministic billing package tests exist.
- No raw payment-card data fields exist in the Phase-5 schema.
- No provider credentials are embedded.
