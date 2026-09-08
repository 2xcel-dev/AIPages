/**
 * Health-check module — probes a tool's endpointUrl before it is saved to
 * MongoDB, flagging live tools as "active" and unresponsive ones as "inactive".
 *
 * Uses a short HTTP GET/HEAD with a per-tool timeout.  "Alive" means any HTTP
 * response in the 2xx/3xx/4xx/5xx range within the timeout — we don't validate
 * content, status codes, or payload shape.  Network errors, DNS failures, and
 * timeouts are treated as "down".
 */

// ── single-URL probe ──────────────────────────────────────────────────────

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
export async function healthCheck(
  url: string,
  timeoutMs = 8000,
): Promise<boolean> {
  if (!url || !url.trim()) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Attempt HEAD first.
    try {
      const head = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          Accept: "*/*",
          "User-Agent": "AIPages-Crawler/0.1.0 (+https://aipages.dev)",
        },
      });
      clearTimeout(timer);
      return head.ok || (head.status >= 200 && head.status < 600);
    } catch (_headErr) {
      // HEAD may be rejected or unsupported — fall through to GET.
    }

    // GET fallback.
    const get = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "*/*",
        "User-Agent": "AIPages-Crawler/0.1.0 (+https://aipages.dev)",
      },
    });
    clearTimeout(timer);
    return get.ok || (get.status >= 200 && get.status < 600);
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      return false; // timeout — treat as down
    }
    // Network error, DNS failure, TLS failure — treat as down.
    return false;
  }
}

// ── batch probe (used by the crawler) ────────────────────────────────────

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
export async function healthCheckBatch(
  items: Array<{ url: string; namespace: string }>,
  timeoutMs = 8000,
): Promise<HealthCheckResult[]> {
  return Promise.all(
    items.map(async ({ url, namespace }) => {
      const start = performance.now();
      const alive = await healthCheck(url, timeoutMs);
      const latencyMs = Math.round(performance.now() - start);

      let errorCode: string | undefined;
      if (!alive && timeoutMs > 0) {
        try {
          await fetch(url, {
            method: "HEAD",
            signal: AbortSignal.timeout(500),
          });
        } catch (err: any) {
          errorCode = err?.name ?? err?.message?.slice(0, 60) ?? "unknown";
        }
      }

      return { url, namespace, alive, latencyMs, errorCode };
    }),
  );
}
