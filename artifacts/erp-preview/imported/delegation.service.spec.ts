import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  isDelegationActive,
  assertValidDelegationWindow,
  assertNoCrossPlaneDelegation,
  DelegationService,
} from '../../src/modules/rbac/services/delegation.service';
import { InMemoryRbacRepository } from '../../src/modules/rbac/services/in-memory-rbac.repository';
import { InMemoryEventEmitter } from '../../src/modules/rbac/services/in-memory-event-emitter';
import {
  DelegationCrossPlaneError,
  DelegationExpiredError,
  DelegationWindowError,
} from '../../src/modules/rbac/errors/rbac.errors';

const HOUR = 60 * 60 * 1000;

describe('isDelegationActive (pure)', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('is active within the window and not revoked', () => {
    expect(isDelegationActive({ startAt: new Date(now.getTime() - HOUR), endAt: new Date(now.getTime() + HOUR) }, now)).toBe(true);
  });

  it('is not active before startAt', () => {
    expect(isDelegationActive({ startAt: new Date(now.getTime() + HOUR), endAt: new Date(now.getTime() + 2 * HOUR) }, now)).toBe(false);
  });

  it('is not active after endAt', () => {
    expect(isDelegationActive({ startAt: new Date(now.getTime() - 2 * HOUR), endAt: new Date(now.getTime() - HOUR) }, now)).toBe(false);
  });

  it('is not active once revoked, even mid-window', () => {
    expect(
      isDelegationActive(
        { startAt: new Date(now.getTime() - HOUR), endAt: new Date(now.getTime() + HOUR), revokedAt: new Date(now.getTime() - 1) },
        now,
      ),
    ).toBe(false);
  });

  it('is active exactly at the boundary instants (inclusive)', () => {
    expect(isDelegationActive({ startAt: now, endAt: new Date(now.getTime() + HOUR) }, now)).toBe(true);
    expect(isDelegationActive({ startAt: new Date(now.getTime() - HOUR), endAt: now }, now)).toBe(true);
  });
});

describe('assertValidDelegationWindow (pure)', () => {
  it('rejects endAt before or equal to startAt', () => {
    const t = new Date('2026-01-01T00:00:00Z');
    expect(() => assertValidDelegationWindow(t, t)).toThrow(DelegationWindowError);
    expect(() => assertValidDelegationWindow(t, new Date(t.getTime() - 1))).toThrow(DelegationWindowError);
  });

  it('accepts endAt after startAt', () => {
    const t = new Date('2026-01-01T00:00:00Z');
    expect(() => assertValidDelegationWindow(t, new Date(t.getTime() + 1))).not.toThrow();
  });
});

describe('assertNoCrossPlaneDelegation (pure)', () => {
  it('allows delegating an erp.* permission to a grantee already in the erp plane', () => {
    expect(() => assertNoCrossPlaneDelegation('erp.finance.journal.create', new Set(['erp']))).not.toThrow();
  });

  it('blocks delegating a control.* permission to a grantee with only erp-plane access', () => {
    expect(() => assertNoCrossPlaneDelegation('control.tenant.suspend', new Set(['erp']))).toThrow(DelegationCrossPlaneError);
  });

  it('blocks delegating an erp.* permission to a grantee with only control-plane access', () => {
    expect(() => assertNoCrossPlaneDelegation('erp.finance.journal.create', new Set(['control']))).toThrow(DelegationCrossPlaneError);
  });

  it('allows a control.* delegation when the grantee already has control-plane access', () => {
    expect(() => assertNoCrossPlaneDelegation('control.billing.plan.change', new Set(['control', 'erp']))).not.toThrow();
  });
});

