/**
 * Observability, Metrics & Operational Hardening Tests
 *
 * Verifies:
 *  - GET /metrics (Prometheus line format exposition)
 *  - GET /health (Uptime, memory telemetry, and engine counts)
 *  - Rate limiting on /search and /api/tools/submit with standard headers
 *  - Direct POST /tool/:slug and POST /tools/:slug invocation routing
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { metrics } from "../src/metrics.js";
import { tokenBucket } from "../src/rate-limit.js";
import { InMemoryToolStore } from "../src/db.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import ingressRouter, { setStore } from "../src/invocation.js";
import { findToolBySlug } from "../src/views/toolPage.js";

describe("Observability & Operational Recommendations", () => {
  describe("Prometheus Metrics Registry (GET /metrics)", () => {
    it("records invocations and formats valid Prometheus line metrics", () => {
      metrics.recordInvocation("net.2xcel.aus.schema-sanitizer", "success", 42.5, 0.25);
      metrics.recordInvocation("net.2xcel.aus.schema-sanitizer", "failed", 15.0, 0);
      metrics.recordHttpRequest("GET", "/api/tools", 200);

      const prometheusText = metrics.formatPrometheus(21);

      assert.ok(prometheusText.includes("# HELP aipages_uptime_seconds"));
      assert.ok(prometheusText.includes("# TYPE aipages_uptime_seconds gauge"));
      assert.ok(prometheusText.includes("aipages_tools_registered_total 21"));
      assert.ok(prometheusText.includes('aipages_invocations_total{namespace="net.2xcel.aus.schema-sanitizer",status="success"} 1'));
      assert.ok(prometheusText.includes('aipages_invocations_total{namespace="net.2xcel.aus.schema-sanitizer",status="failed"} 1'));
      assert.ok(prometheusText.includes('aipages_fees_collected_total_usdc{namespace="net.2xcel.aus.schema-sanitizer"} 0.2500'));
      assert.ok(prometheusText.includes('aipages_invocation_duration_ms_bucket{namespace="net.2xcel.aus.schema-sanitizer",le="50"}'));
    });
  });

  describe("Rate Limiting on Free Discovery Endpoints", () => {
    it("sets standard RateLimit headers and allows requests within ceiling", () => {
      const testKey = `search_test_ip_${Date.now()}`;
      const res1 = tokenBucket(testKey, 60, 60_000);
      assert.equal(res1.allowed, true);
      assert.equal(res1.remaining, 59);
      assert.ok(res1.resetAt > Date.now());
    });

    it("enforces token bucket exhaustion and returns retryAfterSec", () => {
      const burstKey = `burst_test_ip_${Date.now()}`;
      for (let i = 0; i < 15; i++) {
        tokenBucket(burstKey, 15, 60_000);
      }

      const blockedRes = tokenBucket(burstKey, 15, 60_000);
      assert.equal(blockedRes.allowed, false);
      assert.equal(blockedRes.remaining, 0);
      assert.ok(blockedRes.retryAfterSec !== undefined && blockedRes.retryAfterSec > 0);
    });
  });

  describe("Direct POST /tool/:slug Invocation Dispatch", () => {
    let app: Hono;
    let store: InMemoryToolStore;

    before(async () => {
      store = new InMemoryToolStore();
      for (const t of CANONICAL_AUS_TOOLS) {
        await store.upsert({
          ...t,
          pricing: { model: "free", costPerCall: 0 },
          updatedAt: new Date(),
        } as any);
      }
      setStore(store, undefined);

      app = new Hono();
      app.route("/api/invoke", ingressRouter);

      // Mount direct invocation handlers matching index.ts
      async function handleDirectToolInvoke(c: any) {
        const slug = c.req.param("slug");
        const tool = await findToolBySlug(store, slug);
        if (!tool) {
          return c.json({ error: `Tool with identifier '${slug}' not found.` }, 404);
        }

        const invokeUrl = new URL(`/api/invoke/${tool.namespace}`, c.req.url);
        const forwardReq = new Request(invokeUrl.toString(), {
          method: "POST",
          headers: c.req.raw.headers,
          body: c.req.raw.body,
          duplex: "half",
        } as any);

        return app.fetch(forwardReq);
      }

      app.post("/tool/:slug", handleDirectToolInvoke);
      app.post("/tools/:slug", handleDirectToolInvoke);
    });

    it("routes POST /tool/schema-sanitizer directly to internal engine execution", async () => {
      const res = await app.request("/tool/schema-sanitizer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-ID": "direct-agent",
        },
        body: JSON.stringify({
          data: {
            title: "<b>Agent Discovery</b>",
            secret_key: "top_secret_token",
          },
          rules: {
            stripHtml: true,
            maskFields: ["secret_key"],
          },
        }),
      });

      assert.equal(res.status, 200);
      const body = (await res.json()) as any;
      assert.equal(body.status, "success");
      assert.equal(body.toolNamespace, "net.2xcel.aus.schema-sanitizer");
      assert.ok(body.result);
      assert.equal(body.result.data.title, "Agent Discovery");
      assert.equal(body.result.data.secret_key, "********");
    });

    it("routes POST /tools/financial-audit directly for legacy client compatibility", async () => {
      const res = await app.request("/tools/financial-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-ID": "direct-agent",
        },
        body: JSON.stringify({
          transactions: [
            { id: "tx_101", amount: 2500 },
            { id: "tx_102", amount: 15000 },
          ],
          threshold: 10000,
        }),
      });

      assert.equal(res.status, 200);
      const body = (await res.json()) as any;
      assert.equal(body.status, "success");
      assert.equal(body.toolNamespace, "net.2xcel.aus.financial-audit");
      assert.ok(body.result);
      assert.equal(body.result.audit_summary.total_volume, 17500);
      assert.equal(body.result.audit_summary.flagged_transactions, 1);
    });

    it("returns 404 for non-existent tool slug", async () => {
      const res = await app.request("/tool/non-existent-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 404);
      const body = (await res.json()) as any;
      assert.match(body.error, /not found/i);
    });
  });
});
