import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, ConfigValidationError } from '../dist/index.js';

describe('Configuration Engine', () => {
  it('parses development configuration with standard defaults', () => {
    const config = parseConfig({
      NODE_ENV: 'development',
      PORT: '3000',
    });

    assert.equal(config.env, 'development');
    assert.equal(config.port, 3000);
    assert.equal(config.host, '0.0.0.0');
    assert.equal(config.isDevelopment, true);
    assert.equal(config.isProduction, false);
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

  it('enforces JWT_SECRET presence in production mode', () => {
    assert.throws(
      () => parseConfig({ NODE_ENV: 'production', PORT: '3000' }),
      (err: Error) => {
        assert.ok(err instanceof ConfigValidationError);
        assert.ok(err.message.includes('JWT_SECRET is a required secret in production'));
        return true;
      },
    );
  });
});
