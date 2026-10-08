/**
 * Functional Result container for predictable, type-safe error handling.
 * Eliminates unhandled runtime exceptions across foundational boundaries.
 */

export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

export class Ok<T, E = never> {
  readonly isOk = true as const;
  readonly isErr = false as const;

  constructor(readonly value: T) {}

  map<U>(fn: (val: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  mapErr<F>(_fn: (err: E) => F): Result<T, F> {
    return new Ok(this.value);
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }
}

export class Err<T = never, E = Error> {
  readonly isOk = false as const;
  readonly isErr = true as const;

  constructor(readonly error: E) {}

  map<U>(_fn: (val: T) => U): Result<U, E> {
    return new Err(this.error);
  }

  mapErr<F>(fn: (err: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  unwrap(): never {
    if (this.error instanceof Error) {
      throw this.error;
    }
    throw new Error(String(this.error));
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }
}

export function ok<T, E = never>(value: T): Result<T, E> {
  return new Ok(value);
}

export function err<T = never, E = Error>(error: E): Result<T, E> {
  return new Err(error);
}
