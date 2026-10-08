import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDomainEvent } from '../dist/index.js';

describe('Domain Events Contract (CloudEvents v1.0)', () => {
  it('creates valid CloudEvents v1.0 compliant event envelopes', () => {
    const payload = {
      orderId: 'ord-1001',
      totalAmount: 739.95,
      customerId: 'cust-001',
    };

    const event = createDomainEvent(
      'erp.sales.order.created',
      'erp.module.sales',
      'tenant-acme-prod',
      'corr-test-trace-888',
      payload,
      {
        legalEntityId: 'entity-us-east',
        actorId: 'usr-admin-1',
      },
    );

    assert.equal(event.specversion, '1.0');
    assert.equal(event.type, 'erp.sales.order.created');
    assert.equal(event.source, 'erp.module.sales');
    assert.equal(event.tenantId, 'tenant-acme-prod');
    assert.equal(event.legalEntityId, 'entity-us-east');
    assert.equal(event.actorId, 'usr-admin-1');
    assert.equal(event.correlationId, 'corr-test-trace-888');
    assert.equal(event.datacontenttype, 'application/json');
    assert.deepEqual(event.data, payload);
    assert.ok(event.id);
    assert.ok(event.time);
  });
});