describe('DelegationService', () => {
  let repo: InMemoryRbacRepository;
  let events: InMemoryEventEmitter;
  let service: DelegationService;
  const startAt = new Date('2026-06-01T00:00:00Z');
  const endAt = new Date('2026-06-08T00:00:00Z');

  beforeEach(() => {
    repo = new InMemoryRbacRepository();
    events = new InMemoryEventEmitter();
    service = new DelegationService(repo, events);
  });

  it('creates a delegation, persists it, and emits rbac.delegation.granted', async () => {
    const created = await service.create({
      tenantId: 'tenant-1',
      fromUserId: 'manager-1',
      toUserId: 'clerk-1',
      permissionKey: 'erp.finance.journal.approve',
      startAt,
      endAt,
      reason: 'covering for PTO',
      granteeExistingPlanes: new Set(['erp']),
    });

    expect(created.id).toBeDefined();
    const emitted = events.ofType('rbac.delegation.granted');
    expect(emitted).toHaveLength(1);
    expect(emitted[0].data.toUserId).toBe('clerk-1');
  });

  it('requires a non-empty reason', async () => {
    let threw = false;
    try {
      await service.create({
        tenantId: 't', fromUserId: 'a', toUserId: 'b', permissionKey: 'erp.a.b.c',
        startAt, endAt, reason: '   ', granteeExistingPlanes: new Set(['erp']),
      });
    } catch (err) {
      threw = err instanceof DelegationWindowError;
    }
    expect(threw).toBe(true);
  });

  it('rejects a control.* delegation to a grantee with no control-plane access', async () => {
    let threw = false;
    try {
      await service.create({
        tenantId: 'tenant-1', fromUserId: 'admin-1', toUserId: 'clerk-1',
        permissionKey: 'control.tenant.suspend', startAt, endAt,
        reason: 'test', granteeExistingPlanes: new Set(['erp']),
      });
    } catch (err) {
      threw = err instanceof DelegationCrossPlaneError;
    }
    expect(threw).toBe(true);
  });

  it('revoke() marks the delegation inactive and emits rbac.delegation.revoked', async () => {
    const created = await service.create({
      tenantId: 'tenant-1', fromUserId: 'manager-1', toUserId: 'clerk-1',
      permissionKey: 'erp.finance.journal.approve', startAt, endAt,
      reason: 'covering for PTO', granteeExistingPlanes: new Set(['erp']),
    });

    await service.revoke('tenant-1', created.id, 'manager-1');

    let threw = false;
    try {
      await service.assertActive(created.id, new Date('2026-06-02T00:00:00Z'));
    } catch (err) {
      threw = err instanceof DelegationExpiredError;
    }
    expect(threw).toBe(true);
    expect(events.ofType('rbac.delegation.revoked')).toHaveLength(1);
  });

  it('assertActive resolves for a currently-active delegation and rejects an unknown id', async () => {
    const created = await service.create({
      tenantId: 'tenant-1', fromUserId: 'manager-1', toUserId: 'clerk-1',
      permissionKey: 'erp.finance.journal.approve', startAt, endAt,
      reason: 'covering for PTO', granteeExistingPlanes: new Set(['erp']),
    });
    const resolved = await service.assertActive(created.id, new Date('2026-06-02T00:00:00Z'));
    expect(resolved.id).toBe(created.id);

    let threw = false;
    try {
      await service.assertActive('does-not-exist', new Date());
    } catch (err) {
      threw = err instanceof DelegationExpiredError;
    }
    expect(threw).toBe(true);
  });

  it('listActivePermissionKeys returns only currently-active delegated permissions', async () => {
    await service.create({
      tenantId: 'tenant-1', fromUserId: 'manager-1', toUserId: 'clerk-1',
      permissionKey: 'erp.finance.journal.approve', startAt, endAt,
      reason: 'active one', granteeExistingPlanes: new Set(['erp']),
    });
    await service.create({
      tenantId: 'tenant-1', fromUserId: 'manager-1', toUserId: 'clerk-1',
      permissionKey: 'erp.finance.journal.void',
      startAt: new Date('2020-01-01'), endAt: new Date('2020-01-02'),
      reason: 'long expired', granteeExistingPlanes: new Set(['erp']),
    });

    const active = await service.listActivePermissionKeys('clerk-1', 'tenant-1', new Date('2026-06-02T00:00:00Z'));
    expect(active).toEqual(['erp.finance.journal.approve']);
  });
});
