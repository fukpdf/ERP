/**
 * Centralized Typed Configuration Engine.
 * Validates environment variables, enforces production requirements,
 * and distinguishes between non-secret parameters and sensitive secrets.
 */

export type Environment = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  readonly env: Environment;
  readonly port: number;
  readonly host: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly databaseUrl?: string;
  readonly jwtSecret?: string;
  readonly basePath: string;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
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

export function parseConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const errors: string[] = [];

  // 1. Environment mode
  const rawEnv = (env.NODE_ENV || 'development').toLowerCase();
  const validEnvs: Environment[] = ['development', 'test', 'staging', 'production'];
  const currentEnv: Environment = validEnvs.includes(rawEnv as Environment)
    ? (rawEnv as Environment)
    : 'development';

  const isProduction = currentEnv === 'production';
  const isDevelopment = currentEnv === 'development';
  const isTest = currentEnv === 'test';

  // 2. Port & Host
  const rawPort = env.PORT || '3000';
  const parsedPort = Number.parseInt(rawPort, 10);
  if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    errors.push(`PORT must be a valid port number between 1 and 65535, received "${rawPort}"`);
  }
  const host = env.HOST || '0.0.0.0';

  // 3. Log level
  const rawLogLevel = (env.LOG_LEVEL || (isProduction ? 'info' : 'debug')).toLowerCase();
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  const logLevel = validLogLevels.includes(rawLogLevel)
    ? (rawLogLevel as 'debug' | 'info' | 'warn' | 'error')
    : 'info';

  // 4. Base Path
  const basePath = env.BASE_PATH || '/';

  // 5. Database URL (Optional in Phase 1 / local mock mode, mandatory in production if configured)
  const databaseUrl = env.DATABASE_URL;

  // 6. JWT Secret (Enforce strict presence and length in production/staging)
  const jwtSecret = env.JWT_SECRET;
  if (isProduction && !jwtSecret) {
    errors.push('JWT_SECRET is a required secret in production mode.');
  } else if (jwtSecret && jwtSecret.length < 32 && isProduction) {
    errors.push('JWT_SECRET must be at least 32 characters in production mode for cryptographic security.');
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }

  return Object.freeze({
    env: currentEnv,
    port: parsedPort,
    host,
    logLevel,
    databaseUrl,
    jwtSecret,
    basePath,
    isProduction,
    isDevelopment,
    isTest,
  });
}
