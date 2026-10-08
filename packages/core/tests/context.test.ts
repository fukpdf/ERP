import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionContext } from '../dist/index.js';

describe('ExecutionContext Isolation', () => {
  it('propagates context values across asynchronous callbacks', async () => {
    const context = {
      tenantId: 'tenant-acme-1',
      legalEntityId: 'entity-101',
      userId: 'user-alice',
      correlationId: 'req-corr-999',
    };

    await ExecutionContext.run(context, async () => {
      assert.equal(ExecutionContext.current()?.tenantId, 'tenant-acme-1');
      assert.equal(ExecutionContext.requireTenantId(), 'tenant-acme-1');
      assert.equal(ExecutionContext.getCorrelationId(), 'req-corr-999');

      // Test asynchronous child promise
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(ExecutionContext.current()?.userId, 'user-alice');
    });

    // Outside context
    assert.equal(ExecutionContext.current(), undefined);
    assert.throws(() => ExecutionContext.requireTenantId(), /Tenant context is required/);
  });

  it('maintains strict isolation between concurrent asynchronous executions', async () => {
    const taskA = ExecutionContext.run(
      { tenantId: 'tenant-A', correlationId: 'corr-A' },
      async () => {
        await new Promise((r) => setTimeout(r, 20));
        assert.equal(ExecutionContext.requireTenantId(), 'tenant-A');
        assert.equal(ExecutionContext.getCorrelationId(), 'corr-A');
      },
    );

    const taskB = ExecutionContext.run(
      { tenantId: 'tenant-B', correlationId: 'corr-B' },
      async () => {
        await new Promise((r) => setTimeout(r, 10));
        assert.equal(ExecutionContext.requireTenantId(), 'tenant-B');
        assert.equal(ExecutionContext.getCorrelationId(), 'corr-B');
      },
    );

    await Promise.all([taskA, taskB]);
  });
});
