/**
 * Focused Health-Check Job: aipages-outreach worker area.
 *
 * Inspects eligible tool endpoints with a bounded timeout and updates their
 * health results deterministically in MongoDB Atlas (or in-memory store in dev/test).
 *
 * Security & privacy:
 * - Uses HEAD probe with GET fallback.
 * - Cancels and discards response bodies immediately (no body stored).
 * - Strips any query strings / tokens / credentials (no secrets stored).
 * - Records concise, sanitized failure reasons (e.g. "HTTP 502 Bad Gateway", "Request timed out").
 */
import { createStore, type ToolStore } from "../src/db.js";
import type { Tool, HealthStatus } from "../src/types.js";

export const DEFAULT_HEALTH_TIMEOUT_MS = 5000;

export interface HealthCheckOptions {
  /** Per-endpoint request timeout in milliseconds (default: 5000ms). */
  timeoutMs?: number;
  /** Custom store instance (defaults to createStore()). */
  store?: ToolStore;
  /** Max concurrent requests (default: 5). */
  concurrency?: number;
}

export interface ProbeResult {
  healthy: boolean;
  statusCode?: number;
  latencyMs: number;
  failureReason?: string | null;
}

export interface HealthCheckItemResult {
  namespace: string;
  endpointUrl: string;
  healthStatus: HealthStatus;
  lastChecked: Date;
  failureReason?: string | null;
  latencyMs: number;
}

export interface HealthCheckJobSummary {
  totalEligible: number;
  active: number;
  inactive: number;
  durationMs: number;
  results: HealthCheckItemResult[];
}

/**
 * Filter for eligible tool endpoints:
 * Must have a valid HTTP or HTTPS endpointUrl, and not be marked rejected.
 */
export function isEligibleTool(tool: Tool): boolean {
  if (!tool.endpointUrl || typeof tool.endpointUrl !== "string") {
    return false;
  }
  const url = tool.endpointUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }
  if (tool.status === "rejected") {
    return false;
  }
  return true;
}

/**
 * Sanitize error message to prevent accidental leakage of secrets,
 * bearer tokens, or sensitive URL parameters.
 */
export function sanitizeFailureReason(rawMessage: string): string {
  if (!rawMessage) return "Unknown probe failure";

  // Strip query parameters (?key=..., &token=...)
  let sanitized = rawMessage.replace(/[?&][^ \r\n\t"'>]+/g, "");

  // Strip hex tokens or bearer-like strings (32+ hex chars or JWT-like structures)
  sanitized = sanitized.replace(/[a-fA-F0-9]{32,}/g, "[REDACTED]");
  sanitized = sanitized.replace(/ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+/g, "[REDACTED_TOKEN]");

  // Truncate to a concise length (<= 80 chars)
  if (sanitized.length > 80) {
    sanitized = sanitized.slice(0, 77) + "...";
  }

  return sanitized.trim();
}

/**
 * Probe a single HTTP/HTTPS endpoint with bounded timeout.
 * Rejects 5xx responses or network errors. Treats 2xx/3xx/4xx as server alive.
 * Never stores response bodies or secrets.
 */
export async function probeEndpoint(
  endpointUrl: string,
  timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS,
): Promise<ProbeResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const cleanHeaders = {
    Accept: "*/*",
    "User-Agent": "AIPages-HealthWorker/1.0 (+https://aipages.tech)",
  };

  try {
    let res: Response | null = null;

    // 1. Try cheap HEAD first (no payload transfer)
    try {
      res = await fetch(endpointUrl, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: cleanHeaders,
      });
      // Always immediately cancel/discard any body stream
      if (res.body) {
        await res.body.cancel().catch(() => {});
      }
    } catch (_headErr: any) {
      // If aborted by timeout during HEAD, rethrow so outer handler catches timeout
      if (controller.signal.aborted) {
        throw _headErr;
      }
      // HEAD may be rejected by servers that require GET/POST
      res = null;
    }

    // 2. Fall back to GET if HEAD failed or was unsupported
    if (!res) {
      res = await fetch(endpointUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: cleanHeaders,
      });
      // Always immediately cancel/discard body stream (never read .text() / .json())
      if (res.body) {
        await res.body.cancel().catch(() => {});
      }
    }

    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);

    // Any HTTP status < 500 means server is reachable (including 401/402/404)
    if (res.status < 500) {
      return {
        healthy: true,
        statusCode: res.status,
        latencyMs,
        failureReason: null,
      };
    }

    // 5xx Server Error
    const statusText = res.statusText ? ` ${res.statusText}` : "";
    return {
      healthy: false,
      statusCode: res.status,
      latencyMs,
      failureReason: `HTTP ${res.status}${statusText}`.trim(),
    };
  } catch (err: any) {
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);

    let reason: string;
    if (err?.name === "AbortError" || err?.name === "TimeoutError" || controller.signal.aborted) {
      reason = `Request timed out after ${timeoutMs}ms`;
    } else if (err?.code === "ECONNREFUSED") {
      reason = "Connection refused (ECONNREFUSED)";
    } else if (err?.code === "ENOTFOUND") {
      reason = "DNS resolution failed (ENOTFOUND)";
    } else if (err?.code === "ECONNRESET") {
      reason = "Connection reset by peer (ECONNRESET)";
    } else if (err?.code?.includes?.("CERT") || err?.message?.toLowerCase().includes("certificate")) {
      reason = "TLS/SSL certificate validation failed";
    } else {
      reason = sanitizeFailureReason(err?.message ?? "Network error");
    }

    return {
      healthy: false,
      latencyMs,
      failureReason: reason,
    };
  }
}

