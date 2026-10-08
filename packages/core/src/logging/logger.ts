import { ExecutionContext } from '../context/execution-context.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly correlationId: string;
  readonly tenantId?: string;
  readonly context?: Record<string, unknown>;
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly code?: string;
    readonly stack?: string;
  };
}

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'key',
  'creditcard',
  'pan',
  'cvv',
  'ssn',
  'nationalid',
  'iban',
]);

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Recursively redacts sensitive keys from log context dictionaries.
 */
export function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 8 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class StructuredLogger implements ILogger {
  private minLevelPriority: number;

  constructor(
    private readonly serviceName = 'erp-platform',
    minLevel: LogLevel = 'info',
    private readonly isProduction = process.env.NODE_ENV === 'production',
  ) {
    this.minLevelPriority = LOG_LEVEL_PRIORITY[minLevel] ?? 20;
  }

  private write(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < this.minLevelPriority) {
      return;
    }

    const currentContext = ExecutionContext.current();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: currentContext?.correlationId ?? 'system',
      ...(currentContext?.tenantId ? { tenantId: currentContext.tenantId } : {}),
      ...(context ? { context: redactSensitiveData(context) as Record<string, unknown> } : {}),
      ...(error
        ? {
            error: {
              name: error.name,
              message: error.message,
              ...('code' in error && typeof (error as Record<string, unknown>).code === 'string'
                ? { code: (error as Record<string, unknown>).code as string }
                : {}),
              ...(!this.isProduction && error.stack ? { stack: error.stack } : {}),
            },
          }
        : {}),
    };

    const serialized = JSON.stringify(entry);
    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.write('error', message, context, error);
  }
}

export const logger = new StructuredLogger('universal-erp');
