import { describe, it, expect, beforeEach } from '@jest/globals';
import { RoleService } from '../../src/modules/rbac/services/role.service';
import { InMemoryRbacRepository } from '../../src/modules/rbac/services/in-memory-rbac.repository';
import { InMemoryEventEmitter } from '../../src/modules/rbac/services/in-memory-event-emitter';
import { InvalidPermissionKeyError, UnknownPermissionError } from '../../src/modules/rbac/errors/rbac.errors';

describe('RoleService', () => {
  let repo: InMemoryRbacRepository;
  let events: InMemoryEventEmitter;
  let service: RoleService;

  beforeEach(() => {
    repo = new InMemoryRbacRepository();
    events = new InMemoryEventEmitter();
    service = new RoleService(repo, events);
  });

  it('creates a role and emits rbac.role.created', async () => {
    const role = await service.create('admin-1', {
      key: 'erp.custom.reviewer', name: 'Reviewer', description: 'Reviews things', tenantId: 't1',
    });
    expect(role.id).toBeDefined();
    expect(role.permissionKeys).toEqual([]);
    expect(events.ofType('rbac.role.created')).toHaveLength(1);
  });

  it('update() patches fields and emits rbac.role.updated', async () => {
    const role = await service.create('admin-1', { key: 'erp.custom.x', name: 'X', description: '', tenantId: 't1' });
    const updated = await service.update('admin-1', 't1', role.id, { description: 'new description' });
    expect(updated.description).toBe('new description');
    expect(events.ofType('rbac.role.updated')).toHaveLength(1);
  });

  it('delete() removes a custom role and emits rbac.role.deleted', async () => {
    const role = await service.create('admin-1', { key: 'erp.custom.y', name: 'Y', description: '', tenantId: 't1' });
    await service.delete('admin-1', 't1', role.id);
    expect(await service.findById(role.id)).toBeNull();
    expect(events.ofType('rbac.role.deleted')).toHaveLength(1);
  });

  it('delete() refuses to delete a system role', async () => {
    const role = await repo.createRole({
      key: 'system.owner', name: 'Owner', description: '', tenantId: null, isSystem: true, permissionKeys: [],
    });
    let threw = false;
    try {
      await service.delete('admin-1', 't1', role.id);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(await service.findById(role.id)).not.toBeNull(); // still there
  });

  it('addPermission rejects a malformed permission key before touching the repository', async () => {
    const role = await service.create('admin-1', { key: 'erp.custom.z', name: 'Z', description: '', tenantId: 't1' });
    let threw = false;
    try {
      await service.addPermission('admin-1', 't1', role.id, 'not a valid key!');
    } catch (err) {
      threw = err instanceof InvalidPermissionKeyError;
    }
    expect(threw).toBe(true);
  });

  it('addPermission rejects a well-formed key that is not in the catalog', async () => {
    const role = await service.create('admin-1', { key: 'erp.custom.z2', name: 'Z2', description: '', tenantId: 't1' });
    let threw = false;
    try {
      await service.addPermission('admin-1', 't1', role.id, 'erp.nonexistent.thing.create');
    } catch (err) {
      threw = err instanceof UnknownPermissionError;
    }
    expect(threw).toBe(true);
  });

  it('addPermission succeeds for a real catalog key and emits rbac.permission.assigned', async () => {
    await repo.upsertCatalogPermissions(
      [{ key: 'erp.custom.thing.create', namespace: 'erp', module: 'custom', resource: 'thing', action: 'create', description: '' }],
      '2026.01.0',
    );
    const role = await service.create('admin-1', { key: 'erp.custom.z3', name: 'Z3', description: '', tenantId: 't1' });
    await service.addPermission('admin-1', 't1', role.id, 'erp.custom.thing.create');
    const updated = await service.findById(role.id);
    expect(updated!.permissionKeys).toContain('erp.custom.thing.create');
    expect(events.ofType('rbac.permission.assigned')).toHaveLength(1);
  });

  it('list() paginates results scoped to the tenant (plus system roles)', async () => {
    await service.create('admin-1', { key: 'erp.custom.a', name: 'A', description: '', tenantId: 't1' });
    await service.create('admin-1', { key: 'erp.custom.b', name: 'B', description: '', tenantId: 't1' });
    await service.create('admin-1', { key: 'erp.custom.c', name: 'C', description: '', tenantId: 't2' }); // different tenant

    const page = await service.list('t1', 1, 10);
    expect(page.total).toBe(2);
    expect(page.items.map((r) => r.key).sort()).toEqual(['erp.custom.a', 'erp.custom.b']);
  });
});
