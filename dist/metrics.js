/**
 * Prometheus & Observability Metrics Module
 *
 * Provides real-time Prometheus line-formatted metrics for autonomous agent
 * invocations, latency histograms, error rates, fees collected, and system health.
 *
 * Endpoint: GET /metrics (Standard Prometheus text/plain exposition format)
 */
const HISTOGRAM_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]; // milliseconds
class MetricsRegistry {
    startTime = Date.now();
    // Invocations: namespace -> status -> count
    invocations = new Map();
    // Fees: namespace -> total USDC
    fees = new Map();
    // HTTP requests: method:path:status -> count
    httpRequests = new Map();
    // Latency histograms: namespace -> { buckets: LatencyBucket[], sum: number, count: number }
    latencies = new Map();
    // Errors: type -> count
    errors = new Map();
    // AI Crawler visits: bot|path|status -> count
    aiCrawlers = new Map();
    static detectAiCrawler(userAgent) {
        if (!userAgent)
            return null;
        const match = userAgent.match(/(OAI-SearchBot|ChatGPT-User|GPTBot|ClaudeBot|Claude-Web|PerplexityBot|Google-Extended|Applebot-Extended|CCBot|Bytespider|Googlebot|Bingbot|DuckDuckBot|YandexBot)/i);
        return match ? match[1] : null;
    }
    recordHttpRequest(method, path, statusCode, userAgent) {
        const normPath = path.startsWith("/tool/") ? "/tool/:slug"
            : path.startsWith("/tools/") ? "/tools/:slug"
                : path.startsWith("/api/tools/") ? "/api/tools/:param"
                    : path.startsWith("/api/invoke/") ? "/api/invoke/:namespace"
                        : path;
        const key = `${method.toUpperCase()}|${normPath}|${statusCode}`;
        this.httpRequests.set(key, (this.httpRequests.get(key) || 0) + 1);
        const bot = MetricsRegistry.detectAiCrawler(userAgent);
        if (bot) {
            const botKey = `${bot}|${normPath}|${statusCode}`;
            this.aiCrawlers.set(botKey, (this.aiCrawlers.get(botKey) || 0) + 1);
        }
    }
    recordInvocation(namespace, status, latencyMs, feeUsdc) {
        // 1. Invocation Counter
        let nsMap = this.invocations.get(namespace);
        if (!nsMap) {
            nsMap = new Map();
            this.invocations.set(namespace, nsMap);
        }
        nsMap.set(status, (nsMap.get(status) || 0) + 1);
        // 2. Fee Counter
        if (feeUsdc > 0) {
            this.fees.set(namespace, (this.fees.get(namespace) || 0) + feeUsdc);
        }
        // 3. Latency Histogram
        let lat = this.latencies.get(namespace);
        if (!lat) {
            lat = {
                buckets: HISTOGRAM_BUCKETS.map((le) => ({ le, count: 0 })),
                sum: 0,
                count: 0,
            };
            this.latencies.set(namespace, lat);
        }
        lat.sum += latencyMs;
        lat.count += 1;
        for (const b of lat.buckets) {
            if (latencyMs <= b.le) {
                b.count += 1;
            }
        }
    }
    recordError(errorType) {
        this.errors.set(errorType, (this.errors.get(errorType) || 0) + 1);
    }
    formatPrometheus(toolsTotal = 0) {
        const lines = [];
        const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
        const mem = process.memoryUsage();
        // ── System & Process Gauges ──────────────────────────────────────────
        lines.push("# HELP aipages_uptime_seconds Total runtime of the AIPages gateway in seconds.");
        lines.push("# TYPE aipages_uptime_seconds gauge");
        lines.push(`aipages_uptime_seconds ${uptimeSec}`);
        lines.push("# HELP aipages_memory_heap_bytes Node.js heap memory allocated in bytes.");
        lines.push("# TYPE aipages_memory_heap_bytes gauge");
        lines.push(`aipages_memory_heap_bytes ${mem.heapUsed}`);
        lines.push("# HELP aipages_memory_rss_bytes Node.js resident set size in bytes.");
        lines.push("# TYPE aipages_memory_rss_bytes gauge");
        lines.push(`aipages_memory_rss_bytes ${mem.rss}`);
        lines.push("# HELP aipages_tools_registered_total Total count of tools registered in AIPages.");
        lines.push("# TYPE aipages_tools_registered_total gauge");
        lines.push(`aipages_tools_registered_total ${toolsTotal}`);
        // ── HTTP Requests Counter ─────────────────────────────────────────────
        lines.push("# HELP aipages_http_requests_total Total HTTP requests handled by the server.");
        lines.push("# TYPE aipages_http_requests_total counter");
        for (const [key, count] of this.httpRequests.entries()) {
            const [method, path, status] = key.split("|");
            lines.push(`aipages_http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`);
        }
        // ── Invocations Counter ───────────────────────────────────────────────
        lines.push("# HELP aipages_invocations_total Total tool executions partitioned by namespace and status.");
        lines.push("# TYPE aipages_invocations_total counter");
        for (const [ns, statusMap] of this.invocations.entries()) {
            for (const [status, count] of statusMap.entries()) {
                lines.push(`aipages_invocations_total{namespace="${ns}",status="${status}"} ${count}`);
            }
        }
        // ── Fees Collected Counter ────────────────────────────────────────────
        lines.push("# HELP aipages_fees_collected_total_usdc Total platform fees successfully settled in USDC on Base.");
        lines.push("# TYPE aipages_fees_collected_total_usdc counter");
        for (const [ns, amount] of this.fees.entries()) {
            lines.push(`aipages_fees_collected_total_usdc{namespace="${ns}"} ${amount.toFixed(4)}`);
        }
        // ── Invocation Latency Histograms ─────────────────────────────────────
        lines.push("# HELP aipages_invocation_duration_ms Latency of tool executions in milliseconds.");
        lines.push("# TYPE aipages_invocation_duration_ms histogram");
        for (const [ns, hist] of this.latencies.entries()) {
            for (const b of hist.buckets) {
                lines.push(`aipages_invocation_duration_ms_bucket{namespace="${ns}",le="${b.le}"} ${b.count}`);
            }
            lines.push(`aipages_invocation_duration_ms_bucket{namespace="${ns}",le="+Inf"} ${hist.count}`);
            lines.push(`aipages_invocation_duration_ms_sum{namespace="${ns}"} ${hist.sum.toFixed(2)}`);
            lines.push(`aipages_invocation_duration_ms_count{namespace="${ns}"} ${hist.count}`);
        }
        // ── Errors Counter ────────────────────────────────────────────────────
        lines.push("# HELP aipages_errors_total Total errors encountered by type.");
        lines.push("# TYPE aipages_errors_total counter");
        for (const [errType, count] of this.errors.entries()) {
            lines.push(`aipages_errors_total{type="${errType}"} ${count}`);
        }
        // ── AI Crawler Activity Counter ───────────────────────────────────────
        lines.push("# HELP aipages_ai_crawler_requests_total Total HTTP requests from known AI and search crawlers.");
        lines.push("# TYPE aipages_ai_crawler_requests_total counter");
        for (const [botKey, count] of this.aiCrawlers.entries()) {
            const [bot, path, status] = botKey.split("|");
            lines.push(`aipages_ai_crawler_requests_total{bot="${bot}",path="${path}",status="${status}"} ${count}`);
        }
        return lines.join("\n") + "\n";
    }
}
export const metrics = new MetricsRegistry();
//# sourceMappingURL=metrics.js.map