import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, ConfigValidationError } from '../dist/index.js';

describe('Configuration Engine', () => {
  it('parses development configuration with standard defaults and partitions secrets', () => {
    const config = parseConfig({
      NODE_ENV: 'development',
      PORT: '3000',
    });

    assert.equal(config.env, 'development');
    assert.equal(config.port, 3000);
    assert.equal(config.host, '0.0.0.0');
    assert.equal(config.isDevelopment, true);
    assert.equal(config.isProduction, false);
    assert.equal(config.shutdownTimeoutMs, 15000);
    assert.equal(config.requestTimeoutMs, 30000);

    const safe = config.toSafeConfig();
    assert.equal(safe.env, 'development');
    assert.equal(safe.port, 3000);
    assert.equal('jwtSecret' in safe, false);
    assert.equal(safe.hasJwtSecret, false);
  });

  it('rejects invalid port numbers with descriptive error', () => {
    assert.throws(
      () => parseConfig({ PORT: 'not-a-port' }),
      (err: Error) => {
        assert.ok(err instanceof ConfigValidationError);
        assert.ok(err.message.includes('PORT must be a valid port number'));
        return true;
      },
    );
  });

  it('rejects unsupported environments', () => {
    assert.throws(
      () => parseConfig({ NODE_ENV: 'unsupported_env' }),
      (err: Error) => {
        assert.ok(err instanceof ConfigValidationError);
        assert.ok(err.message.includes('NODE_ENV must be one of'));
        return true;
      },
    );
  });

  it('enforces JWT_SECRET presence and minimum length in production mode', () => {
    assert.throws(
      () => parseConfig({ NODE_ENV: 'production', PORT: '3000' }),
      (err: Error) => {
        assert.ok(err instanceof ConfigValidationError);
        assert.ok(err.message.includes('JWT_SECRET is a required secret in production'));
        return true;
      },
    );

    assert.throws(
      () => parseConfig({ NODE_ENV: 'production', PORT: '3000', JWT_SECRET: 'too-short' }),
      (err: Error) => {
        assert.ok(err instanceof ConfigValidationError);
        assert.ok(err.message.includes('JWT_SECRET must be at least 32 characters'));
        return true;
      },
    );
  });

  it('validates database and redis connection URLs without leaking sensitive parameters', () => {
    assert.throws(
      () => parseConfig({ DATABASE_URL: 'not-a-valid-url' }),
      (err: Error) => {
        assert.ok(err instanceof ConfigValidationError);
        assert.ok(err.message.includes('DATABASE_URL must be a valid PostgreSQL connection URL'));
        return true;
      },
    );

    assert.throws(
      () => parseConfig({ REDIS_URL: 'ftp://invalid-redis-protocol' }),
      (err: Error) => {
        assert.ok(err instanceof ConfigValidationError);
        assert.ok(err.message.includes('REDIS_URL must be a valid Redis connection URL'));
        return true;
      },
    );
  });

  it('rejects non-positive timeouts', () => {
    assert.throws(
      () => parseConfig({ SHUTDOWN_TIMEOUT_MS: '-500' }),
      (err: Error) => {
        assert.ok(err instanceof ConfigValidationError);
        assert.ok(err.message.includes('SHUTDOWN_TIMEOUT_MS must be a positive integer'));
        return true;
      },
    );
  });
});
