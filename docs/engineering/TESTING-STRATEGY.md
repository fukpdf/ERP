# Enterprise Testing Strategy & Quality Assurance Framework

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** High-Confidence, Zero-Regression Enterprise Verification  
**Standard:** 100% Truthful, Evidence-Based Verification. Zero Fake Tests.

---

## 1. Testing Philosophy & Non-Negotiable Invariants

In an enterprise ERP where software errors can cause financial insolvency, regulatory sanctions, or medical errors, testing is an **existential engineering discipline**:

1. **Zero Fake Tests:** Tests that assert trivial tautologies (`expect(true).toBe(true)`), mock out the entire system under test, or skip actual assertions are **prohibited and classified as engineering malpractice**.
2. **Real Database Testing:** Integration and repository tests must execute against a real PostgreSQL instance (via test containers or isolated test databases), never in-memory mocks that fail to replicate PostgreSQL constraint semantics and RLS.
3. **No Flaky Tests:** Any test exhibiting non-deterministic behavior is quarantined immediately, triaged, and resolved.

---

## 2. The Enterprise Testing Pyramid

```
                       ▲
                      / \
                     /   \     E2E Journeys (Playwright): Order-to-Cash, Procure-to-Pay
                    /     \    Security & Penetration Suites (OWASP, RBAC Bypass)
                   /───────\   Performance & Load Benchmarks (k6, 500 VUs)
                  /         \  Tenant Isolation & RLS Verification
                 /───────────\ Database & Migration Suites (Real PostgreSQL)
                /             \ Contract Integration Tests (Module Boundaries)
               /───────────────\
              /                 \ Unit & Domain Invariant Tests (Pure Math, Calculations)
             /───────────────────\
```

---

## 3. Test Suites by Category

### 3.1 Domain Unit Tests
- **Scope:** Pure business entities, money arithmetic, currency conversions, tax rules, inventory invariants.
- **Characteristics:** Zero database access, zero network calls, sub-millisecond execution.
- **Coverage Target:** 100% branch coverage on financial and invariant calculation logic.

### 3.2 Database & Tenant Isolation Tests
- **Tenant Leakage Assertions:** Tests explicitly authenticate as Tenant A, insert records, and then query the database as Tenant B to verify that 0 records are returned under Row-Level Security.
- **ACID Transaction Rollback:** Tests trigger mid-operation failures (e.g., simulated network timeout during line item insert) and assert that the parent document was rolled back cleanly.
- **Optimistic Concurrency:** Tests simulate concurrent updates to the same entity and verify that `OptimisticLockError` is thrown when versions conflict.

### 3.3 Security & Authorization Test Suite
- **Permission Bypass Tests:** Attempts every API endpoint without credentials (asserts 401) and with insufficient roles (asserts 403).
- **Separation of Duties (SoD) Tests:** Tests verify that when a user creates a purchase order, an approval attempt by the same user ID is rejected.
- **Injection & Fuzzing:** Automated submission of SQL injection payloads (`' OR 1=1 --`), XSS vectors (`<script>alert(1)</script>`), and SSRF targets (`http://169.254.169.254/`).

### 3.4 End-to-End (E2E) Critical Journeys
Automated Playwright tests verifying complete multi-step business cycles:
1. **Order-to-Cash (O2C):** Create Customer -> Issue Sales Order -> Reserve Stock -> Dispatch Goods -> Generate Invoice -> Post Customer Payment -> Verify General Ledger Balance.
2. **Procure-to-Pay (P2P):** Create Requisition -> Issue Purchase Order -> Receive Goods (GRN) -> Ingest Vendor Bill -> Execute 3-Way Match -> Authorize Payment Run.
3. **Period Close:** Post Adjusting Journals -> Calculate FX Revaluation -> Close Fiscal Month -> Lock Period -> Verify Trial Balance Debits == Credits.

### 3.5 Automated Accessibility (a11y) Testing
- Every PR runs automated `axe-core` checks against rendered components, failing if any WCAG 2.1 AA violation is detected.
