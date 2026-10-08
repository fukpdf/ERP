import type { IMetricsRecorder, MetricTags } from './interfaces.js';

export interface RuntimeMetricsSnapshot {
  readonly totalRequests: number;
  readonly activeRequests: number;
  readonly requestsByStatus: Readonly<Record<number, number>>;
  readonly requestsByMethod: Readonly<Record<string, number>>;
  readonly requestDurations: {
    readonly count: number;
    readonly sumMs: number;
    readonly minMs: number;
    readonly maxMs: number;
    readonly avgMs: number;
    readonly p95Ms: number;
  };
  readonly startupDurationMs?: number;
  readonly shutdownDurationMs?: number;
  readonly shutdownTimeouts: number;
}

export class RuntimeMetrics implements IMetricsRecorder {
  private totalRequests = 0;
  private activeRequests = 0;
  private readonly requestsByStatus = new Map<number, number>();
  private readonly requestsByMethod = new Map<string, number>();
  private readonly durations: number[] = [];
  private startupDuration?: number;
  private shutdownDuration?: number;
  private shutdownTimeouts = 0;

  incrementCounter(name: string, value = 1, _tags?: MetricTags): void {
    if (name === 'http_requests_total') {
      this.totalRequests += value;
    }
  }

  recordGauge(name: string, value: number, _tags?: MetricTags): void {
    if (name === 'http_active_requests') {
      this.activeRequests = value;
    }
  }

  recordHistogram(name: string, value: number, _tags?: MetricTags): void {
    if (name === 'http_request_duration_ms') {
      this.durations.push(value);
      // Bound the memory buffer to recent 1000 measurements
      if (this.durations.length > 1000) {
        this.durations.shift();
      }
    }
  }

  incrementActiveRequests(): void {
    this.activeRequests++;
  }

  decrementActiveRequests(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
  }

  recordRequest(method: string, statusCode: number, durationMs: number): void {
    this.totalRequests++;
    this.recordHistogram('http_request_duration_ms', durationMs);

    const normMethod = method.toUpperCase();
    this.requestsByMethod.set(normMethod, (this.requestsByMethod.get(normMethod) || 0) + 1);
    this.requestsByStatus.set(statusCode, (this.requestsByStatus.get(statusCode) || 0) + 1);
  }

  recordStartupDuration(ms: number): void {
    this.startupDuration = ms;
  }

  recordShutdownDuration(ms: number): void {
    this.shutdownDuration = ms;
  }

  recordShutdownTimeout(): void {
    this.shutdownTimeouts++;
  }

  getSnapshot(): RuntimeMetricsSnapshot {
    const sorted = [...this.durations].sort((a, b) => a - b);
    const count = sorted.length;
    const sumMs = sorted.reduce((acc, v) => acc + v, 0);
    const minMs = count > 0 ? sorted[0] : 0;
    const maxMs = count > 0 ? sorted[count - 1] : 0;
    const avgMs = count > 0 ? Math.round((sumMs / count) * 100) / 100 : 0;
    const p95Index = count > 0 ? Math.floor(count * 0.95) : 0;
    const p95Ms = count > 0 ? sorted[Math.min(p95Index, count - 1)] : 0;

    const statusObj: Record<number, number> = {};
    for (const [code, c] of this.requestsByStatus) {
      statusObj[code] = c;
    }

    const methodObj: Record<string, number> = {};
    for (const [m, c] of this.requestsByMethod) {
      methodObj[m] = c;
    }

    return {
      totalRequests: this.totalRequests,
      activeRequests: this.activeRequests,
      requestsByStatus: statusObj,
      requestsByMethod: methodObj,
      requestDurations: {
        count,
        sumMs: Math.round(sumMs * 100) / 100,
        minMs,
        maxMs,
        avgMs,
        p95Ms,
      },
      startupDurationMs: this.startupDuration,
      shutdownDurationMs: this.shutdownDuration,
      shutdownTimeouts: this.shutdownTimeouts,
    };
  }

  reset(): void {
    this.totalRequests = 0;
    this.activeRequests = 0;
    this.requestsByStatus.clear();
    this.requestsByMethod.clear();
    this.durations.length = 0;
    this.startupDuration = undefined;
    this.shutdownDuration = undefined;
    this.shutdownTimeouts = 0;
  }
}

export const runtimeMetrics = new RuntimeMetrics();
