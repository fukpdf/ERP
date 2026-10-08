# Module Lifecycle & Deployment State Machine

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Safe Installation, Migration, Upgrades, and Retirement of ERP Modules  
**Standard:** Zero-Downtime Blue/Green Schema Migration Protocol

---

## 1. Lifecycle State Machine

Every business module transitions through an explicit, auditable operational state machine:

```
[ UNINSTALLED ]
       │
       ▼ (Install Command: Validate Manifest & Dependencies)
[ INSTALLED ]
       │
       ▼ (Run Database Migrations: Expand Phase)
[ MIGRATED ]
       │
       ▼ (Enable for Tenant: Register Routes & Events)
[ ACTIVE ] ◄──────────────┐
       │                  │
       ▼ (Disable Toggle) │ (Re-enable)
[ DISABLED ] ─────────────┘
       │
       ▼ (Upgrade Command: Run Contract Compatibility Check)
[ UPGRADING ]
       │
       ▼ (Deprecate Command: Mark Read-Only)
[ DEPRECATED ]
       │
       ▼ (Uninstall Command: Archive Data & Drop Extension Points)
[ RETIRED ]
```

---

## 2. Zero-Downtime Database Migration Protocol (Expand/Contract)

When upgrading a module's database schema across thousands of active tenants, blocking schema locks are prohibited:

### Phase 1: Expand
- Add new nullable columns, new tables, or new views.
- Existing code continues to read from old columns and write to both old and new columns via dual-write database triggers or application adapters.

### Phase 2: Migrate
- Backfill historical data in small, non-blocking batches with rate limiting to avoid replica lag.

### Phase 3: Contract
- Deploy new module code that reads and writes exclusively to the new schema.
- Drop obsolete columns or triggers in a subsequent maintenance window after confirming application stability.

---

## 3. Health Checks & Circuit Breakers

1. **Continuous Liveness & Readiness Probes:**
   - Every module registers a `/health/module/[name]` diagnostic endpoint verifying database table connectivity, cache latency, and external adapter availability.
2. **Circuit Breakers for External Integrations:**
   - Modules integrating third-party APIs (e.g., Peppol gateway, tax rate feeds, payment gateways) wrap calls in a Netflix Hystrix-style circuit breaker.
   - If error rate exceeds 50% over a 10-second rolling window, the circuit trips to `OPEN`, immediately returning graceful fallbacks or queuing requests in the retry outbox without blocking user threads.
