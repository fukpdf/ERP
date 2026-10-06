import {
  DashboardRealtimeService,
  RealtimeSink,
  WidgetUpdate,
} from '../../src/modules/dashboards/services/dashboard-realtime.service';

describe('DashboardRealtimeService backpressure', () => {
  it('coalesces repeated updates to the same widget within a window', () => {
    const pushed: Array<{ clientId: string; updates: WidgetUpdate[] }> = [];
    const sink: RealtimeSink = { push: (clientId, updates) => pushed.push({ clientId, updates }) };
    const svc = new DashboardRealtimeService(sink);

    for (let i = 0; i < 5; i++) svc.enqueue('c1', { widgetId: 'w1', data: i, ts: i });
    const flushed = svc.flush('c1');

    expect(flushed).toHaveLength(1);
    expect(flushed[0].data).toBe(4);
  });

  it('caps delivery at 10 updates/sec per client and queues the overflow for the next flush', () => {
    const pushed: Array<{ clientId: string; updates: WidgetUpdate[] }> = [];
    const sink: RealtimeSink = { push: (clientId, updates) => pushed.push({ clientId, updates }) };
    const svc = new DashboardRealtimeService(sink);

    for (let i = 0; i < 15; i++) svc.enqueue('c2', { widgetId: `w${i}`, data: i, ts: i });

    const first = svc.flush('c2');
    expect(first).toHaveLength(10);

    const second = svc.flush('c2');
    expect(second).toHaveLength(5);
  });

  it('does not push anything when there is nothing pending', () => {
    const pushed: unknown[] = [];
    const sink: RealtimeSink = { push: (_c, updates) => pushed.push(updates) };
    const svc = new DashboardRealtimeService(sink);
    const flushed = svc.flush('c3');
    expect(flushed).toHaveLength(0);
    expect(pushed).toHaveLength(0);
  });
});
