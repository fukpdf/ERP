# Enterprise Performance Budgets & Telemetry Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Sub-Second Operational Velocity at Scale  
**Enforcement:** Automated CI/CD Performance Gates & OpenTelemetry Tracking

---

## 1. Concrete Performance Budgets

To guarantee that the platform maintains high responsiveness across small businesses and global enterprises, the architecture establishes **Strict Measurable Performance Budgets**:

| Metric / Dimension | Strict Budget Threshold | Target SLA | Measurement Method |
| :--- | :---: | :---: | :--- |
| **First Contentful Paint (FCP)** | $< 1.0\text{ s}$ | p95 | Lighthouse CI / Real User Monitoring (RUM) |
| **Largest Contentful Paint (LCP)** | $< 1.8\text{ s}$ | p95 | Web Vitals Telemetry |
| **Time to Interactive (TTI)** | $< 2.0\text{ s}$ | p95 | Web Vitals Telemetry |
| **Client Route Navigation** | $< 150\text{ ms}$ | p95 | Browser Performance API |
| **Dynamic Module Chunk Load** | $< 300\text{ ms}$ | p95 | Network Waterfall Analysis |
| **API Latency (OLTP Endpoints)** | $< 50\text{ ms}$ (p50), $< 150\text{ ms}$ (p95) | 99.9% | OpenTelemetry APM Tracing |
| **Single Database Query (OLTP)** | $< 10\text{ ms}$ | p95 | PostgreSQL `pg_stat_statements` |
| **Report Query Execution** | $< 500\text{ ms}$ | p95 | Read-Replica Execution Log |
| **Large Data Table Scrolling** | $60\text{ FPS}$ (16.6ms frame budget) | 100% | Chrome DevTools Frame Profiler |
| **Initial Client Bundle Size** | $< 150\text{ KB}$ (gzipped) | Max Ceiling | Webpack / Vite Bundle Analyzer |
| **Dynamic Module Chunk Size** | $< 50\text{ KB}$ (gzipped) | Max Ceiling | Vite Bundle Analyzer |
| **Worker Process RAM (Profile A)**| $< 128\text{ MB}$ | Max Ceiling | Container cgroup telemetry |
| **Worker Process RAM (Profile C)**| $< 512\text{ MB}$ | Max Ceiling | Kubernetes pod metrics |

---

## 2. Bundle Size Optimization & Code Splitting

1. **Vendor Chunk Isolation:** Heavy runtime dependencies (`react`, `react-dom`, `@tanstack/react-query`) are grouped into a cached vendor chunk with an immutable cache header (`Cache-Control: public, max-age=31536000, immutable`).
2. **On-Demand Domain Splitting:** Domain modules (`module-sales`, `module-procurement`, `module-inventory`) are split into independent asynchronous chunks loaded only when the user navigates into that domain.
3. **Tree-Shaking Icons:** Icon packages are imported individually via direct imports (e.g., `lucide-react/dist/esm/icons/package`) to prevent bundling thousands of unused SVG glyphs.

---

## 3. Database Query Budgets & Anti-Patterns

1. **The N+1 Query Invariant:** All database queries fetching lists of entities with relations must use `JOIN` operations or Drizzle relational queries. An API endpoint emitting N+1 individual SQL queries will be rejected in code review.
2. **Missing Index Detection:** In CI/CD integration tests, all executed queries are analyzed with `EXPLAIN (ANALYZE, BUFFERS)`. Any query performing a sequential table scan (`Seq Scan`) on a table with more than 1,000 rows fails the build.
3. **Read-Replica Offloading:** Heavy export jobs and analytical dashboards are automatically routed to PostgreSQL Read Replicas via database connection tagging (`db.readOnlyPool`).
