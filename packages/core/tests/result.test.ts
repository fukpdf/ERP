import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ok, err } from '../dist/index.js';

describe('Result Container', () => {
  it('handles Ok cases correctly', () => {
    const res = ok(42);
    assert.equal(res.isOk, true);
    assert.equal(res.isErr, false);
    assert.equal(res.unwrap(), 42);
    assert.equal(res.unwrapOr(100), 42);

    const mapped = res.map((v) => v * 2);
    assert.equal(mapped.unwrap(), 84);
  });

  it('handles Err cases correctly', () => {
    const failure = new Error('Test failure');
    const res = err(failure);
    assert.equal(res.isOk, false);
    assert.equal(res.isErr, true);
    assert.equal(res.unwrapOr(99), 99);

    assert.throws(() => res.unwrap(), /Test failure/);

    const mappedErr = res.mapErr((e) => new Error(`Wrapped: ${e.message}`));
    assert.equal(mappedErr.isErr, true);
    assert.throws(() => mappedErr.unwrap(), /Wrapped: Test failure/);
  });
});
