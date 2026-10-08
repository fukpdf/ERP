import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeLifecycle, IllegalStateTransitionError } from '../dist/index.js';

describe('RuntimeLifecycle Engine', () => {
  it('manages initialization, readiness, and health probes', async () => {
    const lifecycle = new RuntimeLifecycle();
    assert.equal(lifecycle.isLive(), true);
    assert.equal(lifecycle.getState(), 'INITIALIZING');
    assert.equal(await lifecycle.isReady(), false);

    lifecycle.registerHealthCheck('db', () => true);
    lifecycle.markReady();

    assert.equal(lifecycle.getState(), 'READY');
    assert.equal(await lifecycle.isReady(), true);

    const health = await lifecycle.getHealthStatus('0.1.0');
    assert.equal(health.status, 'ok');
    assert.equal(health.state, 'READY');
    assert.equal(health.checks.db, true);
    assert.equal(health.version, '0.1.0');
  });

  it('manages failure state when critical startup fails', () => {
    const lifecycle = new RuntimeLifecycle();
    const startupErr = new Error('Database pool creation timed out');
    lifecycle.markFailed(startupErr);

    assert.equal(lifecycle.getState(), 'FAILED');
    assert.equal(lifecycle.isLive(), false);
    assert.equal(lifecycle.getFailureReason(), startupErr);

    // Cannot transition to READY from FAILED
    assert.throws(
      () => lifecycle.markReady(),
      (err: Error) => {
        assert.ok(err instanceof IllegalStateTransitionError);
        return true;
      },
    );
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
    assert.equal(lifecycle.getState(), 'TERMINATED');

    // Repeated shutdown is safe and idempotent
    await lifecycle.shutdown();
    assert.equal(lifecycle.getState(), 'TERMINATED');
    // Handlers should NOT be called again
    assert.deepEqual(callOrder, ['handler-2', 'handler-1']);
  });
});
