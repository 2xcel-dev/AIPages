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

interface CallerState {
  requests: number[]; // timestamps of requests
  errors: number[]; // timestamps of error responses
  level: number; // quarantine escalation
  until: number; // quarantine expiry (ms)
  reason?: string;
}

const BURST_MAX = Math.max(5, Number(process.env.ANOMALY_BURST_MAX ?? "120"));
const BURST_WINDOW_MS = Math.max(1000, Number(process.env.ANOMALY_BURST_WINDOW_MS ?? "60000"));
const ERROR_MAX = Math.max(3, Number(process.env.ANOMALY_ERROR_MAX ?? "20"));
const ERROR_WINDOW_MS = Math.max(1000, Number(process.env.ANOMALY_ERROR_WINDOW_MS ?? "60000"));
const QUARANTINE_BASE_MS = Math.max(1000, Number(process.env.ANOMALY_QUARANTINE_MS ?? "300000"));
const QUARANTINE_CAP_MS = 3600_000; // 1 hour max

const callers = new Map<string, CallerState>();

function state(key: string): CallerState {
  let s = callers.get(key);
  if (!s) {
    s = { requests: [], errors: [], level: 0, until: 0 };
    callers.set(key, s);
  }
  return s;
}

function prune(list: number[], windowMs: number, now: number): void {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < list.length && list[i] <= cutoff) i++;
  if (i > 0) list.splice(0, i);
}

/** Quarantine a caller for an escalating duration and return the new status. */
function quarantine(key: string, reason: string): QuarantineStatus {
  const s = state(key);
  const duration = Math.min(QUARANTINE_BASE_MS * Math.pow(2, s.level), QUARANTINE_CAP_MS);
  s.level += 1;
  s.until = Date.now() + duration;
  s.reason = reason;
  // Reset counters so a fresh start follows the quarantine.
  s.requests = [];
  s.errors = [];
  console.warn(`[anomaly] QUARANTINE "${key}" for ${Math.round(duration / 1000)}s — ${reason}`);
  return { quarantined: true, remainingSec: Math.round(duration / 1000), reason };
}

/**
 * Check whether a caller is currently quarantined (and clean up expired ones).
 */
export function quarantineStatus(key: string): QuarantineStatus {
  const s = callers.get(key);
  if (!s) return { quarantined: false };
  const now = Date.now();
  if (s.until <= now) {
    callers.delete(key);
    return { quarantined: false };
  }
  return { quarantined: true, remainingSec: Math.ceil((s.until - now) / 1000), reason: s.reason };
}

/**
 * Record an incoming request for a caller. Triggers a burst quarantine if the
 * request rate exceeds the burst threshold.
 */
export function recordRequest(key: string): QuarantineStatus {
  const s = state(key);
  const now = Date.now();
  prune(s.requests, BURST_WINDOW_MS, now);
  s.requests.push(now);
  if (s.requests.length >= BURST_MAX) {
    return quarantine(key, `burst: ${s.requests.length} requests in ${BURST_WINDOW_MS}ms`);
  }
  return { quarantined: false };
}

/**
 * Record an error outcome (402 / 4xx / 5xx) for a caller. Triggers an
 * error-storm quarantine if the error rate exceeds the threshold.
 */
export function recordError(key: string): QuarantineStatus {
  const s = state(key);
  const now = Date.now();
  prune(s.errors, ERROR_WINDOW_MS, now);
  s.errors.push(now);
  if (s.errors.length >= ERROR_MAX) {
    return quarantine(key, `error storm: ${s.errors.length} errors in ${ERROR_WINDOW_MS}ms`);
  }
  return { quarantined: false };
}

/** Periodic cleanup of expired quarantines and idle callers. */
export function startAnomalyCleanup(intervalMs = 60_000): () => void {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, s] of callers) {
      const idle = now - (s.requests[s.requests.length - 1] ?? 0) > 10 * 60_000;
      if (idle || (s.until > 0 && s.until <= now)) callers.delete(key);
    }
  }, intervalMs);
  return () => clearInterval(timer);
}
