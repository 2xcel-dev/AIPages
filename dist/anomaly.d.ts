/**
 * Behavioral anomaly detection & temporary quarantine — an extension of the
 * rate limiter that watches for abuse *patterns*, not just per-window volume.
 *
 * Two triggers automatically quarantine a caller (by agent ID):
 *
 *   1. Burst — a caller's request rate spikes past ANOMALY_BURST_MAX within
 *      ANOMALY_BURST_WINDOW_MS (a scraping loop).
 *   2. Error storm — a caller racks up ANOMALY_ERROR_MAX error responses
 *      (402 / 4xx / 5xx) within ANOMALY_ERROR_WINDOW_MS (a broken crawler or
 *      a caller hammering paid tools without payment).
 *
 * Quarantines expire after ANOMALY_QUARANTINE_MS and escalate ×2 per repeat
 * offense (capped), so a repeat offender is sidelined progressively longer.
 *
 * Single-instance in-memory state (matches rate-limit.ts). For multi-instance
 * production, back this with Redis.
 */
export interface QuarantineStatus {
    quarantined: boolean;
    remainingSec?: number;
    reason?: string;
}
/**
 * Check whether a caller is currently quarantined (and clean up expired ones).
 */
export declare function quarantineStatus(key: string): QuarantineStatus;
/**
 * Record an incoming request for a caller. Triggers a burst quarantine if the
 * request rate exceeds the burst threshold.
 */
export declare function recordRequest(key: string): QuarantineStatus;
/**
 * Record an error outcome (402 / 4xx / 5xx) for a caller. Triggers an
 * error-storm quarantine if the error rate exceeds the threshold.
 */
export declare function recordError(key: string): QuarantineStatus;
/** Periodic cleanup of expired quarantines and idle callers. */
export declare function startAnomalyCleanup(intervalMs?: number): () => void;
//# sourceMappingURL=anomaly.d.ts.map