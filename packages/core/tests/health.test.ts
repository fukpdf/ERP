import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RuntimeLifecycle,
  HealthRegistry,
  handleLiveness,
  handleReadiness,
  handleStartup,
} from '../dist/index.js';

describe('Health Platform (Liveness, Readiness, Startup)', () => {
  it('manages liveness probes throughout runtime states', () => {
    const runtime = new RuntimeLifecycle();
    assert.equal(runtime.isLive(), true);

    const liveRes = handleLiveness(runtime);
    assert.equal(liveRes.statusCode, 200);
    assert.equal(liveRes.body.status, 'ok');
    assert.equal(liveRes.body.state, 'INITIALIZING');

    // Fail runtime
    runtime.markFailed(new Error('Fatal database corruption'));
    assert.equal(runtime.isLive(), false);

    const failedRes = handleLiveness(runtime);
    assert.equal(failedRes.statusCode, 503);
    assert.equal(failedRes.body.status, 'down');
    assert.equal(failedRes.body.state, 'FAILED');
  });

  it('evaluates readiness: 503 before ready, 200 when ready, 503 when critical check fails', async () => {
    const runtime = new RuntimeLifecycle();
    const registry = new HealthRegistry();

    let dbHealthy = true;
    registry.register({
      name: 'database',
      isCritical: true,
      check: () => dbHealthy,
    });

    // 1. Before markReady (INITIALIZING state)
    const initRes = await handleReadiness(runtime, registry, '0.1.0');
    assert.equal(initRes.statusCode, 503);
    assert.equal(initRes.body.state, 'INITIALIZING');
    assert.equal(initRes.body.status, 'down');

    // 2. Mark Ready
    runtime.markReady();
    const readyRes = await handleReadiness(runtime, registry, '0.1.0');
    assert.equal(readyRes.statusCode, 200);
    assert.equal(readyRes.body.status, 'ok');
    assert.equal(readyRes.body.state, 'READY');
    assert.equal(readyRes.body.checks.database, true);
    assert.equal(readyRes.body.version, '0.1.0');

    // 3. Database check fails
    dbHealthy = false;
    const degradedRes = await handleReadiness(runtime, registry, '0.1.0');
    assert.equal(degradedRes.statusCode, 503);
    assert.equal(degradedRes.body.status, 'degraded');
    assert.equal(degradedRes.body.checks.database, false);
  });

  it('manages startup probe: 503 while initializing, 200 once ready', () => {
    const runtime = new RuntimeLifecycle();

    const startingRes = handleStartup(runtime, '0.1.0');
    assert.equal(startingRes.statusCode, 503);
    assert.equal(startingRes.body.status, 'starting');

    runtime.markReady();
    const readyRes = handleStartup(runtime, '0.1.0');
    assert.equal(readyRes.statusCode, 200);
    assert.equal(readyRes.body.status, 'ok');
  });
});
