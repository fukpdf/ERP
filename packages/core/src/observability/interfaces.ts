/**
 * Provider-Agnostic Observability Interfaces.
 * Shields the enterprise platform from vendor lock-in (Prometheus, OpenTelemetry, Datadog).
 */

export interface MetricTags {
  readonly [key: string]: string | number | boolean;
}

export interface IMetricsRecorder {
  incrementCounter(name: string, value?: number, tags?: MetricTags): void;
  recordGauge(name: string, value: number, tags?: MetricTags): void;
  recordHistogram(name: string, value: number, tags?: MetricTags): void;
}

export interface ISpan {
  readonly traceId: string;
  readonly spanId: string;
  setTag(key: string, value: string): this;
  end(): void;
}

export interface ITracer {
  startSpan(name: string, tags?: MetricTags): ISpan;
}

export interface ITelemetryProvider {
  readonly metrics: IMetricsRecorder;
  readonly tracer: ITracer;
}
