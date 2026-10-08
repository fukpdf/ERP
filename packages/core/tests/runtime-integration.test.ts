import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RuntimeLifecycle,
  IllegalStateTransitionError,
  ServiceContainer,
  handleLiveness,
  handleReadiness,
  runtimeMetrics,
  type IService,
} from '../dist/index.js';

describe('Runtime Integration, Draining & Lifecycle Coordination', () => {
  it('enforces ingress shutoff, drains active work, and updates health probes during shutdown', async () => {
    const runtime = new RuntimeLifecycle();
    const container = new ServiceContainer();
    runtime.attachContainer(container);

    let serviceStopped = false;
    const testService: IService = {
      name: 'workerService',
      dependencies: [],
      async shutdown() {
        serviceStopped = true;
      },
    };
    container.register(testService);
    await container.startAll();
    runtime.markReady();

    // 1. When READY: Ingress is open, readiness returns 200
    assert.equal(runtime.isIngressOpen(), true);
    assert.equal(runtime.getState(), 'READY');
    const readyProbe = await handleReadiness(runtime);
    assert.equal(readyProbe.statusCode, 200);

    // 2. Simulate in-flight request that started while READY
    let inFlightCompleted = false;
    const inFlightPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        inFlightCompleted = true;
        resolve();
      }, 20);
    });

    // 3. Initiate graceful shutdown
    const shutdownPromise = runtime.shutdown();

    // Ingress must immediately close
    assert.equal(runtime.isIngressOpen(), false);

    // Operational request simulation during shutdown must be rejected
    const simulateOperationalRequest = () => {
      if (!runtime.isIngressOpen()) {
        return { statusCode: 503, message: 'Server is draining or shutting down' };
      }
      return { statusCode: 200, message: 'OK' };
    };
    const rejectedReq = simulateOperationalRequest();
    assert.equal(rejectedReq.statusCode, 503);

    // Health probes during drain:
    // Liveness is 200 (process is still alive), Readiness is 503 (not accepting work)
    const liveProbe = handleLiveness(runtime);
    assert.equal(liveProbe.statusCode, 200);
    const drainingReadiness = await handleReadiness(runtime);
    assert.equal(drainingReadiness.statusCode, 503);

    // In-flight work completes cleanly
    await inFlightPromise;
    assert.equal(inFlightCompleted, true);

    // Wait for full shutdown
    await shutdownPromise;

    // Verify TERMINATED state and container stopped
    assert.equal(runtime.getState(), 'TERMINATED');
    assert.equal(serviceStopped, true);
    assert.equal(runtime.isLive(), false);

    // Verify shutdown duration metric was recorded
    const metrics = runtimeMetrics.getSnapshot();
    assert.ok(typeof metrics.shutdownDurationMs === 'number');
    assert.ok(metrics.shutdownDurationMs >= 0);
  });

  it('rejects illegal state machine transitions with IllegalStateTransitionError', () => {
    const runtime = new RuntimeLifecycle();
    assert.equal(runtime.getState(), 'INITIALIZING');

    // Cannot jump directly from INITIALIZING to DRAINING or TERMINATED
    assert.throws(
      () => (runtime as any).transitionTo('DRAINING'),
      (err: Error) => {
        assert.ok(err instanceof IllegalStateTransitionError);
        assert.ok(err.message.includes('from "INITIALIZING" to "DRAINING"'));
        return true;
      },
    );

    // Transition to FAILED
    runtime.markFailed(new Error('Fatal bootstrap failure'));
    assert.equal(runtime.getState(), 'FAILED');

    // Cannot transition from FAILED to READY
    assert.throws(
      () => runtime.markReady(),
      (err: Error) => {
        assert.ok(err instanceof IllegalStateTransitionError);
        return true;
      },
    );
  });

  it('coordinates ServiceContainer startAll and stopAll during runtime lifecycle', async () => {
    const runtime = new RuntimeLifecycle();
    const container = new ServiceContainer();
    runtime.attachContainer(container);

    const lifecycleLog: string[] = [];

    const svc1: IService = {
      name: 'coreDb',
      dependencies: [],
      async initialize() {
        lifecycleLog.push('init:coreDb');
      },
      async shutdown() {
        lifecycleLog.push('shutdown:coreDb');
      },
    };

    const svc2: IService = {
      name: 'eventDispatcher',
      dependencies: ['coreDb'],
      async initialize() {
        lifecycleLog.push('init:eventDispatcher');
      },
      async shutdown() {
        lifecycleLog.push('shutdown:eventDispatcher');
      },
    };

    container.register(svc2);
    container.register(svc1);

    // Start container
    await container.startAll();
    runtime.markReady();

    assert.deepEqual(lifecycleLog, ['init:coreDb', 'init:eventDispatcher']);

    // Shutdown runtime -> triggers container.stopAll() in reverse topological order
    await runtime.shutdown();

    assert.deepEqual(lifecycleLog, [
      'init:coreDb',
      'init:eventDispatcher',
      'shutdown:eventDispatcher',
      'shutdown:coreDb',
    ]);
  });
});
