import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RuntimeLifecycle,
  IllegalStateTransitionError,
  runtimeMetrics,
} from '../dist/index.js';

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

  // Test A — FAILED shutdown
  it('handles shutdown from FAILED state cleanly and records metrics (Test A)', async () => {
    const lifecycle = new RuntimeLifecycle();
    const originalError = new Error('Database pool connection refused');
    lifecycle.markFailed(originalError);
    assert.equal(lifecycle.getState(), 'FAILED');

    // shutdown() must not throw IllegalStateTransitionError
    await lifecycle.shutdown();

    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(lifecycle.getFailureReason(), originalError);
    assert.equal(lifecycle.isLive(), false);

    const metrics = runtimeMetrics.getSnapshot();
    assert.ok(typeof metrics.shutdownDurationMs === 'number');
    assert.ok(metrics.shutdownDurationMs >= 0);
  });

  // Test B — TERMINATED immutability
  it('guarantees TERMINATED state is immutable and rejects illegal transitions (Test B)', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    assert.equal(lifecycle.getState(), 'READY');

    await lifecycle.shutdown();
    assert.equal(lifecycle.getState(), 'TERMINATED');

    // Attempt markReady() from TERMINATED -> must throw IllegalStateTransitionError
    assert.throws(
      () => lifecycle.markReady(),
      (err: Error) => {
        assert.ok(err instanceof IllegalStateTransitionError);
        assert.ok(err.message.includes('from "TERMINATED" to "READY"'));
        return true;
      },
    );

    // Attempt markFailed() from TERMINATED -> must throw IllegalStateTransitionError
    assert.throws(
      () => lifecycle.markFailed(new Error('Post-termination crash')),
      (err: Error) => {
        assert.ok(err instanceof IllegalStateTransitionError);
        assert.ok(err.message.includes('from "TERMINATED" to "FAILED"'));
        return true;
      },
    );

    // State remains strictly TERMINATED
    assert.equal(lifecycle.getState(), 'TERMINATED');

    // Shutdown remains safe and idempotent
    await lifecycle.shutdown();
    assert.equal(lifecycle.getState(), 'TERMINATED');
  });

  // Test C — Failed reason preservation
  it('preserves failure reason across shutdown to TERMINATED (Test C)', async () => {
    const runtime = new RuntimeLifecycle();
    const originalError = new Error('bootstrap failure');
    runtime.markFailed(originalError);

    await runtime.shutdown();

    assert.equal(runtime.getState(), 'TERMINATED');
    assert.equal(runtime.getFailureReason(), originalError);
  });

  // Test D — All shutdown entry states
  it('deterministically shuts down from all valid entry states (Test D)', async () => {
    // 1. From INITIALIZING
    const initLifecycle = new RuntimeLifecycle();
    assert.equal(initLifecycle.getState(), 'INITIALIZING');
    await initLifecycle.shutdown();
    assert.equal(initLifecycle.getState(), 'TERMINATED');

    // 2. From READY
    const readyLifecycle = new RuntimeLifecycle();
    readyLifecycle.markReady();
    assert.equal(readyLifecycle.getState(), 'READY');
    await readyLifecycle.shutdown();
    assert.equal(readyLifecycle.getState(), 'TERMINATED');

    // 3. From DRAINING
    const drainingLifecycle = new RuntimeLifecycle();
    drainingLifecycle.markReady();
    (drainingLifecycle as any).transitionTo('DRAINING');
    assert.equal(drainingLifecycle.getState(), 'DRAINING');
    await drainingLifecycle.shutdown();
    assert.equal(drainingLifecycle.getState(), 'TERMINATED');

    // 4. From FAILED
    const failedLifecycle = new RuntimeLifecycle();
    failedLifecycle.markFailed(new Error('Startup error'));
    assert.equal(failedLifecycle.getState(), 'FAILED');
    await failedLifecycle.shutdown();
    assert.equal(failedLifecycle.getState(), 'TERMINATED');

    // 5. From TERMINATED
    const termLifecycle = new RuntimeLifecycle();
    await termLifecycle.shutdown();
    assert.equal(termLifecycle.getState(), 'TERMINATED');
    await termLifecycle.shutdown(); // Idempotent second call
    assert.equal(termLifecycle.getState(), 'TERMINATED');
  });

  // Test E — Shutdown timeout handling & late cleanup isolation (DEF-015)
  it('resolves shutdown to TERMINATED even when shutdown handlers exceed timeout', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();

    let lateHandlerCompleted = false;
    let receivedSignal: AbortSignal | undefined;

    // Register a handler that delays longer than the shutdown timeout
    lifecycle.registerShutdownHandler(async (signal) => {
      receivedSignal = signal;
      await new Promise((resolve) => setTimeout(resolve, 150));
      lateHandlerCompleted = true;
    });

    // Run shutdown with short timeout of 30ms
    await lifecycle.shutdown(30);

    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(lifecycle.isLive(), false);
    assert.equal(lifecycle.hasTimedOut(), true);
    assert.equal(lifecycle.isCleanupComplete(), false);
    assert.ok(receivedSignal?.aborted);

    // Wait for late handler to complete in background
    await new Promise((resolve) => setTimeout(resolve, 200));

    assert.equal(lateHandlerCompleted, true);
    assert.equal(lifecycle.isCleanupComplete(), true);
    assert.equal(lifecycle.getState(), 'TERMINATED'); // State remains strictly TERMINATED

    const metrics = runtimeMetrics.getSnapshot();
    assert.ok(typeof metrics.shutdownDurationMs === 'number');
    assert.ok(metrics.shutdownTimeouts >= 1);
  });

  it('captures late cleanup errors after timeout without mutating TERMINATED state (DEF-015)', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();

    const lateError = new Error('Late database socket close failed');

    lifecycle.registerShutdownHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw lateError;
    });

    await lifecycle.shutdown(20);

    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(lifecycle.hasTimedOut(), true);

    // Wait for late failing handler to finish
    await new Promise((resolve) => setTimeout(resolve, 150));

    assert.equal(lifecycle.getState(), 'TERMINATED'); // State remains strictly TERMINATED
    assert.equal(lifecycle.getLateErrors().length, 1);
    assert.equal(lifecycle.getLateErrors()[0], lateError);
  });

  it('shares the exact same Promise across concurrent shutdown calls (DEF-015)', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();

    let executionCount = 0;
    lifecycle.registerShutdownHandler(async () => {
      executionCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Fire 3 concurrent shutdown calls
    const p1 = lifecycle.shutdown();
    const p2 = lifecycle.shutdown();
    const p3 = lifecycle.shutdown();

    await Promise.all([p1, p2, p3]);

    assert.equal(executionCount, 1);
    assert.equal(lifecycle.getState(), 'TERMINATED');
  });

  it('safely handles repeated shutdown calls after timeout has occurred (DEF-015)', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();

    lifecycle.registerShutdownHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await lifecycle.shutdown(20);
    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(lifecycle.hasTimedOut(), true);

    // Repeated call after state is TERMINATED
    await lifecycle.shutdown();
    assert.equal(lifecycle.getState(), 'TERMINATED');
  });
});
