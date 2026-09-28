import { describe, it, expect, beforeEach } from '@jest/globals';
import { PermissionCacheService } from '../../src/modules/rbac/services/permission-cache.service';
import { InMemoryCacheStore } from '../../src/modules/rbac/services/in-memory-cache-store';

describe('PermissionCacheService', () => {
  let store: InMemoryCacheStore;
  let cache: PermissionCacheService;

  beforeEach(() => {
    store = new InMemoryCacheStore();
    cache = new PermissionCacheService(store, 60);
  });

  it('returns undefined (cache miss) before anything is cached', async () => {
    expect(await cache.getEffectivePermissions('tenant-1', 'user-1')).toBeUndefined();
  });

  it('round-trips a permission set', async () => {
    await cache.setEffectivePermissions('tenant-1', 'user-1', new Set(['erp.a.b.c', 'erp.d.e.f']));
    const result = await cache.getEffectivePermissions('tenant-1', 'user-1');
    expect([...(result ?? [])].sort()).toEqual(['erp.a.b.c', 'erp.d.e.f']);
  });

  it('keeps different users separate', async () => {
    await cache.setEffectivePermissions('tenant-1', 'user-1', new Set(['erp.a.b.c']));
    await cache.setEffectivePermissions('tenant-1', 'user-2', new Set(['erp.x.y.z']));
    expect([...(await cache.getEffectivePermissions('tenant-1', 'user-1'))!]).toEqual(['erp.a.b.c']);
    expect([...(await cache.getEffectivePermissions('tenant-1', 'user-2'))!]).toEqual(['erp.x.y.z']);
  });

  it('keeps different tenants separate even for the same user id', async () => {
    await cache.setEffectivePermissions('tenant-1', 'user-1', new Set(['erp.a.b.c']));
    await cache.setEffectivePermissions('tenant-2', 'user-1', new Set(['erp.x.y.z']));
    expect([...(await cache.getEffectivePermissions('tenant-1', 'user-1'))!]).toEqual(['erp.a.b.c']);
    expect([...(await cache.getEffectivePermissions('tenant-2', 'user-1'))!]).toEqual(['erp.x.y.z']);
  });

  it('invalidateUser clears only that user', async () => {
    await cache.setEffectivePermissions('tenant-1', 'user-1', new Set(['erp.a.b.c']));
    await cache.setEffectivePermissions('tenant-1', 'user-2', new Set(['erp.x.y.z']));
    await cache.invalidateUser('tenant-1', 'user-1');
    expect(await cache.getEffectivePermissions('tenant-1', 'user-1')).toBeUndefined();
    expect(await cache.getEffectivePermissions('tenant-1', 'user-2')).toBeDefined();
  });

  it('invalidateTenant clears every user in that tenant but no other tenant', async () => {
    await cache.setEffectivePermissions('tenant-1', 'user-1', new Set(['erp.a.b.c']));
    await cache.setEffectivePermissions('tenant-1', 'user-2', new Set(['erp.x.y.z']));
    await cache.setEffectivePermissions('tenant-2', 'user-3', new Set(['erp.p.q.r']));

    await cache.invalidateTenant('tenant-1');

    expect(await cache.getEffectivePermissions('tenant-1', 'user-1')).toBeUndefined();
    expect(await cache.getEffectivePermissions('tenant-1', 'user-2')).toBeUndefined();
    expect(await cache.getEffectivePermissions('tenant-2', 'user-3')).toBeDefined();
  });

  it('respects TTL expiry (0-second TTL is immediately stale)', async () => {
    const zeroTtlCache = new PermissionCacheService(store, 0);
    await zeroTtlCache.setEffectivePermissions('tenant-1', 'user-9', new Set(['erp.a.b.c']));
    // Sleep past the 0-second expiry window.
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await zeroTtlCache.getEffectivePermissions('tenant-1', 'user-9')).toBeUndefined();
  });
});
