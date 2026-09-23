import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createStore, type ToolStore } from "../src/db.js";
import { type Tool } from "../src/types.js";
import { findToolBySlug, renderToolPage, renderNotFoundPage } from "../src/views/toolPage.js";

describe("/tools/:slug — Responsive Tool Detail & Reliability Page", () => {
  let store: ToolStore;
  let app: Hono;

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const sampleHealthyTool: Tool = {
    namespace: "net.2xcel.test.healthy-tool",
    name: "healthy_tool",
    description: "A tool that is healthy and has recent probe results.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/healthy",
    healthStatus: "active",
    lastChecked: twoHoursAgo,
    failureReason: null,
    status: "active",
    pricing: { model: "paid", costPerCall: 0.1 },
    developer: { address: "0x1111111111111111111111111111111111111111", listingFeePaid: true, listingFeeAmount: 0 },
    updatedAt: now,
    schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Input prompt to process" },
      },
      required: ["prompt"],
    },
  };

  const sampleFailingTool: Tool = {
    namespace: "net.2xcel.test.failing-tool",
    name: "failing_tool",
    description: "A tool that is currently failing health probes.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/failing",
    healthStatus: "inactive",
    lastChecked: twoHoursAgo,
    failureReason: "HTTP 502 Bad Gateway",
    status: "active",
    pricing: { model: "free", costPerCall: 0 },
    developer: { address: "0x2222222222222222222222222222222222222222", listingFeePaid: true, listingFeeAmount: 0 },
    updatedAt: now,
  };

  const sampleUncheckedTool: Tool = {
    namespace: "net.2xcel.test.unchecked-tool",
    name: "unchecked_tool",
    description: "A newly registered tool that has never had an automated health check.",
    connectionType: "stdio",
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    pricing: { model: "free", costPerCall: 0 },
    developer: { address: "0x3333333333333333333333333333333333333333", listingFeePaid: true, listingFeeAmount: 0 },
    updatedAt: now,
  };

  const sampleDegradedTool: Tool = {
    namespace: "net.2xcel.test.degraded-tool",
    name: "degraded_tool",
    description: "A tool that was active on probe but has a stale check > 24 hours ago.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/degraded",
    healthStatus: "active",
    lastChecked: twoDaysAgo,
    failureReason: null,
    status: "active",
    pricing: { model: "paid", costPerCall: 0.05 },
    developer: { address: "0x4444444444444444444444444444444444444444", listingFeePaid: true, listingFeeAmount: 0 },
    updatedAt: now,
  };

  before(async () => {
    store = await createStore();
    await store.upsert(sampleHealthyTool);
    await store.upsert(sampleFailingTool);
    await store.upsert(sampleUncheckedTool);
    await store.upsert(sampleDegradedTool);

    app = new Hono();
    app.get("/tools/:slug", async (c) => {
      const slug = c.req.param("slug");
      if (!slug) return c.html(renderNotFoundPage(""), 404);

      const tool = await findToolBySlug(store, slug);
      if (!tool) {
        const accept = c.req.header("Accept") ?? "";
        const format = c.req.query("format");
        if (format === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
          return c.json({ error: "Tool not found", slug }, 404);
        }
        return c.html(renderNotFoundPage(slug), 404);
      }

      const accept = c.req.header("Accept") ?? "";
      const format = c.req.query("format");
      if (format === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
        return c.json(tool);
      }

      return c.html(renderToolPage(tool));
    });
  });

  after(async () => {
    await store.close();
  });

  describe("Slug Resolution (findToolBySlug)", () => {
    it("resolves tool by full namespace", async () => {
      const tool = await findToolBySlug(store, "net.2xcel.test.healthy-tool");
      assert.ok(tool);
      assert.equal(tool.name, "healthy_tool");
    });

    it("resolves tool by short name", async () => {
      const tool = await findToolBySlug(store, "healthy_tool");
      assert.ok(tool);
      assert.equal(tool.namespace, "net.2xcel.test.healthy-tool");
    });

    it("resolves tool by namespace suffix", async () => {
      const tool = await findToolBySlug(store, "failing-tool");
      assert.ok(tool);
      assert.equal(tool.namespace, "net.2xcel.test.failing-tool");
    });

    it("returns null for non-existent slug", async () => {
      const tool = await findToolBySlug(store, "non-existent-random-tool-12345");
      assert.equal(tool, null);
    });
  });

  describe("Reliability Section Rendering (renderToolPage)", () => {
    it("renders healthy operational state with recent check time", () => {
      const html = renderToolPage(sampleHealthyTool);

      // Status indicator and badge
      assert.ok(html.includes("badge-healthy"), "Should include healthy badge");
      assert.ok(html.includes("Operational"), "Should state operational status");
      assert.ok(html.includes("Endpoint Reliability"), "Should contain reliability section");

      // Timestamp display
      assert.ok(html.includes("Last Checked"), "Should display Last Checked row");
      assert.ok(html.includes("ago"), "Should display relative check time");

      // Tool metadata
      assert.ok(html.includes("healthy_tool"), "Should render tool name");
      assert.ok(html.includes("net.2xcel.test.healthy-tool"), "Should render namespace");
      assert.ok(html.includes("https://api.example.com/v1/healthy"), "Should render endpoint URL");
      assert.ok(html.includes("$0.1 USDC"), "Should render cost per call");

      // Responsive viewport
      assert.ok(html.includes('meta name="viewport" content="width=device-width, initial-scale=1.0"'));

      // Scope limitation disclaimer (does not imply verification beyond recorded probe)
      assert.ok(html.includes("Recorded Probe Scope:"));
      assert.ok(html.includes("derived solely from automated endpoint reachability probes"));
      assert.ok(html.includes("does not certify semantic correctness"));
    });

    it("renders failing state with prominent human-readable failure reason", () => {
      const html = renderToolPage(sampleFailingTool);

      assert.ok(html.includes("badge-failing"), "Should include failing badge");
      assert.ok(html.includes("Failing"), "Should indicate failing status");
      assert.ok(html.includes("failure-box"), "Should render failure diagnostic box");
      assert.ok(html.includes("HTTP 502 Bad Gateway"), "Should display human-readable failure reason");
    });

    it("renders degraded state when check is older than 24 hours", () => {
      const html = renderToolPage(sampleDegradedTool);

      assert.ok(html.includes("badge-degraded"), "Should include degraded badge");
      assert.ok(html.includes("Degraded (Stale)"), "Should indicate degraded/stale status");
      assert.ok(html.includes("no check has occurred in over 24 hours"), "Should explain stale probe");
    });

    it("remains clean and useful for tools without health data (unchecked)", () => {
      const html = renderToolPage(sampleUncheckedTool);

      // Displays not yet checked state
      assert.ok(html.includes("badge-unchecked"), "Should include unchecked badge");
      assert.ok(html.includes("Not Yet Checked"), "Should label as not yet checked");
      assert.ok(html.includes("None recorded"), "Should indicate no check has occurred");
      assert.ok(html.includes("<code>unchecked</code>"), "Should display unchecked in reliability index");

      // Gracefully handles missing remote endpoint (e.g. stdio transport)
      assert.ok(html.includes("No remote endpoint (stdio/local)"));

      // Metadata still completely intact
      assert.ok(html.includes("unchecked_tool"));
      assert.ok(html.includes("STDIO"));
      assert.ok(html.includes("Free"));
    });
  });

  describe("HTTP Route Integration (/tools/:slug)", () => {
    it("GET /tools/:slug returns 200 text/html with responsive content", async () => {
      const res = await app.request("http://localhost/tools/healthy_tool");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/html"));

      const body = await res.text();
      assert.ok(body.includes("Endpoint Reliability"));
      assert.ok(body.includes("Operational"));
      assert.ok(body.includes("net.2xcel.test.healthy-tool"));
    });

    it("GET /tools/:slug with Accept: application/json returns JSON", async () => {
      const res = await app.request("http://localhost/tools/healthy_tool", {
        headers: { Accept: "application/json" },
      });
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("application/json"));

      const json = await res.json();
      assert.equal(json.namespace, "net.2xcel.test.healthy-tool");
    });

    it("GET /tools/:slug for non-existent tool returns 404 HTML", async () => {
      const res = await app.request("http://localhost/tools/non-existent-tool");
      assert.equal(res.status, 404);
      assert.ok(res.headers.get("content-type")?.includes("text/html"));

      const body = await res.text();
      assert.ok(body.includes("Tool Not Found"));
      assert.ok(body.includes("non-existent-tool"));
    });

    it("GET /tools/:slug for non-existent tool with Accept: application/json returns 404 JSON", async () => {
      const res = await app.request("http://localhost/tools/non-existent-tool", {
        headers: { Accept: "application/json" },
      });
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.error, "Tool not found");
    });
  });
});
