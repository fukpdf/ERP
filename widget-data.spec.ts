import { WidgetDataService, WidgetDataSource } from '../../src/modules/dashboards/services/widget-data.service';
import { TenantContext } from '../../src/modules/reports/services/integration-points';

describe('WidgetDataService', () => {
  const ctx: TenantContext = { tenantId: 't1', userId: 'u1', roles: [] };

  it('dispatches report-backed widgets to the report executor', async () => {
    const reports = { execute: jest.fn().mockResolvedValue({ columns: ['a'], rows: [{ a: 1 }], cached: false }) };
    const kpi = { compute: jest.fn() };
    const svc = new WidgetDataService(reports as any, kpi as any);
    const source: WidgetDataSource = { type: 'report', reportId: 'rep1' };
    const result: any = await svc.fetch(source, ctx);
    expect(reports.execute).toHaveBeenCalledWith('rep1', {}, ctx);
    expect(result.rows[0].a).toBe(1);
  });

  it('dispatches kpi-backed widgets to the kpi computer', async () => {
    const reports = { execute: jest.fn() };
    const kpi = { compute: jest.fn().mockResolvedValue({ kpiId: 'k1', value: 42 }) };
    const svc = new WidgetDataService(reports as any, kpi as any);
    const source: WidgetDataSource = { type: 'kpi', kpiDefinition: {} as any, inputs: { x: 1 } };
    const result: any = await svc.fetch(source, ctx);
    expect(kpi.compute).toHaveBeenCalled();
    expect(result.value).toBe(42);
  });

  it('returns static data unchanged', async () => {
    const svc = new WidgetDataService({} as any, {} as any);
    const result = await svc.fetch({ type: 'static', data: { x: 1 } }, ctx);
    expect(result).toEqual({ x: 1 });
  });
});
