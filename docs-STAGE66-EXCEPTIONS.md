# Stage 66 Exceptions and Evidence Rules

- No distributed-consistency PASS may be inferred from static code inspection alone.
- No claim of exactly-once delivery is permitted. The design must demonstrate at-least-once delivery plus idempotent business effects.
- No fabricated throughput, latency, recovery-time or duplicate-suppression measurements are allowed.
- If representative multi-shard infrastructure is unavailable, runtime status is BLOCKED, not PASS.
- A failed compensation is not hidden or converted into success; it becomes durable recoverable operational work.
- Unknown external outcomes must be reconciled before repeating a potentially non-idempotent side effect.
- Cross-tenant or stale placement-context messages must fail closed.
