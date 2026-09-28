import { describe, it, expect, beforeEach } from '@jest/globals';
import { detectSodViolations, SodService } from '../../src/modules/rbac/services/sod.service';
import { InMemoryRbacRepository } from '../../src/modules/rbac/services/in-memory-rbac.repository';
import { InMemoryEventEmitter } from '../../src/modules/rbac/services/in-memory-event-emitter';
import { SodViolationError } from '../../src/modules/rbac/errors/rbac.errors';
import type { SodRuleDef } from '../../src/modules/rbac/interfaces/rbac-domain.types';

function rule(overrides: Partial<SodRuleDef> = {}): SodRuleDef {
  return {
    id: 'rule-1',
    tenantId: 'tenant-1',
    name: 'AP Clerk vs AP Approver',
    description: 'Cannot create and approve the same payable',
    conflictingRoleKeys: ['erp.finance.ap_clerk', 'erp.finance.ap_approver'],
    severity: 'block',
    isDefault: true,
    ...overrides,
  };
}

describe('detectSodViolations (pure)', () => {
  it('finds a violation when a user holds both sides of a rule', () => {
    const violations = detectSodViolations('user-1', ['erp.finance.ap_clerk', 'erp.finance.ap_approver'], [rule()]);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('rule-1');
    expect(violations[0].conflictingRoleKeys).toEqual(['erp.finance.ap_clerk', 'erp.finance.ap_approver']);
  });

  it('finds nothing when a user holds only one side', () => {
    expect(detectSodViolations('user-1', ['erp.finance.ap_clerk'], [rule()])).toHaveLength(0);
  });

  it('finds nothing when a user holds neither side', () => {
    expect(detectSodViolations('user-1', ['erp.sales.rep'], [rule()])).toHaveLength(0);
  });

  it('is order-independent', () => {
    const a = detectSodViolations('u', ['erp.finance.ap_approver', 'erp.finance.ap_clerk'], [rule()]);
    expect(a).toHaveLength(1);
  });

  it('evaluates every rule, not just the first', () => {
    const rules = [
      rule({ id: 'r1', conflictingRoleKeys: ['a', 'b'] }),
      rule({ id: 'r2', conflictingRoleKeys: ['c', 'd'] }),
    ];
    const violations = detectSodViolations('u', ['a', 'b', 'c', 'd'], rules);
    expect(violations).toHaveLength(2);
  });

  it('supports a cross-plane rule (control.* vs erp.*) the same way as any other pair', () => {
    const crossPlaneRule = rule({
      id: 'r-cross',
      name: 'Control admin vs ERP financial approver',
      conflictingRoleKeys: ['control.tenant.admin', 'erp.finance.ap_approver'],
    });
    const violations = detectSodViolations('u', ['control.tenant.admin', 'erp.finance.ap_approver'], [crossPlaneRule]);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('r-cross');
  });
});

describe('SodService', () => {
  let repo: InMemoryRbacRepository;
  let events: InMemoryEventEmitter;
  let service: SodService;

  beforeEach(async () => {
    repo = new InMemoryRbacRepository();
    events = new InMemoryEventEmitter();
    service = new SodService(repo, events);
    await repo.createSodRule({
      tenantId: 'tenant-1',
      name: 'AP Clerk vs AP Approver',
      description: 'test rule',
      conflictingRoleKeys: ['erp.finance.ap_clerk', 'erp.finance.ap_approver'],
      severity: 'block',
      isDefault: true,
    });
  });

  it('persists a violation record and emits rbac.sod.violation when one is found', async () => {
    const violations = await service.checkUserRoleSet('tenant-1', 'user-1', [
      'erp.finance.ap_clerk',
      'erp.finance.ap_approver',
    ]);
    expect(violations).toHaveLength(1);

    const recorded = await repo.listSodViolations('tenant-1', { page: 1, pageSize: 10 });
    expect(recorded.total).toBe(1);

    const emitted = events.ofType('rbac.sod.violation');
    expect(emitted).toHaveLength(1);
    expect(emitted[0].tenantId).toBe('tenant-1');
  });

  it('emits nothing and persists nothing when there is no conflict', async () => {
    await service.checkUserRoleSet('tenant-1', 'user-1', ['erp.finance.ap_clerk']);
    expect(events.all()).toHaveLength(0);
  });

  it('assertNoBlockingViolations throws SodViolationError only for block-severity violations', async () => {
    const violations = await service.checkUserRoleSet('tenant-1', 'user-1', [
      'erp.finance.ap_clerk',
      'erp.finance.ap_approver',
    ]);
    expect(() => service.assertNoBlockingViolations(violations)).toThrow(SodViolationError);
  });

  it('assertNoBlockingViolations does not throw for warn-severity violations', async () => {
    await repo.createSodRule({
      tenantId: 'tenant-1',
      name: 'soft warning rule',
      description: 'test',
      conflictingRoleKeys: ['erp.sales.rep', 'erp.sales.manager'],
      severity: 'warn',
      isDefault: false,
    });
    const violations = await service.checkUserRoleSet('tenant-1', 'user-2', ['erp.sales.rep', 'erp.sales.manager']);
    expect(violations).toHaveLength(1);
    expect(() => service.assertNoBlockingViolations(violations)).not.toThrow();
  });
});
