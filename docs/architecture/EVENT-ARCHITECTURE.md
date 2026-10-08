# Enterprise Event Architecture

**Document Status:** Permanent Architectural Source of Truth — Phase 0  
**Target:** Decoupled, Fault-Tolerant, Event-Driven Cross-Domain Coordination  
**Standards:** Transactional Outbox Pattern & CloudEvents v1.0 Envelope Specification

---

## 1. The Transactional Outbox Pattern

To eliminate the Dual-Write Problem (where database mutation succeeds but network call to event broker fails, or vice-versa), all domain events generated during business transactions are written directly to a **Transactional Outbox Table** within the exact same ACID database transaction:

```
[ Domain Operation (e.g., Confirm Sales Order) ]
                   │
                   ▼ (Single ACID Transaction)
┌────────────────────────────────────────────────────────┐
│ 1. UPDATE sales_orders SET status = 'confirmed' ...    │
│ 2. INSERT INTO outbox_events (id, topic, payload, ...) │
└────────────────────────────────────────────────────────┘
                   │ COMMIT
                   ▼
       [ Outbox Publisher Worker ]
                   │ (Pulls unpublished events & publishes)
                   ▼
         [ Platform Event Bus ]
       (In-Memory / RabbitMQ / Kafka)
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
[ Inventory Consumer ]   [ General Ledger Consumer ]
```

### Guarantees:
- **Zero Lost Events:** If the transaction aborts, no event is ever published. If the transaction commits, the event is guaranteed to exist in the database for delivery.
- **At-Least-Once Delivery:** Events are delivered with an acknowledgment handshake. In the event of network disruption or worker failure, unacknowledged events are redelivered.

---

## 2. Standard CloudEvents Envelope

All platform events conform to the CloudEvents v1.0 specification with ERP-specific metadata attributes:

```typescript
export interface ErpDomainEvent<TData = Record<string, unknown>> {
  // CloudEvents Core Attributes
  readonly specversion: '1.0';
  readonly id: string;                      // Globally unique event UUID
  readonly source: string;                  // Originating service/module (e.g., 'erp.module.sales')
  readonly type: string;                    // Event type (e.g., 'erp.sales.order.confirmed')
  readonly time: string;                    // ISO 8601 UTC timestamp

  // ERP Context Extensions
  readonly tenantId: string;                // Mandatory tenant isolation boundary
  readonly legalEntityId: string;           // Legal entity issuing the event
  readonly actorId: string;                 // User ID or system service that initiated action
  readonly correlationId: string;           // Distributed tracing traceparent/correlation ID
  readonly causationId: string;             // ID of the triggering command or preceding event

  // Payload
  readonly datacontenttype: 'application/json';
  readonly data: TData;                     // Strongly typed event payload
}
```

---

## 3. Idempotency & Deduplication Engine

Because distributed event buses guarantee *at-least-once* rather than *exactly-once* delivery, every event consumer must be strictly **idempotent**.

1. **Idempotency Store:** Every consumer records incoming `event.id` in a database table: `processed_events (consumer_id, event_id, processed_at)`.
2. **Duplicate Detection:** Before processing an event, the consumer checks the idempotency table. If the event ID has already been recorded, processing is skipped immediately and acknowledged as a success.
3. **Optimistic Locking:** Aggregate entities updated by events maintain a monotonically increasing `version` number to reject stale, out-of-order event applications.

---

## 4. Retries, Dead-Letter Queues (DLQ), and Ordering

### 4.1 Retry Strategy
- If a consumer fails to process an event due to a transient error (e.g., database lock timeout, external API throttling):
- The event is retried with **Exponential Backoff and Jitter**:
  $$\text{Delay} = \min(\text{InitialDelay} \times 2^{\text{retryCount}} + \text{jitter}, \text{MaxDelay})$$
  Default: 3 attempts with delays of 1s, 4s, and 16s.

### 4.2 Dead-Letter Queue (DLQ)
- If an event exceeds maximum retry attempts, it is automatically moved to the `dead_letter_events` table along with the stack trace, error code, and context payload.
- Platform administrators receive automated alerts with a one-click administrative console to inspect, modify payload if necessary, and replay failed events.

### 4.3 Partitioning & Ordering Guarantees
- For brokers supporting partitioned streams (e.g., Apache Kafka, AWS Kinesis):
- The **Partition Key** is constructed as: `${tenantId}:${legalEntityId}:${aggregateRootId}` (e.g., `tenant-1:entity-101:order-1002`).
- This guarantees strict chronological order of events for a single business document while allowing high-throughput parallel processing across independent orders and tenants.
