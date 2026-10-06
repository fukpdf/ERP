import { describe, it, expect } from '@jest/globals';
import { atomicRbacMutation } from '../../src/modules/rbac/services/atomic-rbac-mutation';
import type { RbacRepository } from '../../src/modules/rbac/interfaces/rbac-repository.interface';
import type { RbacEventEmitter, RbacEventPayload } from '../../src/modules/rbac/interfaces/event-emitter.interface';

const event = (): RbacEventPayload => ({
  event: 'rbac.role.created', tenantId: 'tenant-1', actorUserId: 'actor-1', occurredAt: new Date(0), data: { roleId: 'role-1' },
});

describe('atomicRbacMutation', () => {
  it('uses the transaction-bound repository and outbox together when available', async () => {
    const calls: string[] = [];
    const txRepo = {} as RbacRepository;
    const repo = {
      withTenantTransaction: async (_tenant: string, _user: string, work: any) => {
        calls.push('begin');
        const outbox = { appendInTransaction: async () => calls.push('outbox') };
        const result = await work(txRepo, outbox);
        calls.push('commit');
        return result;
      },
    } as unknown as RbacRepository;
    const events = {
      emitInTransaction: async (outbox: any) => outbox.appendInTransaction({}),
      emit: async () => calls.push('legacy-event'),
    } as unknown as RbacEventEmitter;

    const result = await atomicRbacMutation({
      repo, events, tenantId: 'tenant-1', actorUserId: 'actor-1',
      mutate: async r => { expect(r).toBe(txRepo); calls.push('mutation'); return 'ok'; },
      event,
    });

    expect(result).toBe('ok');
    expect(calls).toEqual(['begin', 'mutation', 'outbox', 'commit']);
  });

  it('does not write an outbox event when the transactional mutation throws', async () => {
    const calls: string[] = [];
    const repo = {
      withTenantTransaction: async (_tenant: string, _user: string, work: any) => work({} as RbacRepository, { appendInTransaction: async () => calls.push('outbox') }),
    } as unknown as RbacRepository;
    const events = { emitInTransaction: async (outbox: any) => outbox.appendInTransaction({}), emit: async () => calls.push('legacy-event') } as unknown as RbacEventEmitter;

    await expect(atomicRbacMutation({
      repo, events, tenantId: 'tenant-1', actorUserId: 'actor-1',
      mutate: async () => { calls.push('mutation'); throw new Error('rollback'); },
      event,
    })).rejects.toThrow('rollback');
    expect(calls).toEqual(['mutation']);
  });
});
