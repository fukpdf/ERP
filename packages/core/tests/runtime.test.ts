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

  // --- DETERMINISTIC LIFECYCLE CONTRACT (DEF-015) ---

  it('cleanup completes before timeout', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    let handlerRun = false;
    lifecycle.registerShutdownHandler(() => {
      handlerRun = true;
    });

    await lifecycle.shutdown(100);

    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(lifecycle.hasTimedOut(), false);
    assert.equal(lifecycle.isCleanupComplete(), true);
    assert.equal(handlerRun, true);
  });

  it('timeout occurs', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    let handlerCompleted = false;
    lifecycle.registerShutdownHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      handlerCompleted = true;
    });

    await lifecycle.shutdown(20);

    // Timeout occurred, shutdown returned, but cleanup is still running
    assert.equal(lifecycle.hasTimedOut(), true);
    assert.equal(lifecycle.isCleanupComplete(), false);
    assert.equal(lifecycle.getState(), 'TERMINATING');
    assert.equal(handlerCompleted, false);

    // Let the background cleanup complete
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(lifecycle.isCleanupComplete(), true);
    assert.equal(handlerCompleted, true);
    assert.equal(lifecycle.getState(), 'TERMINATED');
  });

  it('handler observes AbortSignal', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    let observedAbort = false;
    lifecycle.registerShutdownHandler(async (signal) => {
      assert.ok(signal);
      signal?.addEventListener('abort', () => {
        observedAbort = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 80));
    });

    await lifecycle.shutdown(20);
    assert.equal(lifecycle.hasTimedOut(), true);
    assert.equal(observedAbort, true);
  });

  it('handler ignores AbortSignal', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    let completedIgnoring = false;
    lifecycle.registerShutdownHandler(async () => {
      // Ignore any abort signal and complete work
      await new Promise((resolve) => setTimeout(resolve, 60));
      completedIgnoring = true;
    });

    await lifecycle.shutdown(15);
    assert.equal(lifecycle.hasTimedOut(), true);
    assert.equal(completedIgnoring, false);

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(completedIgnoring, true);
    assert.equal(lifecycle.isCleanupComplete(), true);
    assert.equal(lifecycle.getState(), 'TERMINATED');
  });

  it('cleanup completes after timeout', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    let completed = false;
    lifecycle.registerShutdownHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      completed = true;
    });

    await lifecycle.shutdown(15);
    assert.equal(lifecycle.hasTimedOut(), true);
    assert.equal(lifecycle.isCleanupComplete(), false);
    assert.equal(lifecycle.getState(), 'TERMINATING');

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(completed, true);
    assert.equal(lifecycle.isCleanupComplete(), true);
    assert.equal(lifecycle.getState(), 'TERMINATED');
  });

  it('cleanup fails after timeout', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    const cleanupError = new Error('Database connection failed late');
    lifecycle.registerShutdownHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      throw cleanupError;
    });

    await lifecycle.shutdown(15);
    assert.equal(lifecycle.hasTimedOut(), true);
    assert.equal(lifecycle.isCleanupComplete(), false);

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(lifecycle.isCleanupComplete(), true);
    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(lifecycle.getLateErrors().length, 1);
    assert.equal(lifecycle.getLateErrors()[0], cleanupError);
  });

  it('container shutdown fails', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    const containerError = new Error('Container stop failed');
    const mockContainer: any = {
      stopAll: async () => {
        throw containerError;
      }
    };
    lifecycle.attachContainer(mockContainer);

    await lifecycle.shutdown(100);

    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(lifecycle.isCleanupComplete(), true);
    assert.equal(lifecycle.getLateErrors().length, 1);
    assert.equal(lifecycle.getLateErrors()[0], containerError);
  });

  it('multiple concurrent shutdown calls', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    let handlerCallCount = 0;
    lifecycle.registerShutdownHandler(async () => {
      handlerCallCount++;
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    // Fire concurrently
    const p1 = lifecycle.shutdown(100);
    const p2 = lifecycle.shutdown(100);
    const p3 = lifecycle.shutdown(100);

    await Promise.all([p1, p2, p3]);

    assert.equal(handlerCallCount, 1);
    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(lifecycle.isCleanupComplete(), true);
  });

  it('repeated shutdown after timeout', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    lifecycle.registerShutdownHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    await lifecycle.shutdown(15);
    assert.equal(lifecycle.hasTimedOut(), true);
    assert.equal(lifecycle.isCleanupComplete(), false);

    // Call shutdown again after timeout
    await lifecycle.shutdown(15);
    assert.equal(lifecycle.getState(), 'TERMINATING');

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(lifecycle.isCleanupComplete(), true);
    assert.equal(lifecycle.getState(), 'TERMINATED');
  });

  it('repeated shutdown after termination', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    let callCount = 0;
    lifecycle.registerShutdownHandler(() => {
      callCount++;
    });

    await lifecycle.shutdown(100);
    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(callCount, 1);

    // Repeated call after already TERMINATED should be a no-op
    await lifecycle.shutdown(100);
    assert.equal(lifecycle.getState(), 'TERMINATED');
    assert.equal(callCount, 1);
  });

  it('no lifecycle mutation after TERMINATED', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    await lifecycle.shutdown(100);
    assert.equal(lifecycle.getState(), 'TERMINATED');

    assert.throws(() => {
      lifecycle.markReady();
    }, IllegalStateTransitionError);

    assert.throws(() => {
      lifecycle.markFailed(new Error('Crashing after terminated'));
    }, IllegalStateTransitionError);

    assert.equal(lifecycle.getState(), 'TERMINATED');
  });

  it('accurate timeout metric', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    lifecycle.registerShutdownHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await lifecycle.shutdown(10);
    const metrics = runtimeMetrics.getSnapshot();
    assert.ok(metrics.shutdownTimeouts >= 1);
  });

  it('accurate cleanup-complete state', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    assert.equal(lifecycle.isCleanupComplete(), false);

    await lifecycle.shutdown(100);
    assert.equal(lifecycle.isCleanupComplete(), true);
  });

  it('late errors are inspectable', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    const e1 = new Error('First late error');
    lifecycle.registerShutdownHandler(() => {
      throw e1;
    });

    await lifecycle.shutdown(100);
    const errors = lifecycle.getLateErrors();
    assert.equal(errors.length, 1);
    assert.equal(errors[0], e1);
  });

  it('no unhandled rejection', async () => {
    const lifecycle = new RuntimeLifecycle();
    lifecycle.markReady();
    lifecycle.registerShutdownHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      throw new Error('Async background failure');
    });

    // Run shutdown with short timeout. The background promise should not cause an unhandled rejection.
    await lifecycle.shutdown(10);
    
    // Wait for the background error to be thrown
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(lifecycle.getLateErrors().length, 1);
    assert.ok(lifecycle.getLateErrors()[0].message.includes('Async background failure'));
  });
});

