import { DigestService } from '../../src/modules/notifications/services/digest.service';

describe('DigestService', () => {
  let prisma: {
    digest: { upsert: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    notification: { update: jest.Mock };
  };
  let renderer: { render: jest.Mock };
  let channelService: { getConfig: jest.Mock; getAdapter: jest.Mock };
  let events: { emit: jest.Mock };
  let eventPublisher: { publish: jest.Mock };
  let service: DigestService;

  beforeEach(() => {
    prisma = {
      digest: { upsert: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      notification: { update: jest.fn() },
    };
    renderer = { render: jest.fn().mockResolvedValue({ subject: 'S', body: 'B' }) };
    channelService = { getConfig: jest.fn(), getAdapter: jest.fn() };
    events = { emit: jest.fn() };
    eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new DigestService(prisma as never, renderer as never, channelService as never, events as never, eventPublisher as never);
  });

  it('creates a default daily digest for a new user', async () => {
    prisma.digest.upsert.mockResolvedValue({ id: 'dg1', frequency: 'daily', timezone: 'UTC' });
    const digest = await service.getOrCreate('t1', 'u1');
    expect(digest.frequency).toBe('daily');
  });

  it('does not enqueue a notification into a digest that is turned off', async () => {
    prisma.digest.upsert.mockResolvedValue({ id: 'dg1', frequency: 'off', timezone: 'UTC' });
    const enqueued = await service.enqueue('t1', 'u1', 'n1');
    expect(enqueued).toBe(false);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('attaches a notification to the digest when enabled', async () => {
    prisma.digest.upsert.mockResolvedValue({ id: 'dg1', frequency: 'daily', timezone: 'UTC' });
    const enqueued = await service.enqueue('t1', 'u1', 'n1');
    expect(enqueued).toBe(true);
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { digestId: 'dg1' } });
  });

  it('sends due digests and skips empty ones without emailing', async () => {
    const now = new Date('2026-01-05T08:00:00Z'); // 8am UTC
    prisma.digest.findMany.mockResolvedValue([
      { id: 'dg1', tenantId: 't1', userId: 'u1', timezone: 'UTC', lastSentAt: null, notifications: [] },
      {
        id: 'dg2',
        tenantId: 't1',
        userId: 'u2',
        timezone: 'UTC',
        lastSentAt: null,
        notifications: [{ id: 'n1', subject: 'S', body: 'B', type: 'x', createdAt: now }],
      },
    ]);
    channelService.getConfig.mockResolvedValue({ isEnabled: true, config: {}, testMode: false });
    channelService.getAdapter.mockReturnValue({ send: jest.fn().mockResolvedValue({ success: true }) });

    const result = await service.sendDue('daily', now);

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(events.emit).toHaveBeenCalledWith('digest.sent', expect.anything());
    expect(eventPublisher.publish).toHaveBeenCalledWith('digest.sent', expect.objectContaining({ digestId: 'dg2', userId: 'u2' }));
  });

  it('does not send when it is not the tenant local 8am hour', async () => {
    const now = new Date('2026-01-05T14:00:00Z'); // 2pm UTC
    prisma.digest.findMany.mockResolvedValue([
      { id: 'dg1', tenantId: 't1', userId: 'u1', timezone: 'UTC', lastSentAt: null, notifications: [] },
    ]);

    const result = await service.sendDue('daily', now);
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