/**
 * Execute the focused health-check job:
 * 1. Queries store for all eligible tools with endpoints.
 * 2. Fetches each endpoint with bounded timeout.
 * 3. Records healthStatus, lastChecked, and concise failureReason deterministically.
 */
export async function runHealthCheckJob(
  options: HealthCheckOptions = {},
): Promise<HealthCheckJobSummary> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  const store = options.store ?? (await createStore());
  const concurrency = Math.max(1, options.concurrency ?? 5);

  const startJob = performance.now();

  // 1. Fetch eligible tools from store
  const allTools = await store.list({ hasEndpoint: true });
  const eligibleTools = allTools.filter(isEligibleTool);

  // Deterministic processing order by namespace
  eligibleTools.sort((a, b) => a.namespace.localeCompare(b.namespace));

  const results: HealthCheckItemResult[] = [];
  let activeCount = 0;
  let inactiveCount = 0;

  // 2. Process with concurrency pool
  for (let i = 0; i < eligibleTools.length; i += concurrency) {
    const chunk = eligibleTools.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (tool) => {
        const checkTime = new Date();
        const probe = await probeEndpoint(tool.endpointUrl!, timeoutMs);
        const healthStatus: HealthStatus = probe.healthy ? "active" : "inactive";

        // 3. Deterministically persist health check results
        await store.updateHealth(tool.namespace, {
          healthStatus,
          lastChecked: checkTime,
          lastCheckedAt: checkTime,
          failureReason: probe.failureReason ?? null,
        });

        return {
          namespace: tool.namespace,
          endpointUrl: tool.endpointUrl!,
          healthStatus,
          lastChecked: checkTime,
          failureReason: probe.failureReason ?? null,
          latencyMs: probe.latencyMs,
        };
      }),
    );

    for (const r of chunkResults) {
      results.push(r);
      if (r.healthStatus === "active") {
        activeCount++;
      } else {
        inactiveCount++;
      }
    }
  }

  const durationMs = Math.round(performance.now() - startJob);

  return {
    totalEligible: eligibleTools.length,
    active: activeCount,
    inactive: inactiveCount,
    durationMs,
    results,
  };
}
