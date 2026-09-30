# Phase 5 — Implementation Status

**Date:** 2026-09-29  
**Branch:** `erp-development`

Implemented:
- Subscription plan catalog.
- ERP-instance subscription.
- Invoice and invoice-line records.
- Payment ledger with provider-neutral reference fields.
- Entitlement records.
- Billing enums and indexes.
- Tenant RLS with FORCE RLS.
- Control-plane-only plan writes with tenant-readable catalog.
- Database same-tenant billing reference guards.
- Payment idempotency constraint.
- Deterministic billing package.
- Subscription lifecycle, entitlement-window, payment-idempotency and money-validation tests.

Not claimed:
- No payment provider integration is claimed.
- No card/payment credentials are stored.
- No live payment charge is claimed.
- No runtime PostgreSQL result is fabricated.
- No lockfile is fabricated.
