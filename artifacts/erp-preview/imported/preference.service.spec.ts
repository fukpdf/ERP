import { PreferenceService } from '../../src/modules/notifications/services/preference.service';

describe('PreferenceService', () => {
  let prisma: {
    notificationPreference: { findUnique: jest.Mock; upsert: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: PreferenceService;

  beforeEach(() => {
    prisma = {
      notificationPreference: { findUnique: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new PreferenceService(prisma as never);
  });

  it('always allows security-priority notifications regardless of stored preference', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({ enabled: false });

    const result = await service.isEnabled('t1', 'u1', 'auth.password.changed', 'email', 'security');
    expect(result).toBe(true);
    // The DB should not even need to be consulted for security priority.
    expect(prisma.notificationPreference.findUnique).not.toHaveBeenCalled();
  });

  it('respects an explicit opt-out for non-security notifications', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({ enabled: false });

    const result = await service.isEnabled('t1', 'u1', 'employee.onboarded', 'email', 'medium');
    expect(result).toBe(false);
  });

  it('defaults to enabled when no preference row exists', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);

    const result = await service.isEnabled('t1', 'u1', 'employee.onboarded', 'email', 'medium');
    expect(result).toBe(true);
  });

  it('rejects bulk updates that target security notification types', async () => {
    prisma.$transaction.mockResolvedValue([{ id: 'p1' }]);
    const securityTypes = new Set(['auth.password.changed']);

    const result = await service.bulkUpdate(
      't1',
      'u1',
      [
        { notificationType: 'auth.password.changed', channel: 'email', enabled: false },
        { notificationType: 'employee.onboarded', channel: 'email', enabled: false },
      ],
      securityTypes,
    );

    expect(result.rejectedSecurityOverrides).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.arrayContaining([expect.anything()]));
  });
});
