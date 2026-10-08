import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ServiceContainer,
  ServiceRegistrationError,
  CircularDependencyError,
  MissingDependencyError,
  type IService,
} from '../dist/index.js';

describe('ServiceContainer & Dependency Resolution', () => {
  it('registers services and initializes them in topological dependency order', async () => {
    const container = new ServiceContainer();
    const order: string[] = [];

    const dbService: IService = {
      name: 'database',
      dependencies: [],
      async initialize() {
        order.push('database');
      },
      async shutdown() {
        order.push('database_shutdown');
      },
    };

    const cacheService: IService = {
      name: 'cache',
      dependencies: ['database'],
      async initialize() {
        order.push('cache');
      },
      async shutdown() {
        order.push('cache_shutdown');
      },
    };

    const authService: IService = {
      name: 'auth',
      dependencies: ['database', 'cache'],
      async initialize() {
        order.push('auth');
      },
      async shutdown() {
        order.push('auth_shutdown');
      },
    };

    // Register in non-topological order
    container.register(authService);
    container.register(cacheService);
    container.register(dbService);

    assert.equal(container.has('database'), true);
    assert.equal(container.has('cache'), true);
    assert.equal(container.has('auth'), true);

    await container.startAll();

    // Verify topological order: database -> cache -> auth
    assert.deepEqual(order, ['database', 'cache', 'auth']);

    // Verify reverse shutdown order: auth -> cache -> database
    await container.stopAll();
    assert.deepEqual(order, [
      'database',
      'cache',
      'auth',
      'auth_shutdown',
      'cache_shutdown',
      'database_shutdown',
    ]);
  });

  it('detects circular dependencies and throws CircularDependencyError', () => {
    const container = new ServiceContainer();

    const serviceA: IService = {
      name: 'serviceA',
      dependencies: ['serviceB'],
    };

    const serviceB: IService = {
      name: 'serviceB',
      dependencies: ['serviceA'],
    };

    container.register(serviceA);
    container.register(serviceB);

    assert.throws(
      () => container.getInitializationOrder(),
      (err: Error) => {
        assert.ok(err instanceof CircularDependencyError);
        assert.ok(err.message.includes('serviceA -> serviceB -> serviceA'));
        return true;
      },
    );
  });

  it('detects missing dependencies and throws MissingDependencyError', () => {
    const container = new ServiceContainer();

    const serviceA: IService = {
      name: 'serviceA',
      dependencies: ['nonExistentService'],
    };

    container.register(serviceA);

    assert.throws(
      () => container.getInitializationOrder(),
      (err: Error) => {
        assert.ok(err instanceof MissingDependencyError);
        assert.ok(err.message.includes('requires missing dependency "nonExistentService"'));
        return true;
      },
    );
  });

  it('rejects duplicate service registrations', () => {
    const container = new ServiceContainer();
    const service: IService = { name: 'dupService' };

    container.register(service);
    assert.throws(
      () => container.register(service),
      (err: Error) => {
        assert.ok(err instanceof ServiceRegistrationError);
        assert.ok(err.message.includes('already registered'));
        return true;
      },
    );
  });
});
