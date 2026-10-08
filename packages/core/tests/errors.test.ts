import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  InfrastructureError,
  InternalError,
} from '../dist/index.js';

describe('AppError Hierarchy', () => {
  it('correctly maps HTTP status codes and categories', () => {
    assert.equal(new ValidationError().httpStatusCode, 400);
    assert.equal(new AuthenticationError().httpStatusCode, 401);
    assert.equal(new AuthorizationError().httpStatusCode, 403);
    assert.equal(new NotFoundError().httpStatusCode, 404);
    assert.equal(new ConflictError().httpStatusCode, 409);
    assert.equal(new BusinessRuleError().httpStatusCode, 422);
    assert.equal(new InfrastructureError().httpStatusCode, 503);
    assert.equal(new InternalError().httpStatusCode, 500);
  });

  it('produces sanitized external response without leaking stack traces', () => {
    const err = new BusinessRuleError(
      'INSUFFICIENT_CREDIT',
      'Customer credit limit exceeded',
      { creditLimit: 50000, currentBalance: 52000 },
      'corr-xyz-123',
    );

    const safe = err.toSafeResponse();
    assert.equal(safe.code, 'INSUFFICIENT_CREDIT');
    assert.equal(safe.category, 'BUSINESS_RULE');
    assert.equal(safe.message, 'Customer credit limit exceeded');
    assert.equal(safe.correlationId, 'corr-xyz-123');
    assert.deepEqual(safe.details, { creditLimit: 50000, currentBalance: 52000 });
    assert.ok(safe.timestamp);
    assert.equal('stack' in safe, false);
  });
});
