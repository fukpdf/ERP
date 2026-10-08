import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeMetrics } from '../dist/index.js';

describe('RuntimeMetrics Observability', () => {
  it('accurately records requests, duration histograms, and percentiles', () => {
    const metrics = new RuntimeMetrics();

    // Record various requests
    metrics.recordRequest('GET', 200, 10);
    metrics.recordRequest('GET', 200, 20);
    metrics.recordRequest('POST', 201, 30);
    metrics.recordRequest('GET', 404, 15);
    metrics.recordRequest('POST', 500, 100);

    metrics.recordStartupDuration(42);
    metrics.recordShutdownDuration(12);

    const snapshot = metrics.getSnapshot();

    assert.equal(snapshot.totalRequests, 5);
    assert.equal(snapshot.requestsByMethod.GET, 3);
    assert.equal(snapshot.requestsByMethod.POST, 2);
    assert.equal(snapshot.requestsByStatus[200], 2);
    assert.equal(snapshot.requestsByStatus[201], 1);
    assert.equal(snapshot.requestsByStatus[404], 1);
    assert.equal(snapshot.requestsByStatus[500], 1);

    assert.equal(snapshot.requestDurations.count, 5);
    assert.equal(snapshot.requestDurations.minMs, 10);
    assert.equal(snapshot.requestDurations.maxMs, 100);
    assert.equal(snapshot.requestDurations.sumMs, 175);
    assert.equal(snapshot.requestDurations.avgMs, 35);
    assert.equal(snapshot.startupDurationMs, 42);
    assert.equal(snapshot.shutdownDurationMs, 12);
  });

  it('tracks active in-flight request gauge', () => {
    const metrics = new RuntimeMetrics();
    assert.equal(metrics.getSnapshot().activeRequests, 0);

    metrics.incrementActiveRequests();
    metrics.incrementActiveRequests();
    assert.equal(metrics.getSnapshot().activeRequests, 2);

    metrics.decrementActiveRequests();
    assert.equal(metrics.getSnapshot().activeRequests, 1);
  });
});
