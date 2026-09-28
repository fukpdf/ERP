import { InAppChannel } from '../../src/modules/notifications/channels/in-app.channel';

describe('InAppChannel', () => {
  let inAppService: { pushToUser: jest.Mock };
  let channel: InAppChannel;

  beforeEach(() => {
    inAppService = { pushToUser: jest.fn() };
    channel = new InAppChannel(inAppService as never);
  });

  it('pushes to the recipient via InAppService and reports ws-delivered on success', async () => {
    inAppService.pushToUser.mockReturnValue(true);

    const result = await channel.send(
      { deliveryId: 'd1', notificationId: 'n1', tenantId: 't1', recipientId: 'u1', config: {}, testMode: false },
      { subject: 'Hi', body: 'Body', data: { foo: 'bar' } },
    );

    expect(result.success).toBe(true);
    expect(result.providerRef).toBe('ws-delivered');
    expect(inAppService.pushToUser).toHaveBeenCalledWith('u1', {
      notificationId: 'n1',
      subject: 'Hi',
      body: 'Body',
      data: { foo: 'bar' },
    });
  });

  it('still reports success when the user has no live socket (row is persisted regardless)', async () => {
    inAppService.pushToUser.mockReturnValue(false);

    const result = await channel.send(
      { deliveryId: 'd1', notificationId: 'n1', tenantId: 't1', recipientId: 'u1', config: {}, testMode: false },
      { subject: 'Hi', body: 'Body' },
    );

    expect(result.success).toBe(true);
    expect(result.providerRef).toBe('ws-offline');
  });

  it('requires no external config to validate', () => {
    expect(channel.validateConfig({}).valid).toBe(true);
  });
});
