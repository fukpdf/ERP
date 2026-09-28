import { describe, it, expect, beforeEach } from '@jest/globals';
import { detectSodViolations, assertNotSelfApproving, SodService } from '../../src/modules/rbac/services/sod.service';
import { UserRoleService } from '../../src/modules/rbac/services/user-role.service';
import { PermissionService } from '../../src/modules/rbac/services/permission.service';
import { PermissionCacheService } from '../../src/modules/rbac/services/permission-cache.service';
import { DelegationService } from '../../src/modules/rbac/services/delegation.service';
import { InMemoryRbacRepository } from '../../src/modules/rbac/services/in-memory-rbac.repository';
import { InMemoryCacheStore } from '../../src/modules/rbac/services/in-memory-cache-store';
import { InMemoryEventEmitter } from '../../src/modules/rbac/services/in-memory-event-emitter';
import { DEFAULT_SOD_RULES } from '../../src/modules/rbac/templates/sod-rules';
import { SodViolationError } from '../../src/modules/rbac/errors/rbac.errors';

describe('cross-plane SoD rule (example)', () => {
  it('fires once a user somehow holds both a control platform-admin role and an erp finance-approver role', () => {
    const rule = { ...DEFAULT_SOD_RULES.find((r) => r.name === 'Cross-plane admin overlap (example)')!, id: 'r-cross' };
    const violations = detectSodViolations('u1', ['control.platform_admin', 'erp.finance.approver'], [rule]);
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe('warn'); // policy choice, not a hard block — see sod-rules.ts
  });
});

describe('assertNotSelfApproving (maker-checker — "cannot create and approve same PO")', () => {
  it('blocks the creator from approving their own record', () => {
    expect(() => assertNotSelfApproving('user-1', 'user-1', 'purchase order')).toThrow(SodViolationError);
  });

  it('allows a different user to approve', () => {
    expect(() => assertNotSelfApproving('user-1', 'user-2', 'purchase order')).not.toThrow();
  });
});

describe('an explicit cross-plane grant followed by a cross-plane SoD check', () => {
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
      key: 'erp.finance.approver', name: 'Finance Approver', description: '', tenantId: 't1', isSystem: false,
      permissionKeys: ['erp.finance.journal.approve'],
    });
    await repo.createRole({
      key: 'control.platform_admin', name: 'Platform Admin', description: '', tenantId: 't1', isSystem: false,
      permissionKeys: ['control.platform.feature_flag.toggle'],
    });
    for (const rule of DEFAULT_SOD_RULES) {
      await repo.createSodRule(rule);
    }
  });

  it('an ordinary (non-explicit) attempt to cross planes is blocked before SoD is even reached', async () => {
    await userRoles.assign({ tenantId: 't1', userId: 'u1', roleKey: 'erp.finance.approver', assignedByUserId: 'admin' });
    let threw = false;
    try {
      await userRoles.assign({ tenantId: 't1', userId: 'u1', roleKey: 'control.platform_admin', assignedByUserId: 'admin' });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('an explicit cross-plane grant succeeds and the tenant\'s own cross-plane SoD policy can then flag it as a warning', async () => {
    await userRoles.assign({ tenantId: 't1', userId: 'u1', roleKey: 'erp.finance.approver', assignedByUserId: 'admin' });
    const assignment = await userRoles.assign({
      tenantId: 't1', userId: 'u1', roleKey: 'control.platform_admin', assignedByUserId: 'admin',
      isExplicitCrossPlaneGrant: true,
    });
    expect(assignment.roleKey).toBe('control.platform_admin');

    // The assignment itself succeeded (technical cross-plane block was
    // lifted via the explicit flag), but the tenant's own SoD policy can
    // still surface it — as a warning here, since this example rule is
    // seeded with severity 'warn', not 'block'.
    const roleKeys = await repo.listRoleKeysForUser('u1', 't1');
    const violations = await sod.checkUserRoleSet('t1', 'u1', roleKeys);
    expect(violations.some((v) => v.ruleName === 'Cross-plane admin overlap (example)')).toBe(true);
    expect(() => sod.assertNoBlockingViolations(violations)).not.toThrow(); // warn, not block
  });
});
