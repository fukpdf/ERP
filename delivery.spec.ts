import { DeliveryService } from '../../src/modules/notifications/services/delivery.service';

describe('DeliveryService', () => {
  let prisma: {
    notificationDelivery: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    notification: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock; count: jest.Mock };
  };
  let channelService: { getConfig: jest.Mock; getAdapter: jest.Mock };
  let renderer: { render: jest.Mock };
  let inAppService: { pushUnreadCount: jest.Mock };
  let retryService: { scheduleRetry: jest.Mock; moveToDlq: jest.Mock };
  let events: { emit: jest.Mock };
  let eventPublisher: { publish: jest.Mock };
  let service: DeliveryService;

  beforeEach(() => {
    prisma = {
      notificationDelivery: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      notification: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    };
    channelService = { getConfig: jest.fn(), getAdapter: jest.fn() };
    renderer = { render: jest.fn().mockResolvedValue({ subject: 'S', body: 'B' }) };
    inAppService = { pushUnreadCount: jest.fn() };
    retryService = { scheduleRetry: jest.fn(), moveToDlq: jest.fn() };
    events = { emit: jest.fn() };
    eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    service = new DeliveryService(
      prisma as never,
      channelService as never,
      renderer as never,
      inAppService as never,
      retryService as never,
      events as never,
      eventPublisher as never,
    );
  });

  it('is a no-op when the delivery is already sent', async () => {
    prisma.notificationDelivery.findUnique.mockResolvedValue({ id: 'd1', status: 'sent' });

    await service.attempt('d1', {
      notificationId: 'n1',
      tenantId: 't1',
      recipientId: 'u1',
      channel: 'email',
      templateKey: 'auth/welcome',
      locale: 'en',
      context: {},
    });

    expect(renderer.render).not.toHaveBeenCalled();
  });

  it('marks a delivery failed and permanent when the channel is not configured', async () => {
    prisma.notificationDelivery.findUnique.mockResolvedValue({ id: 'd1', status: 'pending' });
    channelService.getConfig.mockResolvedValue(null);
    channelService.getAdapter.mockReturnValue({ send: jest.fn() });
    prisma.notificationDelivery.update.mockResolvedValue({ id: 'd1', attempts: 1, channel: 'sms', notificationId: 'n1' });

    await service.attempt('d1', {
      notificationId: 'n1',
      tenantId: 't1',
      recipientId: 'u1',
      channel: 'sms',
      templateKey: 'auth/welcome',
      locale: 'en',
      context: {},
    });

    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
    expect(retryService.moveToDlq).toHaveBeenCalled();
  });

  it('records success, clears any pending retry, and emits notification.sent (in-process + queue)', async () => {
    prisma.notificationDelivery.findUnique.mockResolvedValue({ id: 'd1', status: 'pending' });
    channelService.getConfig.mockResolvedValue({ isEnabled: true, config: {}, testMode: false });
    channelService.getAdapter.mockReturnValue({ send: jest.fn().mockResolvedValue({ success: true, providerRef: 'abc' }) });
    prisma.notificationDelivery.update.mockResolvedValue({
      id: 'd1',
      notificationId: 'n1',
      channel: 'email',
      status: 'sent',
    });

    await service.attempt('d1', {
      notificationId: 'n1',
      tenantId: 't1',
      recipientId: 'u1',
      channel: 'email',
      templateKey: 'auth/welcome',
      locale: 'en',
      context: {},
    });

    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'sent', providerRef: 'abc' }) }),
    );
    expect(events.emit).toHaveBeenCalledWith('notification.sent', expect.anything());
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'notification.sent',
      expect.objectContaining({ notificationId: 'n1', deliveryId: 'd1', channel: 'email' }),
    );
  });

  it('schedules a retry on a transient failure', async () => {
    prisma.notificationDelivery.findUnique.mockResolvedValue({ id: 'd1', status: 'pending' });
    channelService.getConfig.mockResolvedValue({ isEnabled: true, config: {}, testMode: false });
    channelService.getAdapter.mockReturnValue({
      send: jest.fn().mockResolvedValue({ success: false, error: 'SMTP timeout', permanent: false }),
    });
    prisma.notificationDelivery.update.mockResolvedValue({ id: 'd1', attempts: 1 });

    await service.attempt('d1', {
      notificationId: 'n1',
      tenantId: 't1',
      recipientId: 'u1',
      channel: 'email',
      templateKey: 'auth/welcome',
      locale: 'en',
      context: {},
    });

    expect(retryService.scheduleRetry).toHaveBeenCalledWith('d1', 1, 'SMTP timeout');
  });

  it('marks a notification read, refreshes unread count, and emits notification.read (in-process + queue)', async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 'n1', recipientId: 'u1', tenantId: 't1', readAt: null });
    const readAt = new Date();
    prisma.notification.update.mockResolvedValue({ id: 'n1', readAt });
    prisma.notification.count.mockResolvedValue(2);

    const result = await service.markRead('n1', 'u1');

    expect(result).toBeTruthy();
    expect(inAppService.pushUnreadCount).toHaveBeenCalledWith('u1', 2);
    expect(events.emit).toHaveBeenCalledWith('notification.read', expect.anything());
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'notification.read',
      expect.objectContaining({ notificationId: 'n1', recipientId: 'u1' }),
    );
  });

  it('returns null when marking read for a notification owned by someone else', async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 'n1', recipientId: 'someone-else', tenantId: 't1' });

    const result = await service.markRead('n1', 'u1');
    expect(result).toBeNull();
    expect(events.emit).not.toHaveBeenCalled();
  });
});
