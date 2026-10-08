import type { ServerResponse } from 'node:http';
import { AppError } from '../errors/app-error.js';
import { ExecutionContext } from '../context/execution-context.js';
import { logger } from '../logging/logger.js';

export interface SafeHttpErrorPayload {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly category: string;
    readonly message: string;
    readonly details?: unknown;
    readonly correlationId: string;
    readonly timestamp: string;
  };
}

export function translateErrorToResponse(
  err: unknown,
  isProduction = true,
): { statusCode: number; payload: SafeHttpErrorPayload } {
  const correlationId = ExecutionContext.getCorrelationId();

  if (err instanceof AppError) {
    const safe = err.toSafeResponse();
    return {
      statusCode: err.httpStatusCode,
      payload: {
        success: false,
        error: {
          code: safe.code,
          category: safe.category,
          message: safe.message,
          details: safe.details,
          correlationId: safe.correlationId || correlationId,
          timestamp: safe.timestamp,
        },
      },
    };
  }

  // Handle standard non-AppError exceptions
  const rawMessage = err instanceof Error ? err.message : String(err);
  
  // Log full internal error server-side
  logger.error('Unhandled internal server error caught by HTTP error boundary:', err as Error);

  const safeMessage = isProduction
    ? 'An internal server error occurred. Please contact system support with the provided correlation ID.'
    : rawMessage;

  return {
    statusCode: 500,
    payload: {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        category: 'INTERNAL',
        message: safeMessage,
        correlationId,
        timestamp: new Date().toISOString(),
      },
    },
  };
}

export function sendHttpErrorResponse(
  res: ServerResponse,
  err: unknown,
  isProduction = true,
): void {
  const { statusCode, payload } = translateErrorToResponse(err, isProduction);

  if (!res.headersSent) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'x-correlation-id': payload.error.correlationId,
    });
  }

  res.end(JSON.stringify(payload));
}
