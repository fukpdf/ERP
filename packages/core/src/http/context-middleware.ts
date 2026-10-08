import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ExecutionContext, RequestContext } from '../context/execution-context.js';

const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-.]{8,128}$/;

/**
 * Sanitizes and validates inbound correlation or trace IDs.
 * Generates a cryptographic UUID if missing or invalid.
 */
export function sanitizeCorrelationId(inboundId?: string | string[]): string {
  if (!inboundId) {
    return crypto.randomUUID();
  }

  const raw = Array.isArray(inboundId) ? inboundId[0] : inboundId;
  const trimmed = raw.trim();

  if (SAFE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  return crypto.randomUUID();
}

export interface RequestMetricsContext {
  startTime: number;
  correlationId: string;
  traceId?: string;
  method: string;
  path: string;
}

/**
 * Executes a request within the isolated ExecutionContext.
 * Attaches correlation ID to response headers and ensures cleanup.
 */
export async function withRequestContext<T>(
  req: IncomingMessage,
  res: ServerResponse,
  handler: () => Promise<T>,
): Promise<T> {
  const correlationId = sanitizeCorrelationId(
    req.headers['x-correlation-id'] || req.headers['x-request-id'],
  );
  
  const rawTraceId = req.headers['x-trace-id'];
  const traceId = typeof rawTraceId === 'string' && SAFE_ID_REGEX.test(rawTraceId.trim())
    ? rawTraceId.trim()
    : undefined;

  const rawTenantId = req.headers['x-tenant-id'];
  const tenantId = typeof rawTenantId === 'string' && SAFE_ID_REGEX.test(rawTenantId.trim())
    ? rawTenantId.trim()
    : undefined;

  // Always echo correlation ID back to caller
  res.setHeader('x-correlation-id', correlationId);

  const context: RequestContext = {
    correlationId,
    traceId,
    tenantId,
  };

  return ExecutionContext.run(context, async () => {
    try {
      return await handler();
    } finally {
      // Automatic cleanup handled by AsyncLocalStorage
    }
  });
}
