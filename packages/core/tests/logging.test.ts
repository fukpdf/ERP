import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { redactSensitiveData } from '../dist/logging/logger.js';

describe('Structured Logging & Redaction', () => {
  it('recursively redacts credentials and PII from log payloads', () => {
    const sensitivePayload = {
      user: 'john_doe',
      auth: {
        password: 'super-secret-password-123',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
      payment: {
        creditCard: '4111-2222-3333-4444',
        amount: 500,
        currency: 'USD',
      },
      meta: {
        publicNote: 'Order confirmation',
        apiKey: 'sk_live_983274982374982',
      },
    };

    const redacted = redactSensitiveData(sensitivePayload) as Record<string, unknown>;

    assert.equal(redacted.user, 'john_doe');
    assert.deepEqual((redacted.auth as Record<string, unknown>).password, '[REDACTED]');
    assert.deepEqual((redacted.auth as Record<string, unknown>).token, '[REDACTED]');
    assert.deepEqual((redacted.payment as Record<string, unknown>).creditCard, '[REDACTED]');
    assert.equal((redacted.payment as Record<string, unknown>).amount, 500);
    assert.equal((redacted.payment as Record<string, unknown>).currency, 'USD');
    assert.deepEqual((redacted.meta as Record<string, unknown>).apiKey, '[REDACTED]');
    assert.equal((redacted.meta as Record<string, unknown>).publicNote, 'Order confirmation');
  });
});
