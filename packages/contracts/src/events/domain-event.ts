import crypto from 'node:crypto';

/**
 * Standard CloudEvents v1.0 Compliant Domain Event Envelope.
 * Guarantees cross-domain traceability and idempotency metadata.
 */

export interface ErpDomainEvent<TData = Record<string, unknown>> {
  // CloudEvents Core Specification v1.0
  readonly specversion: '1.0';
  readonly id: string;
  readonly source: string;
  readonly type: string;
  readonly time: string;
  readonly datacontenttype: 'application/json';

  // ERP Context Attributes
  readonly tenantId: string;
  readonly legalEntityId?: string;
  readonly actorId?: string;
  readonly correlationId: string;
  readonly causationId?: string;

  // Payload
  readonly data: TData;
}

export function createDomainEvent<TData>(
  type: string,
  source: string,
  tenantId: string,
  correlationId: string,
  data: TData,
  options?: {
    id?: string;
    legalEntityId?: string;
    actorId?: string;
    causationId?: string;
  },
): ErpDomainEvent<TData> {
  return {
    specversion: '1.0',
    id: options?.id ?? crypto.randomUUID(),
    source,
    type,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    tenantId,
    legalEntityId: options?.legalEntityId,
    actorId: options?.actorId,
    correlationId,
    causationId: options?.causationId,
    data,
  };
}
