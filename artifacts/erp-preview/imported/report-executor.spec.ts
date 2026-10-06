import { ReportExecutorService, ReportDefinitionStore, ReportDefinitionRecord } from '../../src/modules/reports/services/report-executor.service';
import { ReportCacheService } from '../../src/modules/reports/services/report-cache.service';
import { DomainEventBus, PermissionChecker, SqlExecutor, TenantContext } from '../../src/modules/reports/services/integration-points';
import { QueryAstBuilder } from '@erp/query-builder';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

class FakeDefinitionStore implements ReportDefinitionStore {
  constructor(private readonly records: ReportDefinitionRecord[]) {}
  async findById(tenantId: string, reportId: string) {
    return this.records.find((r) => r.tenantId === tenantId && r.id === reportId) ?? null;
  }
}

class FakePermissions implements PermissionChecker {
  constructor(private readonly allow: boolean) {}
  async can() {
    return this.allow;
  }
}

class FakeSql implements SqlExecutor {
  public calls: Array<{ sql: string; params: unknown[] }> = [];
  constructor(private readonly rows: Record<string, unknown>[]) {}
  async query(sql: string, params: unknown[]) {
    this.calls.push({ sql, params });
    return this.rows;
  }
}

class FakeEventBus implements DomainEventBus {
  public published: Array<{ topic: string; type: string; tenantId: string; data: Record<string, unknown> }> = [];
  async publish(topic: 'reports-events' | 'audit', event: { type: string; tenantId: string; data: Record<string, unknown> }) {
    this.published.push({ topic, type: event.type, tenantId: event.tenantId, data: event.data });
  }
  subscribe() {
    /* not exercised in these tests */
  }
}

const ctx: TenantContext = { tenantId: 'tenant-a', userId: 'user-1', roles: ['viewer'] };

function makeDefinition(tenantId = 'tenant-a'): ReportDefinitionRecord {
  const ast = QueryAstBuilder.from('invoices')
    .select({ table: 'invoices', column: 'id' }, { table: 'invoices', column: 'total' })
    .build();
  return { id: 'rep-1', tenantId, key: 'ar_summary', name: 'AR Summary', queryAst: ast, ownerId: 'user-1' };
}

describe('ReportExecutorService', () => {
  it('404s when the report belongs to a different tenant', async () => {
    const svc = new ReportExecutorService(
      new FakeDefinitionStore([makeDefinition('tenant-b')]),
      new ReportCacheService(),
      new FakePermissions(true),
      new FakeSql([]),
      new FakeEventBus(),
    );
    await expect(svc.execute('rep-1', {}, ctx)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('403s when permission check fails', async () => {
    const svc = new ReportExecutorService(
      new FakeDefinitionStore([makeDefinition()]),
      new ReportCacheService(),
      new FakePermissions(false),
      new FakeSql([]),
      new FakeEventBus(),
    );
    await expect(svc.execute('rep-1', {}, ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('executes, tenant-scopes the SQL, caches the result, and publishes report.executed', async () => {
    const fakeSql = new FakeSql([{ id: '1', total: 100 }]);
    const events = new FakeEventBus();
    const svc = new ReportExecutorService(
      new FakeDefinitionStore([makeDefinition()]),
      new ReportCacheService(),
      new FakePermissions(true),
      fakeSql,
      events,
    );

    const result1 = await svc.execute('rep-1', {}, ctx);
    expect(result1.status).toBe('succeeded');
    expect(result1.cached).toBe(false);
    expect(result1.rows).toEqual([{ id: '1', total: 100 }]);
    expect(fakeSql.calls).toHaveLength(1);
    expect(fakeSql.calls[0].sql).toContain('tenant_id = $1');
    expect(fakeSql.calls[0].params[0]).toBe('tenant-a');

    // report.executed published to both mandatory topics (spec section 4)
    const executedEvents = events.published.filter((e) => e.type === 'report.executed');
    expect(executedEvents.map((e) => e.topic).sort()).toEqual(['audit', 'reports-events']);
    expect(executedEvents[0].data.cached).toBe(false);

    // Second call should hit cache, not the DB again — still publishes report.executed (cached: true).
    const result2 = await svc.execute('rep-1', {}, ctx);
    expect(result2.cached).toBe(true);
    expect(fakeSql.calls).toHaveLength(1);
    const cachedEvent = events.published.find((e) => e.type === 'report.executed' && e.data.cached === true);
    expect(cachedEvent).toBeDefined();
  });

  it('bypassCache forces a fresh DB read', async () => {
    const fakeSql = new FakeSql([{ id: '1', total: 100 }]);
    const svc = new ReportExecutorService(
      new FakeDefinitionStore([makeDefinition()]),
      new ReportCacheService(),
      new FakePermissions(true),
      fakeSql,
      new FakeEventBus(),
    );
    await svc.execute('rep-1', {}, ctx);
    await svc.execute('rep-1', {}, ctx, { bypassCache: true });
    expect(fakeSql.calls).toHaveLength(2);
  });

  it('returns a failed status (not a thrown 500) when the DB query errors, and publishes report.failed', async () => {
    class ThrowingSql implements SqlExecutor {
      async query(): Promise<any> {
        throw new Error('connection reset');
      }
    }
    const events = new FakeEventBus();
    const svc = new ReportExecutorService(
      new FakeDefinitionStore([makeDefinition()]),
      new ReportCacheService(),
      new FakePermissions(true),
      new ThrowingSql(),
      events,
    );
    const result = await svc.execute('rep-1', {}, ctx);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('connection reset');
    const failedEvents = events.published.filter((e) => e.type === 'report.failed');
    expect(failedEvents.map((e) => e.topic).sort()).toEqual(['audit', 'reports-events']);
  });

  it('a broken event bus does not fail the report execution itself', async () => {
    class BrokenEventBus implements DomainEventBus {
      async publish(): Promise<void> {
        throw new Error('bus unavailable');
      }
      subscribe() {}
    }
    const svc = new ReportExecutorService(
      new FakeDefinitionStore([makeDefinition()]),
      new ReportCacheService(),
      new FakePermissions(true),
      new FakeSql([{ id: '1', total: 100 }]),
      new BrokenEventBus(),
    );
    const result = await svc.execute('rep-1', {}, ctx);
    expect(result.status).toBe('succeeded');
  });
});
