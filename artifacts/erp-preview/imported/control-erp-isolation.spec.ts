/**
 * control-erp-isolation.spec.ts
 * Exercises UserRoleService's cross-plane check (control users cannot
 * silently gain erp.* access or vice versa) plus its interaction with SoD.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { UserRoleService } from '../../src/modules/rbac/services/user-role.service';
import { PermissionService } from '../../src/modules/rbac/services/permission.service';
import { PermissionCacheService } from '../../src/modules/rbac/services/permission-cache.service';
import { DelegationService } from '../../src/modules/rbac/services/delegation.service';
import { SodService } from '../../src/modules/rbac/services/sod.service';
import { InMemoryRbacRepository } from '../../src/modules/rbac/services/in-memory-rbac.repository';
import { InMemoryCacheStore } from '../../src/modules/rbac/services/in-memory-cache-store';
import { InMemoryEventEmitter } from '../../src/modules/rbac/services/in-memory-event-emitter';
import { CrossPlaneAccessError, SodViolationError } from '../../src/modules/rbac/errors/rbac.errors';

describe('control/erp plane isolation at assignment time', () => {
  let repo: InMemoryRbacRepository;
  let permissions: PermissionService;
  let sod: SodService;
  let events: InMemoryEventEmitter;
  let userRoles: UserRoleService;

  beforeEach(async () => {
    repo = new InMemoryRbacRepository();
    const cache = new PermissionCacheService(new InMemoryCacheStore(), 60);
    const delegations = new DelegationService(repo, new InMemoryEventEmitter());
    events = new InMemoryEventEmitter();
    permissions = new PermissionService(repo, cache, delegations, events);
    sod = new SodService(repo, events);
    userRoles = new UserRoleService(repo, permissions, sod, events);

    await repo.createRole({
      key: 'erp.finance.clerk', name: 'Finance Clerk', description: '', tenantId: 't1', isSystem: false,
      permissionKeys: ['erp.finance.journal.create'],
    });
    await repo.createRole({
      key: 'control.support.agent', name: 'Support Agent', description: '', tenantId: 't1', isSystem: false,
      permissionKeys: ['control.tenant.view'],
    });
  });

  it('allows the first-ever role assignment regardless of plane (nothing to cross from)', async () => {
    const assignment = await userRoles.assign({
      tenantId: 't1', userId: 'u1', roleKey: 'erp.finance.clerk', assignedByUserId: 'admin',
    });
    expect(assignment.roleKey).toBe('erp.finance.clerk');
  });

  it('allows a second role in the SAME plane', async () => {
    await userRoles.assign({ tenantId: 't1', userId: 'u1', roleKey: 'erp.finance.clerk', assignedByUserId: 'admin' });
    await repo.createRole({
      key: 'erp.finance.approver', name: 'Finance Approver', description: '', tenantId: 't1', isSystem: false,
      permissionKeys: ['erp.finance.journal.approve'],
    });
    const second = await userRoles.assign({ tenantId: 't1', userId: 'u1', roleKey: 'erp.finance.approver', assignedByUserId: 'admin' });
    expect(second.roleKey).toBe('erp.finance.approver');
  });

  it('blocks an ordinary assignment that would cross from erp to control, and alerts', async () => {
    await userRoles.assign({ tenantId: 't1', userId: 'u1', roleKey: 'erp.finance.clerk', assignedByUserId: 'admin' });

    let threw = false;
    try {
      await userRoles.assign({ tenantId: 't1', userId: 'u1', roleKey: 'control.support.agent', assignedByUserId: 'admin' });
    } catch (err) {
      threw = err instanceof CrossPlaneAccessError;
    }
    expect(threw).toBe(true);
    expect(events.ofType('rbac.cross_plane.attempted')).toHaveLength(1);
    // The blocked assignment must not have taken effect.
    expect(await permissions.userHasPermission('u1', 't1', 'control.tenant.view')).toBe(false);
  });

  it('allows the same cross-plane assignment when explicitly flagged as an audited grant', async () => {
    await userRoles.assign({ tenantId: 't1', userId: 'u1', roleKey: 'erp.finance.clerk', assignedByUserId: 'admin' });
    const assignment = await userRoles.assign({
      tenantId: 't1', userId: 'u1', roleKey: 'control.support.agent', assignedByUserId: 'admin',
      isExplicitCrossPlaneGrant: true,
    });
    expect(assignment.roleKey).toBe('control.support.agent');
    expect(await permissions.userHasPermission('u1', 't1', 'control.tenant.view')).toBe(true);
  });

  it('blocks an assignment that would create a blocking SoD conflict, even within one plane', async () => {
    await repo.createSodRule({
      tenantId: 't1', name: 'AP Clerk vs AP Approver', description: '',
      conflictingRoleKeys: ['erp.finance.clerk', 'erp.finance.approver2'],
      severity: 'block', isDefault: true,
    });
    await repo.createRole({
      key: 'erp.finance.approver2', name: 'Finance Approver 2', description: '', tenantId: 't1', isSystem: false,
      permissionKeys: ['erp.finance.journal.approve'],
    });

    await userRoles.assign({ tenantId: 't1', userId: 'u2', roleKey: 'erp.finance.clerk', assignedByUserId: 'admin' });

    let threw = false;
    try {
      await userRoles.assign({ tenantId: 't1', userId: 'u2', roleKey: 'erp.finance.approver2', assignedByUserId: 'admin' });
    } catch (err) {
      threw = err instanceof SodViolationError;
    }
    expect(threw).toBe(true);
  });

  it('revoking a role invalidates the cache so the permission disappears immediately', async () => {
    const assignment = await userRoles.assign({ tenantId: 't1', userId: 'u3', roleKey: 'erp.finance.clerk', assignedByUserId: 'admin' });
    expect(await permissions.userHasPermission('u3', 't1', 'erp.finance.journal.create')).toBe(true);

    await userRoles.revoke('t1', 'u3', assignment.id, 'admin');

    expect(await permissions.userHasPermission('u3', 't1', 'erp.finance.journal.create')).toBe(false);
    expect(events.ofType('rbac.user_role.revoked')).toHaveLength(1);
  });
});
