import { RuntimeLifecycle, RuntimeState } from '../runtime/lifecycle.js';

export interface ComponentHealthCheck {
  readonly name: string;
  readonly isCritical?: boolean;
  check(): Promise<boolean> | boolean;
}

export interface HealthResponse {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly state: RuntimeState;
  readonly uptimeSeconds: number;
  readonly checks: Record<string, boolean>;
  readonly timestamp: string;
  readonly version?: string;
}

export class HealthRegistry {
  private readonly checks = new Map<string, ComponentHealthCheck>();

  register(check: ComponentHealthCheck): void {
    this.checks.set(check.name, check);
  }

  unregister(name: string): boolean {
    return this.checks.delete(name);
  }

  async runAll(): Promise<{ allPassed: boolean; criticalPassed: boolean; results: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    let allPassed = true;
    let criticalPassed = true;

    for (const [name, check] of this.checks) {
      try {
        const passed = await check.check();
        results[name] = passed;
        if (!passed) {
          allPassed = false;
          if (check.isCritical !== false) {
            criticalPassed = false;
          }
        }
      } catch {
        results[name] = false;
        allPassed = false;
        if (check.isCritical !== false) {
          criticalPassed = false;
        }
      }
    }

    return { allPassed, criticalPassed, results };
  }
}

export const defaultHealthRegistry = new HealthRegistry();

/**
 * Handles /health/live requests.
 * Evaluates process vitality. Returns 200 if alive, 503 if failed or terminated.
 */
export function handleLiveness(runtime: RuntimeLifecycle): {
  statusCode: number;
  body: { status: 'ok' | 'down'; state: RuntimeState; timestamp: string };
} {
  const isLive = runtime.isLive();
  return {
    statusCode: isLive ? 200 : 503,
    body: {
      status: isLive ? 'ok' : 'down',
      state: runtime.getState(),
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Handles /health/ready requests.
 * Evaluates whether this instance can safely receive operational traffic.
 */
export async function handleReadiness(
  runtime: RuntimeLifecycle,
  registry: HealthRegistry = defaultHealthRegistry,
  version?: string,
): Promise<{
  statusCode: number;
  body: HealthResponse;
}> {
  const state = runtime.getState();
  const uptimeSeconds = runtime.getUptimeSeconds();
  const timestamp = new Date().toISOString();

  // If not in READY state, fail readiness immediately
  if (state !== 'READY') {
    return {
      statusCode: 503,
      body: {
        status: 'down',
        state,
        uptimeSeconds,
        checks: {},
        timestamp,
        version,
      },
    };
  }

  const { criticalPassed, results } = await registry.runAll();
  const isReady = criticalPassed;

  return {
    statusCode: isReady ? 200 : 503,
    body: {
      status: isReady ? 'ok' : 'degraded',
      state,
      uptimeSeconds,
      checks: results,
      timestamp,
      version,
    },
  };
}

/**
 * Handles /health/startup requests.
 * Evaluates whether initial startup sequence has completed.
 */
export function handleStartup(
  runtime: RuntimeLifecycle,
  version?: string,
): {
  statusCode: number;
  body: { status: 'ok' | 'starting' | 'failed'; state: RuntimeState; timestamp: string; version?: string };
} {
  const state = runtime.getState();
  const timestamp = new Date().toISOString();

  if (state === 'READY') {
    return {
      statusCode: 200,
      body: { status: 'ok', state, timestamp, version },
    };
  }

  if (state === 'FAILED') {
    return {
      statusCode: 503,
      body: { status: 'failed', state, timestamp, version },
    };
  }

  return {
    statusCode: 503,
    body: { status: 'starting', state, timestamp, version },
  };
}
