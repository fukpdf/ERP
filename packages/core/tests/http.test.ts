import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeCorrelationId,
  translateErrorToResponse,
  ValidationError,
  ConflictError,
} from '../dist/index.js';

describe('HTTP Layer & Error Boundary', () => {
  it('sanitizes correlation IDs and rejects unsafe characters', () => {
    // Valid alphanumeric and dash/underscore
    assert.equal(sanitizeCorrelationId('req-trace-1234_abc'), 'req-trace-1234_abc');
    assert.equal(sanitizeCorrelationId('12345678-abcd-ef01-2345-6789abcdef01'), '12345678-abcd-ef01-2345-6789abcdef01');

    // Missing -> generates valid UUID
    const generated = sanitizeCorrelationId(undefined);
    assert.ok(generated.length >= 32);

    // XSS / SQL Injection attempt -> rejected and replaced with safe UUID
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeCorrelationId(malicious);
    assert.notEqual(sanitized, malicious);
    assert.ok(!sanitized.includes('<script>'));
  });

  it('translates AppError subclasses to standardized HTTP responses', () => {
    const valErr = new ValidationError('FIELD_INVALID', 'Invalid tax registration number', { field: 'taxId' });
    const { statusCode: valStatus, payload: valPayload } = translateErrorToResponse(valErr, true);

    assert.equal(valStatus, 400);
    assert.equal(valPayload.success, false);
    assert.equal(valPayload.error.code, 'FIELD_INVALID');
    assert.equal(valPayload.error.category, 'VALIDATION');
    assert.equal(valPayload.error.message, 'Invalid tax registration number');
    assert.deepEqual(valPayload.error.details, { field: 'taxId' });

    const conflictErr = new ConflictError('DUPLICATE_SKU', 'SKU already exists');
    const { statusCode: conflictStatus } = translateErrorToResponse(conflictErr, true);
    assert.equal(conflictStatus, 409);
  });

  it('sanitizes generic unexpected errors in production mode without leaking details', () => {
    const rawError = new Error('DATABASE_CONNECTION_REFUSED: password secret_pass_123 failed');
    const { statusCode, payload } = translateErrorToResponse(rawError, true);

    assert.equal(statusCode, 500);
    assert.equal(payload.success, false);
    assert.equal(payload.error.code, 'INTERNAL_SERVER_ERROR');
    // Verify password is NOT in response
    assert.ok(!payload.error.message.includes('secret_pass_123'));
    assert.ok(!payload.error.message.includes('DATABASE_CONNECTION_REFUSED'));
    assert.ok(payload.error.message.includes('internal server error occurred'));
  });
});
