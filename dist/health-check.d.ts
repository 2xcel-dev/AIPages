/**
 * Health-check module — probes a tool's endpointUrl before it is saved to
 * MongoDB, flagging live tools as "active" and unresponsive ones as "inactive".
 *
 * Uses a short HTTP GET/HEAD with a per-tool timeout.  "Alive" means any HTTP
 * response in the 2xx/3xx/4xx/5xx range within the timeout — we don't validate
 * content, status codes, or payload shape.  Network errors, DNS failures, and
 * timeouts are treated as "down".
 */
/**
 * Check whether `url` is reachable.
 *
 * Strategy:
 *   1. Try HEAD first (cheap, no body).
 *   2. Fall back to GET if HEAD is rejected (405/501) or throws.
 *
 * Returns true for any HTTP response received within `timeoutMs`.
 * Returns false on network error, DNS failure, TLS failure, or timeout.
 */
export declare function healthCheck(url: string, timeoutMs?: number): Promise<boolean>;
export interface HealthCheckResult {
    /** The URL that was probed. */
    url: string;
    /** Whether the endpoint responded. */
    alive: boolean;
    /** Round-trip latency in milliseconds. */
    latencyMs: number;
    /** Namespace of the tool being checked (for logging). */
    namespace: string;
    /** Best-effort error code if the probe failed. */
    errorCode?: string;
}
/**
 * Probe several URLs in parallel.
 *
 * Each URL gets its own timeout, so one slow endpoint doesn't block the
 * whole batch.  Results are returned in the same order as the input.
 */
export declare function healthCheckBatch(items: Array<{
    url: string;
    namespace: string;
}>, timeoutMs?: number): Promise<HealthCheckResult[]>;
//# sourceMappingURL=health-check.d.ts.map