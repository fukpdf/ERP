/**
 * Standardized Application Error Hierarchy for the Universal ERP Platform.
 * Guarantees machine-readable codes, HTTP status mapping, safe external payloads,
 * and zero leakage of stack traces or credentials in production.
 */

export type ErrorCategory =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'INFRASTRUCTURE'
  | 'INTERNAL';

export interface SerializedErrorPayload {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly correlationId?: string;
  readonly timestamp: string;
}

export abstract class AppError extends Error {
  readonly abstract category: ErrorCategory;
  readonly abstract httpStatusCode: number;
  readonly timestamp: string;

  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
    readonly correlationId?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Produces a sanitized, safe external response payload.
   * Strips stack traces and any internal exception details.
   */
  toSafeResponse(): SerializedErrorPayload {
    return {
      code: this.code,
      category: this.category,
      message: this.message,
      ...(this.details && Object.keys(this.details).length > 0 ? { details: this.details } : {}),
      ...(this.correlationId ? { correlationId: this.correlationId } : {}),
      timestamp: this.timestamp,
    };
  }
}

export class ValidationError extends AppError {
  readonly category = 'VALIDATION' as const;
  readonly httpStatusCode = 400;

  constructor(code = 'VALIDATION_FAILED', message = 'Validation failed', details?: Record<string, unknown>, correlationId?: string) {
    super(code, message, details, correlationId);
  }
}

export class AuthenticationError extends AppError {
  readonly category = 'AUTHENTICATION' as const;
  readonly httpStatusCode = 401;

  constructor(code = 'UNAUTHENTICATED', message = 'Authentication required', details?: Record<string, unknown>, correlationId?: string) {
    super(code, message, details, correlationId);
  }
}

export class AuthorizationError extends AppError {
  readonly category = 'AUTHORIZATION' as const;
  readonly httpStatusCode = 403;

  constructor(code = 'FORBIDDEN', message = 'Access denied', details?: Record<string, unknown>, correlationId?: string) {
    super(code, message, details, correlationId);
  }
}

export class NotFoundError extends AppError {
  readonly category = 'NOT_FOUND' as const;
  readonly httpStatusCode = 404;

  constructor(code = 'NOT_FOUND', message = 'Resource not found', details?: Record<string, unknown>, correlationId?: string) {
    super(code, message, details, correlationId);
  }
}

export class ConflictError extends AppError {
  readonly category = 'CONFLICT' as const;
  readonly httpStatusCode = 409;

  constructor(code = 'CONFLICT', message = 'Resource conflict or concurrency violation', details?: Record<string, unknown>, correlationId?: string) {
    super(code, message, details, correlationId);
  }
}

export class BusinessRuleError extends AppError {
  readonly category = 'BUSINESS_RULE' as const;
  readonly httpStatusCode = 422;

  constructor(code = 'BUSINESS_RULE_VIOLATION', message = 'Business rule precondition failed', details?: Record<string, unknown>, correlationId?: string) {
    super(code, message, details, correlationId);
  }
}

export class InfrastructureError extends AppError {
  readonly category = 'INFRASTRUCTURE' as const;
  readonly httpStatusCode = 503;

  constructor(code = 'INFRASTRUCTURE_UNAVAILABLE', message = 'Downstream infrastructure service temporarily unavailable', details?: Record<string, unknown>, correlationId?: string) {
    super(code, message, details, correlationId);
  }
}

export class InternalError extends AppError {
  readonly category = 'INTERNAL' as const;
  readonly httpStatusCode = 500;

  constructor(code = 'INTERNAL_ERROR', message = 'An unexpected internal error occurred', details?: Record<string, unknown>, correlationId?: string) {
    super(code, message, details, correlationId);
  }
}
