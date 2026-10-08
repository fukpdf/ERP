import { logger } from '../logging/logger.js';

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

export class RuntimeLifecycle {
  private state: RuntimeState = 'INITIALIZING';
  private readonly startTime = Date.now();
  private readonly shutdownHandlers: ShutdownHandler[] = [];
  private readonly healthChecks = new Map<string, HealthCheck>();
  private failureReason?: Error;
  private signalRegistered = false;

  constructor(registerSignals = false) {
    if (registerSignals) {
      this.registerSignalHandlers();
    }
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
    if (this.state === 'FAILED' || this.state === 'TERMINATING' || this.state === 'TERMINATED') {
      throw new Error(`Cannot mark runtime READY from state: ${this.state}`);
    }
    this.state = 'READY';
    logger.info('Runtime platform marked READY and listening for operational traffic.');
  }

  markFailed(error: Error): void {
    this.state = 'FAILED';
    this.failureReason = error;
    logger.error('Runtime platform entered FAILED state:', error);
  }

  isLive(): boolean {
    return this.state !== 'TERMINATED' && this.state !== 'FAILED';
  }

  isStarting(): boolean {
    return this.state === 'INITIALIZING';
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
    if (this.state === 'DRAINING' || this.state === 'TERMINATING' || this.state === 'TERMINATED') {
      return;
    }

    this.state = 'DRAINING';
    logger.info('Runtime entering DRAINING state: stopping ingress of new work...');

    this.state = 'TERMINATING';
    logger.info('Executing registered shutdown handlers...');

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Graceful shutdown timeout exceeded')), timeoutMs);
    });

    const shutdownAction = async (): Promise<void> => {
      // Execute in reverse order of registration (LIFO)
      for (const handler of [...this.shutdownHandlers].reverse()) {
        try {
          await handler();
        } catch (err) {
          logger.error('Error in shutdown handler:', err as Error);
        }
      }
    };

    try {
      await Promise.race([shutdownAction(), timeoutPromise]);
      logger.info('All shutdown handlers completed cleanly.');
    } catch (err) {
      logger.warn('Forced shutdown due to timeout or unhandled handler error:', { error: String(err) });
    } finally {
      if (timer) clearTimeout(timer);
      this.state = 'TERMINATED';
    }
  }
}

export const runtime = new RuntimeLifecycle();
