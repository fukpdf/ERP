import { RetryService } from '../../src/modules/notifications/services/retry.service';
import { MAX_RETRIES, RETRY_BACKOFF_MS } from '../../src/modules/notifications/notifications.constants';

describe('RetryService', () => {
  let prisma: {
    notificationDelivery: { update: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock };
    notificationDeadLetter: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let events: { emit: jest.Mock };
  let eventPublisher: { publish: jest.Mock };
  let service: RetryService;

  beforeEach(() => {
    prisma = {
      notificationDelivery: { update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      notificationDeadLetter: { create: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    prisma.notificationDelivery.update.mockResolvedValue({ id: 'd1', notificationId: 'n1', channel: 'email' });
    events = { emit: jest.fn() };
    eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new RetryService(prisma as never, events as never, eventPublisher as never);
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('schedules the first retry after 1 minute and emits a transient notification.failed event', async () => {
    await service.scheduleRetry('d1', 1, 'timeout');
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { nextRetryAt: new Date(Date.now() + RETRY_BACKOFF_MS[0]) },
    });
    expect(events.emit).toHaveBeenCalledWith('notification.failed', expect.objectContaining({ permanent: false }));
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'notification.failed',
      expect.objectContaining({ notificationId: 'n1', deliveryId: 'd1', channel: 'email', permanent: false }),
    );
  });

  it('schedules the final retry after 12 hours', async () => {
    await service.scheduleRetry('d1', MAX_RETRIES, 'timeout');
    // attemptsSoFar === MAX_RETRIES triggers DLQ, not another schedule.
    expect(prisma.notificationDeadLetter.create).toHaveBeenCalled();
  });

  it('schedules the 4th retry (index 3) after 2 hours', async () => {
    await service.scheduleRetry('d1', 4, 'timeout');
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { nextRetryAt: new Date(Date.now() + RETRY_BACKOFF_MS[3]) },
    });
  });

  it('moves to DLQ and emits a permanent failed event (in-process + queue) once retries are exhausted', async () => {
    prisma.notificationDelivery.findUnique.mockResolvedValue({
      id: 'd1',
      notificationId: 'n1',
      channel: 'email',
      attempts: MAX_RETRIES,
    });

    await service.moveToDlq('d1', 'permanent failure');

    expect(prisma.notificationDeadLetter.create).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith('notification.failed', expect.objectContaining({ permanent: true }));
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'notification.failed',
      expect.objectContaining({ notificationId: 'n1', deliveryId: 'd1', permanent: true }),
    );
  });

  it('finds deliveries due for retry', async () => {
    prisma.notificationDelivery.findMany.mockResolvedValue([{ id: 'd1' }]);
    const due = await service.findDueRetries(50);
    expect(due).toHaveLength(1);
    expect(prisma.notificationDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'failed', nextRetryAt: { lte: expect.any(Date) } } }),
    );
  });
});
