/**
 * Centralized Typed Configuration Engine.
 * Validates environment variables, enforces environment-specific requirements,
 * partitions non-secret and secret parameters, and guarantees zero secret leakage.
 */

export type Environment = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  // Non-secret runtime settings
  readonly env: Environment;
  readonly appName: string;
  readonly appVersion: string;
  readonly port: number;
  readonly host: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly shutdownTimeoutMs: number;
  readonly requestTimeoutMs: number;
  readonly basePath: string;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
  readonly isStaging: boolean;

  // Sensitive Secrets (Never exposed or logged)
  readonly secrets: {
    readonly jwtSecret?: string;
    readonly databaseUrl?: string;
    readonly redisUrl?: string;
  };

  /**
   * Returns a sanitized copy of configuration safe for logging or telemetry.
   */
  toSafeConfig(): Record<string, unknown>;
}

export class ConfigValidationError extends Error {
  constructor(public readonly missingOrInvalidFields: readonly string[]) {
    super(
      `Configuration Validation Error: Missing or invalid environment parameters:\n` +
        missingOrInvalidFields.map((f) => `  - ${f}`).join('\n'),
    );
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validates a URL without revealing any embedded password or query parameters in error messages.
 */
function isValidUrl(urlString: string, allowedProtocols?: string[]): boolean {
  try {
    const parsed = new URL(urlString);
    if (allowedProtocols && !allowedProtocols.includes(parsed.protocol)) {
      return false;
    }
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function parseConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const errors: string[] = [];

  // 1. Environment validation
  const rawEnv = (env.NODE_ENV || 'development').trim().toLowerCase();
  const validEnvs: Environment[] = ['development', 'test', 'staging', 'production'];
  if (!validEnvs.includes(rawEnv as Environment)) {
    errors.push(
      `NODE_ENV must be one of [development, test, staging, production], received "${rawEnv}"`,
    );
  }
  const currentEnv: Environment = validEnvs.includes(rawEnv as Environment)
    ? (rawEnv as Environment)
    : 'development';

  const isProduction = currentEnv === 'production';
  const isDevelopment = currentEnv === 'development';
  const isTest = currentEnv === 'test';
  const isStaging = currentEnv === 'staging';

  // 2. Application identification
  const appName = env.APP_NAME || 'northstar-erp';
  const appVersion = env.APP_VERSION || '0.1.0';

  // 3. Port & Host
  const rawPort = env.PORT || '3000';
  const parsedPort = Number.parseInt(rawPort, 10);
  if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    errors.push(`PORT must be a valid port number between 1 and 65535, received "${rawPort}"`);
  }
  const host = env.HOST || '0.0.0.0';

  // 4. Log Level
  const rawLogLevel = (env.LOG_LEVEL || (isProduction ? 'info' : 'debug')).trim().toLowerCase();
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(rawLogLevel)) {
    errors.push(
      `LOG_LEVEL must be one of [debug, info, warn, error], received "${rawLogLevel}"`,
    );
  }
  const logLevel = validLogLevels.includes(rawLogLevel)
    ? (rawLogLevel as 'debug' | 'info' | 'warn' | 'error')
    : 'info';

  // 5. Timeouts
  const rawShutdownTimeout = env.SHUTDOWN_TIMEOUT_MS || '15000';
  const shutdownTimeoutMs = Number.parseInt(rawShutdownTimeout, 10);
  if (Number.isNaN(shutdownTimeoutMs) || shutdownTimeoutMs < 100) {
    errors.push(
      `SHUTDOWN_TIMEOUT_MS must be a positive integer >= 100, received "${rawShutdownTimeout}"`,
    );
  }

  const rawRequestTimeout = env.REQUEST_TIMEOUT_MS || '30000';
  const requestTimeoutMs = Number.parseInt(rawRequestTimeout, 10);
  if (Number.isNaN(requestTimeoutMs) || requestTimeoutMs < 100) {
    errors.push(
      `REQUEST_TIMEOUT_MS must be a positive integer >= 100, received "${rawRequestTimeout}"`,
    );
  }

  // 6. Base Path
  const basePath = env.BASE_PATH || '/';

  // 7. Secrets: JWT_SECRET
  const jwtSecret = env.JWT_SECRET;
  if ((isProduction || isStaging) && !jwtSecret) {
    errors.push('JWT_SECRET is a required secret in production and staging modes.');
  } else if (jwtSecret && jwtSecret.length < 32 && (isProduction || isStaging)) {
    errors.push(
      'JWT_SECRET must be at least 32 characters in production/staging for cryptographic security.',
    );
  }

  // 8. Secrets: DATABASE_URL
  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl && !isValidUrl(databaseUrl, ['postgres:', 'postgresql:'])) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection URL (e.g. postgresql://...).');
  }

  // 9. Secrets: REDIS_URL
  const redisUrl = env.REDIS_URL;
  if (redisUrl && !isValidUrl(redisUrl, ['redis:', 'rediss:'])) {
    errors.push('REDIS_URL must be a valid Redis connection URL (e.g. redis://...).');
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }

  const configObj: AppConfig = {
    env: currentEnv,
    appName,
    appVersion,
    port: parsedPort,
    host,
    logLevel,
    shutdownTimeoutMs,
    requestTimeoutMs,
    basePath,
    isProduction,
    isDevelopment,
    isTest,
    isStaging,
    secrets: {
      jwtSecret,
      databaseUrl,
      redisUrl,
    },
    toSafeConfig(): Record<string, unknown> {
      return {
        env: currentEnv,
        appName,
        appVersion,
        port: parsedPort,
        host,
        logLevel,
        shutdownTimeoutMs,
        requestTimeoutMs,
        basePath,
        isProduction,
        isDevelopment,
        isTest,
        isStaging,
        hasDatabaseUrl: Boolean(databaseUrl),
        hasRedisUrl: Boolean(redisUrl),
        hasJwtSecret: Boolean(jwtSecret),
      };
    },
  };

  return Object.freeze(configObj);
}
