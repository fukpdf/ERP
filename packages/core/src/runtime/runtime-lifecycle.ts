import { logger } from '../logging/logger.js';

export type RuntimeState = 'INITIALIZING' | 'READY' | 'TERMINATING' | 'TERMINATED';

export interface HealthStatus {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly state: RuntimeState;
  readonly uptimeSeconds: number;
  readonly checks: Record<string, boolean>;
  readonly timestamp: string;
}

export type ShutdownHandler = () => Promise<void> | void;
export type HealthCheck = () => Promise<boolean> | boolean;

export class RuntimeLifecycle {
  private state: RuntimeState = 'INITIALIZING';
  private readonly startTime = Date.now();
  private readonly shutdownHandlers: ShutdownHandler[] = [];
  private readonly healthChecks = new Map<string, HealthCheck>();

  constructor() {
    this.registerSignalHandlers();
  }

  private registerSignalHandlers(): void {
    const handleSignal = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}. Initiating graceful shutdown sequence...`);
      await this.shutdown();
    };

    process.once('SIGTERM', () => void handleSignal('SIGTERM'));
    process.once('SIGINT', () => void handleSignal('SIGINT'));
  }

  registerShutdownHandler(handler: ShutdownHandler): void {
    this.shutdownHandlers.push(handler);
  }

  registerHealthCheck(name: string, check: HealthCheck): void {
    this.healthChecks.set(name, check);
  }

  markReady(): void {
    this.state = 'READY';
    logger.info('Runtime platform marked READY and listening for operational traffic.');
  }

  isLive(): boolean {
    return this.state !== 'TERMINATED';
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

  async getHealthStatus(): Promise<HealthStatus> {
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
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      checks: checkResults,
      timestamp: new Date().toISOString(),
    };
  }

  async shutdown(timeoutMs = 15000): Promise<void> {
    if (this.state === 'TERMINATING' || this.state === 'TERMINATED') {
      return;
    }

    this.state = 'TERMINATING';
    logger.info('Executing registered shutdown handlers...');

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Graceful shutdown timeout exceeded')), timeoutMs);
    });

    const shutdownAction = async (): Promise<void> => {
      // Execute in reverse order of registration
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
