# Phase 8 — Scale and Ecosystem Contract

## Scope
Phase 8 implements repository-level contracts for horizontal scaling, durable work execution, tenant-safe caching, API evolution, deterministic placement, provider adapters, and ecosystem integration boundaries.

## Required invariants
- Queue jobs are idempotent, retry-bounded, and dead-letterable.
- Cache keys are tenant-scoped and TTL-bounded.
- API versions are explicit; pagination cursors are opaque and validated.
- Placement uses only healthy targets and deterministic weighted selection.
- Provider implementations remain behind capability adapters.
- Tenant/correlation context crosses every asynchronous/provider boundary.
- No Phase 8 abstraction bypasses existing RBAC, tenant RLS, audit, or security boundaries.

## Explicit non-claims
Repository contracts do not prove production throughput, multi-region failover, real provider credentials, or a production cache/queue cluster. Those require runtime/deployment evidence.
