import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped Execution Context carried across asynchronous call stacks.
 * Guarantees tenant isolation, audit actor identification, and distributed trace correlation.
 */
export interface ExecutionContextData {
  readonly tenantId?: string;
  readonly legalEntityId?: string;
  readonly userId?: string;
  readonly userRoles?: readonly string[];
  readonly correlationId: string;
  readonly traceId?: string;
  readonly locale?: string;
  readonly ipAddress?: string;
}

export type RequestContext = ExecutionContextData;

export class ExecutionContext {
  private static readonly storage = new AsyncLocalStorage<ExecutionContextData>();

  /**
   * Retrieves the current active execution context, or undefined if outside a context.
   */
  static current(): ExecutionContextData | undefined {
    return this.storage.getStore();
  }

  /**
   * Retrieves the current correlation ID, generating a fallback UUID if none active.
   */
  static getCorrelationId(): string {
    const store = this.storage.getStore();
    return store?.correlationId ?? 'unknown-correlation-id';
  }

  /**
   * Retrieves the current tenant ID or throws an error if required tenant context is absent.
   */
  static requireTenantId(): string {
    const store = this.storage.getStore();
    if (!store?.tenantId) {
      throw new Error('Tenant context is required but was not provided in active ExecutionContext.');
    }
    return store.tenantId;
  }

  /**
   * Executes an asynchronous function within a bound execution context.
   */
  static run<T>(context: ExecutionContextData, fn: () => T): T {
    return this.storage.run(context, fn);
  }
}
