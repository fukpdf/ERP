import { logger } from '../logging/logger.js';
import { runtimeMetrics } from '../observability/metrics.js';
import type { ServiceContainer } from './container.js';

export type RuntimeState =
  | 'INITIALIZING'
  | 'READY'
  | 'DRAINING'
  | 'TERMINATING'
  | 'TERMINATED'
  | 'FAILED';

export interface HealthCheckResult {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly state: RuntimeState;
  readonly uptimeSeconds: number;
  readonly checks: Record<string, boolean>;
  readonly timestamp: string;
  readonly version?: string;
}

export type ShutdownHandler = () => Promise<void> | void;
export type HealthCheck = () => Promise<boolean> | boolean;

export class IllegalStateTransitionError extends Error {
  constructor(from: RuntimeState, to: RuntimeState) {
    super(`Illegal runtime lifecycle state transition from "${from}" to "${to}".`);
    this.name = 'IllegalStateTransitionError';
  }
}

export class RuntimeLifecycle {
  private state: RuntimeState = 'INITIALIZING';
  private readonly startTime = Date.now();
  private readonly shutdownHandlers: ShutdownHandler[] = [];
  private readonly healthChecks = new Map<string, HealthCheck>();
  private failureReason?: Error;
  private signalRegistered = false;
  private attachedContainer?: ServiceContainer;
  private shutdownPromise?: Promise<void>;

  constructor(registerSignals = false) {
    if (registerSignals) {
      this.registerSignalHandlers();
    }
  }

  attachContainer(container: ServiceContainer): void {
    this.attachedContainer = container;
  }

  getContainer(): ServiceContainer | undefined {
    return this.attachedContainer;
  }

  private transitionTo(newState: RuntimeState): void {
    const current = this.state;
    if (current === newState) return;

    // Validate legal transitions:
    // INITIALIZING -> READY, FAILED
    // READY -> DRAINING, FAILED
    // DRAINING -> TERMINATING
    // TERMINATING -> TERMINATED
    // FAILED -> TERMINATED
    const legalTransitions: Record<RuntimeState, RuntimeState[]> = {
      INITIALIZING: ['READY', 'FAILED', 'TERMINATING'],
      READY: ['DRAINING', 'FAILED'],
      DRAINING: ['TERMINATING', 'FAILED'],
      TERMINATING: ['TERMINATED'],
      FAILED: ['TERMINATED'],
      TERMINATED: [],
    };

    const allowed = legalTransitions[current] || [];
    if (!allowed.includes(newState)) {
      throw new IllegalStateTransitionError(current, newState);
    }

    this.state = newState;
  }

  registerSignalHandlers(): void {
    if (this.signalRegistered) return;
    this.signalRegistered = true;

    const handleSignal = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}. Initiating graceful shutdown sequence...`);
      await this.shutdown();
    };

    process.once('SIGTERM', () => void handleSignal('SIGTERM'));
    process.once('SIGINT', () => void handleSignal('SIGINT'));
  }

  getState(): RuntimeState {
    return this.state;
  }

  getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getFailureReason(): Error | undefined {
    return this.failureReason;
  }

  registerShutdownHandler(handler: ShutdownHandler): void {
    this.shutdownHandlers.push(handler);
  }

  registerHealthCheck(name: string, check: HealthCheck): void {
    this.healthChecks.set(name, check);
  }

  markReady(): void {
    this.transitionTo('READY');
    logger.info('Runtime platform marked READY and listening for operational traffic.');
  }

  markFailed(error: Error): void {
    this.transitionTo('FAILED');
    if (!this.failureReason) {
      this.failureReason = error;
    }
    logger.error('Runtime platform entered FAILED state:', error);
  }

  isLive(): boolean {
    return this.state !== 'TERMINATED' && this.state !== 'FAILED';
  }

  isStarting(): boolean {
    return this.state === 'INITIALIZING';
  }

  isIngressOpen(): boolean {
    return this.state === 'READY';
  }

  isDraining(): boolean {
    return this.state === 'DRAINING';
  }

  async isReady(): Promise<boolean> {
    if (this.state !== 'READY') {
      return false;
    }

    for (const [name, check] of this.healthChecks) {
      try {
        const passed = await check();
        if (!passed) {
          logger.warn(`Health check "${name}" failed during readiness probe.`);
          return false;
        }
      } catch (err) {
        logger.error(`Health check "${name}" threw error during readiness probe:`, err as Error);
        return false;
      }
    }
    return true;
  }

  async getHealthStatus(version?: string): Promise<HealthCheckResult> {
    const checkResults: Record<string, boolean> = {};
    let allPassed = this.state === 'READY';

    for (const [name, check] of this.healthChecks) {
      try {
        const passed = await check();
        checkResults[name] = passed;
        if (!passed) allPassed = false;
      } catch {
        checkResults[name] = false;
        allPassed = false;
      }
    }

    return {
      status: allPassed ? 'ok' : this.state === 'READY' ? 'degraded' : 'down',
      state: this.state,
      uptimeSeconds: this.getUptimeSeconds(),
      checks: checkResults,
      timestamp: new Date().toISOString(),
      version,
    };
  }

  async shutdown(timeoutMs = 15000): Promise<void> {
    if (this.state === 'TERMINATED') {
      return;
    }

    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    const shutdownStart = Date.now();

    this.shutdownPromise = (async () => {
      // Step 1: Ingress shutoff (DRAINING) - only valid when transitioning from READY
      if (this.state === 'READY') {
        this.transitionTo('DRAINING');
        logger.info('Runtime entered DRAINING state: operational ingress shut off.');
      }

      // Step 2: Termination preparation - skip if already FAILED or TERMINATING
      if (this.state !== 'FAILED' && this.state !== 'TERMINATING') {
        this.transitionTo('TERMINATING');
        logger.info('Runtime entering TERMINATING state: executing shutdown handlers and stopping container services...');
      }

      let timer: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<void>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Graceful shutdown timeout exceeded')), timeoutMs);
      });

      const shutdownAction = async (): Promise<void> => {
        // Execute registered shutdown handlers in reverse order (LIFO)
        for (const handler of [...this.shutdownHandlers].reverse()) {
          try {
            await handler();
          } catch (err) {
            logger.error('Error in shutdown handler:', err as Error);
          }
        }

        // Stop attached service container in reverse topological order
        if (this.attachedContainer) {
          try {
            await this.attachedContainer.stopAll();
          } catch (err) {
            logger.error('Error stopping attached service container:', err as Error);
          }
        }
      };

      try {
        await Promise.race([shutdownAction(), timeoutPromise]);
        logger.info('All shutdown handlers and container services completed cleanly.');
      } catch (err) {
        logger.warn('Forced shutdown due to timeout or unhandled handler error:', { error: String(err) });
      } finally {
        if (timer) clearTimeout(timer);
        const duration = Date.now() - shutdownStart;
        runtimeMetrics.recordShutdownDuration(duration);
        this.transitionTo('TERMINATED');
      }
    })();

    return this.shutdownPromise;
  }
}

export const runtime = new RuntimeLifecycle();
