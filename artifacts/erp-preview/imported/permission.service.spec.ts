import { describe, it, expect, beforeEach } from '@jest/globals';
import { PermissionService } from '../../src/modules/rbac/services/permission.service';
import { PermissionCacheService } from '../../src/modules/rbac/services/permission-cache.service';
import { DelegationService } from '../../src/modules/rbac/services/delegation.service';
import { InMemoryRbacRepository } from '../../src/modules/rbac/services/in-memory-rbac.repository';
import { InMemoryCacheStore } from '../../src/modules/rbac/services/in-memory-cache-store';
import { InMemoryEventEmitter } from '../../src/modules/rbac/services/in-memory-event-emitter';
import { PermissionDeniedError } from '../../src/modules/rbac/errors/rbac.errors';

describe('PermissionService', () => {
  let repo: InMemoryRbacRepository;
  let cacheStore: InMemoryCacheStore;
  let cache: PermissionCacheService;
  let delegationEvents: InMemoryEventEmitter;
  let delegations: DelegationService;
  let events: InMemoryEventEmitter;
  let service: PermissionService;

  beforeEach(async () => {
    repo = new InMemoryRbacRepository();
    cacheStore = new InMemoryCacheStore();
    cache = new PermissionCacheService(cacheStore, 60);
    delegationEvents = new InMemoryEventEmitter();
    delegations = new DelegationService(repo, delegationEvents);
    events = new InMemoryEventEmitter();
    service = new PermissionService(repo, cache, delegations, events);

    const role = await repo.createRole({
      key: 'erp.sales.manager', name: 'Sales Manager', description: '', tenantId: 'tenant-1', isSystem: false,
      permissionKeys: ['erp.sales.order.create', 'erp.sales.order.approve'],
    });
    await repo.assignRoleToUser({
      userId: 'user-1', roleId: role.id, roleKey: role.key, tenantId: 'tenant-1', assignedByUserId: 'admin',
    });

    const group = await repo.createGroup({
      tenantId: 'tenant-1', name: 'Reporting readers', permissionKeys: ['erp.reports.dashboard.view'],
    });
    await repo.addGroupMember(group.id, 'user-1');
  });

  it('resolves permissions granted via a role', async () => {
    expect(await service.userHasPermission('user-1', 'tenant-1', 'erp.sales.order.create')).toBe(true);
  });

  it('resolves permissions granted via a group', async () => {
    expect(await service.userHasPermission('user-1', 'tenant-1', 'erp.reports.dashboard.view')).toBe(true);
  });

  it('resolves permissions granted via an active delegation', async () => {
    await delegations.create({
      tenantId: 'tenant-1', fromUserId: 'admin', toUserId: 'user-1',
      permissionKey: 'erp.finance.journal.approve',
      startAt: new Date(Date.now() - 1000), endAt: new Date(Date.now() + 100_000),
      reason: 'covering PTO', granteeExistingPlanes: new Set(['erp']),
    });
    expect(await service.userHasPermission('user-1', 'tenant-1', 'erp.finance.journal.approve')).toBe(true);
  });

  it('denies a permission the user has none of the three grant types for', async () => {
    expect(await service.userHasPermission('user-1', 'tenant-1', 'control.tenant.suspend')).toBe(false);
  });

  it('userHasAllPermissions requires every key, and fails closed on an empty requirement list', async () => {
    expect(await service.userHasAllPermissions('user-1', 'tenant-1', ['erp.sales.order.create'])).toBe(true);
    expect(await service.userHasAllPermissions('user-1', 'tenant-1', ['erp.sales.order.create', 'control.tenant.suspend'])).toBe(false);
    expect(await service.userHasAllPermissions('user-1', 'tenant-1', [])).toBe(false);
  });

  it('assertHasPermission throws PermissionDeniedError and emits rbac.permission.denied on denial', async () => {
    let threw = false;
    try {
      await service.assertHasPermission('user-1', 'tenant-1', 'control.tenant.suspend');
    } catch (err) {
      threw = err instanceof PermissionDeniedError;
    }
    expect(threw).toBe(true);
    expect(events.ofType('rbac.permission.denied')).toHaveLength(1);
  });

  it('assertHasPermission resolves silently and emits nothing when the user has the permission', async () => {
    await service.assertHasPermission('user-1', 'tenant-1', 'erp.sales.order.create');
    expect(events.all()).toHaveLength(0);
  });

  it('caches the effective set — a role change is not reflected until the cache is invalidated', async () => {
    expect(await service.userHasPermission('user-1', 'tenant-1', 'erp.sales.order.create')).toBe(true);

    // Mutate the underlying data directly (bypassing the service, as a
    // concurrent admin action would) without invalidating the cache.
    const role = await repo.findRoleByKey('tenant-1', 'erp.sales.manager');
    await repo.removePermissionFromRole(role!.id, 'erp.sales.order.create');

    // Still true: served from the stale cache.
    expect(await service.userHasPermission('user-1', 'tenant-1', 'erp.sales.order.create')).toBe(true);

    await service.invalidateUserCache('user-1', 'tenant-1');

    // Now reflects the change.
    expect(await service.userHasPermission('user-1', 'tenant-1', 'erp.sales.order.create')).toBe(false);
  });

  it('invalidateTenantCache clears every user in the tenant', async () => {
    await service.getEffectivePermissions('user-1', 'tenant-1'); // warm the cache
    expect(await cache.getEffectivePermissions('tenant-1', 'user-1')).toBeDefined();
    await service.invalidateTenantCache('tenant-1');
    expect(await cache.getEffectivePermissions('tenant-1', 'user-1')).toBeUndefined();
  });

  it('planesForUser aggregates the namespaces of every effective permission', async () => {
    await delegations.create({
      tenantId: 'tenant-1', fromUserId: 'admin', toUserId: 'user-1',
      permissionKey: 'erp.finance.journal.approve',
      startAt: new Date(Date.now() - 1000), endAt: new Date(Date.now() + 100_000),
      reason: 'test', granteeExistingPlanes: new Set(['erp']),
    });
    const planes = await service.planesForUser('user-1', 'tenant-1');
    expect([...planes]).toEqual(['erp']);
  });

  it('planesForUser returns an empty set for a user with no permissions at all', async () => {
    const planes = await service.planesForUser('nobody', 'tenant-1');
    expect(planes.size).toBe(0);
  });
});
