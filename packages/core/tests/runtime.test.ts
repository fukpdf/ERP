import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeLifecycle } from '../dist/index.js';

describe('RuntimeLifecycle Engine', () => {
  it('manages initialization, readiness, and health probes', async () => {
    const lifecycle = new RuntimeLifecycle();
    assert.equal(lifecycle.isLive(), true);
    assert.equal(await lifecycle.isReady(), false);

    lifecycle.registerHealthCheck('db', () => true);
    lifecycle.markReady();

    assert.equal(await lifecycle.isReady(), true);

    const health = await lifecycle.getHealthStatus();
    assert.equal(health.status, 'ok');
    assert.equal(health.state, 'READY');
    assert.equal(health.checks.db, true);
  });

  it('executes shutdown handlers in reverse order during termination', async () => {
    const lifecycle = new RuntimeLifecycle();
    const callOrder: string[] = [];

    lifecycle.registerShutdownHandler(() => {
      callOrder.push('handler-1');
    });
    lifecycle.registerShutdownHandler(() => {
      callOrder.push('handler-2');
    });

    await lifecycle.shutdown();

    // Verify reverse order execution (LIFO)
    assert.deepEqual(callOrder, ['handler-2', 'handler-1']);
    assert.equal(lifecycle.isLive(), false);
  });
});
