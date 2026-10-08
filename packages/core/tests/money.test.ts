import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Money, CurrencyMismatchError } from '../dist/index.js';

describe('Money Value Object', () => {
  it('correctly calculates integer minor unit amounts', () => {
    const price1 = Money.fromMajor(249.99, 'USD');
    const price2 = Money.fromMajor(79.99, 'USD');

    const total = price1.add(price2);
    assert.equal(total.minorUnits, 32998n);
    assert.equal(total.toMajor(), 329.98);
    assert.equal(total.currency, 'USD');
  });

  it('rejects cross-currency arithmetic without conversion', () => {
    const usd = Money.fromMajor(100, 'USD');
    const eur = Money.fromMajor(100, 'EUR');

    assert.throws(
      () => usd.add(eur),
      (err: Error) => {
        assert.ok(err instanceof CurrencyMismatchError);
        assert.ok(err.message.includes('USD and EUR'));
        return true;
      },
    );
  });

  it('supports exact multiplication and subtraction', () => {
    const unitPrice = Money.fromMajor(19.95, 'USD');
    const total = unitPrice.multiply(3);
    assert.equal(total.toMajor(), 59.85);

    const discount = Money.fromMajor(10.0, 'USD');
    const net = total.subtract(discount);
    assert.equal(net.toMajor(), 49.85);
  });
});
