jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

import * as nodemailer from 'nodemailer';
import { EmailChannel } from '../../src/modules/notifications/channels/email.channel';

describe('EmailChannel', () => {
  let channel: EmailChannel;
  let sendMail: jest.Mock;
  let verify: jest.Mock;

  beforeEach(() => {
    sendMail = jest.fn();
    verify = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail, verify });
    channel = new EmailChannel();
  });

  const config = { host: 'smtp.test', port: 587, user: 'u', pass: 'p', from: 'noreply@test.com' };

  it('validates required config fields', () => {
    expect(channel.validateConfig({}).valid).toBe(false);
    expect(channel.validateConfig(config).valid).toBe(true);
  });

  it('sends successfully and returns the provider message id', async () => {
    sendMail.mockResolvedValue({ messageId: 'msg-123' });

    const result = await channel.send(
      { deliveryId: 'd1', notificationId: 'n1', tenantId: 't1', recipientId: 'user@test.com', config, testMode: false },
      { subject: 'Hi', body: 'Body' },
    );

    expect(result.success).toBe(true);
    expect(result.providerRef).toBe('msg-123');
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'user@test.com', subject: 'Hi' }));
  });

  it('prefixes the subject with [TEST] in test mode and sends to the test target', async () => {
    sendMail.mockResolvedValue({ messageId: 'msg-124' });

    await channel.send(
      {
        deliveryId: 'd1',
        notificationId: 'n1',
        tenantId: 't1',
        recipientId: 'user@test.com',
        config,
        testMode: true,
        testTarget: 'qa@test.com',
      },
      { subject: 'Hi', body: 'Body' },
    );

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'qa@test.com', subject: '[TEST] Hi' }));
  });

  it('classifies a 5xx SMTP error as permanent', async () => {
    sendMail.mockRejectedValue(new Error('550 mailbox unavailable'));

    const result = await channel.send(
      { deliveryId: 'd1', notificationId: 'n1', tenantId: 't1', recipientId: 'bad@test.com', config, testMode: false },
      { subject: 'Hi', body: 'Body' },
    );

    expect(result.success).toBe(false);
    expect(result.permanent).toBe(true);
  });

  it('test() reports failure when config is invalid', async () => {
    const result = await channel.test({});
    expect(result.success).toBe(false);
  });

  it('test() verifies the SMTP connection', async () => {
    verify.mockResolvedValue(true);
    const result = await channel.test(config);
    expect(result.success).toBe(true);
  });
});
