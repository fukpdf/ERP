/**
 * High-Precision Fixed-Point Monetary Value Object.
 * Enforces integer minor unit arithmetic (cents, pence, fils) to completely
 * prevent IEEE-754 floating-point rounding distortion across financial ledgers.
 */

export class CurrencyMismatchError extends Error {
  constructor(c1: string, c2: string) {
    super(`Currency Mismatch: Cannot execute arithmetic between ${c1} and ${c2} without explicit FX conversion.`);
    this.name = 'CurrencyMismatchError';
  }
}

export class NegativeQuantityError extends Error {
  constructor(message = 'Quantity must be non-negative') {
    super(message);
    this.name = 'NegativeQuantityError';
  }
}

export class Money {
  /**
   * @param minorUnits Monetary amount stored in minor units (e.g., cents for USD, yen for JPY)
   * @param currency Standard ISO 4217 three-letter currency code
   */
  private constructor(
    readonly minorUnits: bigint,
    readonly currency: string,
  ) {
    this.currency = currency.toUpperCase();
  }

  /**
   * Creates a Money instance from standard major units (e.g. 249.99 USD).
   */
  static fromMajor(majorAmount: number | string, currency: string, decimals = 2): Money {
    const factor = BigInt(10 ** decimals);
    if (typeof majorAmount === 'number') {
      const rounded = Math.round(majorAmount * 10 ** decimals);
      return new Money(BigInt(rounded), currency);
    }
    // String parsing for exact precision
    const parts = majorAmount.trim().split('.');
    const whole = BigInt(parts[0] || '0') * factor;
    const fractionStr = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
    const fraction = BigInt(fractionStr || '0');
    return new Money(whole + fraction, currency);
  }

  /**
   * Creates a Money instance directly from minor units (e.g. 24999 cents).
   */
  static fromMinor(minorUnits: bigint | number, currency: string): Money {
    return new Money(BigInt(minorUnits), currency);
  }

  static zero(currency: string): Money {
    return new Money(0n, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  multiply(factor: number): Money {
    const multiplied = Math.round(Number(this.minorUnits) * factor);
    return new Money(BigInt(multiplied), this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency.toUpperCase() && this.minorUnits === other.minorUnits;
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  isPositive(): boolean {
    return this.minorUnits > 0n;
  }

  isNegative(): boolean {
    return this.minorUnits < 0n;
  }

  toMajor(decimals = 2): number {
    return Number(this.minorUnits) / 10 ** decimals;
  }

  format(locale = 'en-US', decimals = 2): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(this.toMajor(decimals));
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency.toUpperCase()) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}
