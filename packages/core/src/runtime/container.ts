import { logger } from '../logging/logger.js';

export interface IService {
  readonly name: string;
  readonly dependencies?: readonly string[];
  initialize?(): Promise<void> | void;
  shutdown?(): Promise<void> | void;
}

export class ServiceRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceRegistrationError';
  }
}

export class CircularDependencyError extends Error {
  constructor(cycle: string[]) {
    super(`Circular service dependency detected: ${cycle.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class MissingDependencyError extends Error {
  constructor(service: string, dependency: string) {
    super(`Service "${service}" requires missing dependency "${dependency}"`);
    this.name = 'MissingDependencyError';
  }
}

export class ServiceContainer {
  private readonly services = new Map<string, IService>();
  private readonly initializedServices: string[] = [];
  private isStarted = false;

  register<T extends IService>(service: T): this {
    if (this.isStarted) {
      throw new ServiceRegistrationError(
        `Cannot register service "${service.name}" after container has already started.`,
      );
    }
    if (this.services.has(service.name)) {
      throw new ServiceRegistrationError(
        `Service with name "${service.name}" is already registered.`,
      );
    }
    this.services.set(service.name, service);
    return this;
  }

  get<T extends IService>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new ServiceRegistrationError(`Service "${name}" not found in container.`);
    }
    return service as T;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Computes deterministic topological order for service initialization.
   * Throws MissingDependencyError or CircularDependencyError.
   */
  getInitializationOrder(): string[] {
    const order: string[] = [];
    const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
    const pathStack: string[] = [];

    for (const name of this.services.keys()) {
      visited.set(name, 0);
    }

    const visit = (current: string) => {
      visited.set(current, 1);
      pathStack.push(current);

      const service = this.services.get(current);
      if (!service) {
        throw new ServiceRegistrationError(`Unexpected missing service "${current}"`);
      }

      const deps = service.dependencies || [];
      for (const dep of deps) {
        if (!this.services.has(dep)) {
          throw new MissingDependencyError(current, dep);
        }

        const state = visited.get(dep) ?? 0;
        if (state === 1) {
          const cycleStartIndex = pathStack.indexOf(dep);
          const cycle = [...pathStack.slice(cycleStartIndex), dep];
          throw new CircularDependencyError(cycle);
        } else if (state === 0) {
          visit(dep);
        }
      }

      pathStack.pop();
      visited.set(current, 2);
      order.push(current);
    };

    for (const name of this.services.keys()) {
      if ((visited.get(name) ?? 0) === 0) {
        visit(name);
      }
    }

    return order;
  }

  async startAll(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    const startupOrder = this.getInitializationOrder();
    logger.info(`Starting container services in topological order: [${startupOrder.join(', ')}]`);

    for (const name of startupOrder) {
      const service = this.services.get(name)!;
      if (typeof service.initialize === 'function') {
        try {
          logger.debug(`Initializing service "${name}"...`);
          await service.initialize();
          this.initializedServices.push(name);
        } catch (err) {
          logger.error(`Failed to initialize service "${name}":`, err as Error);
          // Rollback any previously initialized services in reverse order
          await this.stopAll();
          throw err;
        }
      } else {
        this.initializedServices.push(name);
      }
    }

    logger.info(`All ${this.initializedServices.length} services initialized successfully.`);
  }

  async stopAll(): Promise<void> {
    const shutdownOrder = [...this.initializedServices].reverse();
    logger.info(`Stopping container services in reverse order: [${shutdownOrder.join(', ')}]`);

    for (const name of shutdownOrder) {
      const service = this.services.get(name);
      if (service && typeof service.shutdown === 'function') {
        try {
          logger.debug(`Shutting down service "${name}"...`);
          await service.shutdown();
        } catch (err) {
          logger.error(`Error during shutdown of service "${name}":`, err as Error);
        }
      }
    }

    this.initializedServices.length = 0;
    this.isStarted = false;
    logger.info('All container services stopped.');
  }
}
