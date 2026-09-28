# Stage 70 Exceptions and Evidence Boundary

1. No runtime PASS may be claimed without real configuration distribution infrastructure.
2. No fabricated rollout, convergence, rollback or drift-reconciliation measurements are permitted.
3. Security-critical stale configuration must fail closed; availability-oriented last-known-good behavior is only acceptable for explicitly non-critical configuration.
4. Secret material must never be committed to configuration bundles, manifests, logs or evidence artifacts.
5. Provider-specific configuration systems must remain behind an adapter boundary.
6. A local runtime copy is never an authority and cannot overwrite the control-plane version.
7. 100M+ capacity claims require representative load evidence; architecture alone is not a benchmark.
