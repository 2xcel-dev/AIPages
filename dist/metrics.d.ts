/**
 * Prometheus & Observability Metrics Module
 *
 * Provides real-time Prometheus line-formatted metrics for autonomous agent
 * invocations, latency histograms, error rates, fees collected, and system health.
 *
 * Endpoint: GET /metrics (Standard Prometheus text/plain exposition format)
 */
declare class MetricsRegistry {
    private startTime;
    private invocations;
    private fees;
    private httpRequests;
    private latencies;
    private errors;
    private aiCrawlers;
    static detectAiCrawler(userAgent?: string | null): string | null;
    recordHttpRequest(method: string, path: string, statusCode: number, userAgent?: string | null): void;
    recordInvocation(namespace: string, status: string, latencyMs: number, feeUsdc: number): void;
    recordError(errorType: string): void;
    formatPrometheus(toolsTotal?: number): string;
}
export declare const metrics: MetricsRegistry;
export {};
//# sourceMappingURL=metrics.d.ts.map