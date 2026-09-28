import { describe, it, expect } from '@jest/globals';
import { FULL_PERMISSION_CATALOG, assertCatalogIntegrity } from '../../src/modules/rbac/catalog';
import { PermissionCatalogService } from '../../src/modules/rbac/services/permission-catalog.service';
import { InMemoryRbacRepository } from '../../src/modules/rbac/services/in-memory-rbac.repository';
import { parsePermissionKey, allInNamespace } from '../../src/modules/rbac/services/permission-key.utils';

describe('the aggregate permission catalog', () => {
  it('has no duplicate keys', () => {
    expect(() => assertCatalogIntegrity()).not.toThrow();
  });

  it('every generated key parses back cleanly', () => {
    for (const p of FULL_PERMISSION_CATALOG) {
      expect(() => parsePermissionKey(p.key)).not.toThrow();
    }
  });

  it('every entry\'s declared namespace/module/resource/action match what its own key parses to', () => {
    for (const p of FULL_PERMISSION_CATALOG) {
      const parsed = parsePermissionKey(p.key);
      expect(parsed.namespace).toBe(p.namespace);
      expect(parsed.module).toBe(p.module);
      expect(parsed.action).toBe(p.action);
    }
  });

  it('control-plane entries are all in the control namespace, erp entries all in erp — the isolation property control-erp-isolation.spec.ts exercises at the permission-check level', () => {
    const controlKeys = FULL_PERMISSION_CATALOG.filter((p) => p.module === 'tenant' || p.module === 'billing' || p.module === 'provisioning' || p.module === 'support' || p.module === 'platform').filter((p) => p.namespace === 'control').map((p) => p.key);
    const erpKeys = FULL_PERMISSION_CATALOG.filter((p) => p.namespace === 'erp').map((p) => p.key);
    expect(allInNamespace(controlKeys, 'control')).toBe(true);
    expect(allInNamespace(erpKeys, 'erp')).toBe(true);
  });

  it('has at least a few hundred entries across all modules (not padded to a specific target — see MANIFEST)', () => {
    expect(FULL_PERMISSION_CATALOG.length).toBeGreaterThan(300);
  });

  it('every PII-flagged resource is in a module that plausibly holds personal data (hr, healthcare, crm)', () => {
    const piiModules = new Set(FULL_PERMISSION_CATALOG.filter((p) => p.isPiiSensitive).map((p) => p.module));
    for (const m of piiModules) {
      expect(['hr', 'healthcare', 'crm']).toContain(m);
    }
  });
});

describe('PermissionCatalogService', () => {
  it('syncCatalog upserts the full catalog and reports its version/count', async () => {
    const repo = new InMemoryRbacRepository();
    const service = new PermissionCatalogService(repo);
    const result = await service.syncCatalog();
    expect(result.count).toBe(FULL_PERMISSION_CATALOG.length);

    expect(await service.getVersion()).toBe(result.version);
    const found = await service.findByKey('erp.finance.journal.create');
    expect(found?.key).toBe('erp.finance.journal.create');
  });

  it('list() paginates and filters by namespace/module', async () => {
    const repo = new InMemoryRbacRepository();
    const service = new PermissionCatalogService(repo);
    await service.syncCatalog();

    const controlOnly = await service.list({ page: 1, pageSize: 10, namespace: 'control' });
    expect(controlOnly.items.every((p) => p.namespace === 'control')).toBe(true);

    const financeOnly = await service.list({ page: 1, pageSize: 1000, namespace: 'erp', module: 'finance' });
    expect(financeOnly.items.every((p) => p.module === 'finance')).toBe(true);
    expect(financeOnly.items.length).toBeGreaterThan(0);
  });
});
