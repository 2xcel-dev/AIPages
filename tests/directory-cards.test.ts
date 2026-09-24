import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createStore, type ToolStore } from "../src/db.js";
import { type Tool, deriveReliability } from "../src/types.js";
import { renderToolCard, renderDirectoryPage } from "../src/views/directoryPage.js";

describe("Directory Cards - Reliability & Freshness", () => {
  let store: ToolStore;
  let app: Hono;

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const healthyTool: Tool = {
    namespace: "net.2xcel.card.healthy",
    name: "card_healthy_tool",
    description: "Production ready agent utility with high reliability.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/card/healthy",
    healthStatus: "active",
    lastChecked: twoHoursAgo,
    failureReason: null,
    status: "active",
    pricing: { model: "paid", costPerCall: 0.1 },
    developer: { address: "0x1111111111111111111111111111111111111111", listingFeePaid: true, listingFeeAmount: 0 },
    updatedAt: now,
  };

  const failingTool: Tool = {
    namespace: "net.2xcel.card.failing",
    name: "card_failing_tool",
    description: "Agent endpoint experiencing downtime.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/card/failing",
    healthStatus: "inactive",
    lastChecked: twoHoursAgo,
    failureReason: "HTTP 502 Bad Gateway",
    status: "active",
    pricing: { model: "free", costPerCall: 0 },
    developer: { address: "0x2222222222222222222222222222222222222222", listingFeePaid: true, listingFeeAmount: 0 },
    updatedAt: now,
  };

  const degradedTool: Tool = {
    namespace: "net.2xcel.card.degraded",
    name: "card_degraded_tool",
    description: "Tool checked > 24 hours ago.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/card/degraded",
    healthStatus: "active",
    lastChecked: twoDaysAgo,
    failureReason: null,
    status: "active",
    pricing: { model: "paid", costPerCall: 0.05 },
    developer: { address: "0x3333333333333333333333333333333333333333", listingFeePaid: true, listingFeeAmount: 0 },
    updatedAt: now,
  };

  const uncheckedTool: Tool = {
    namespace: "net.2xcel.card.unchecked",
    name: "card_unchecked_tool",
    description: "New stdio tool without automated check probe.",
    connectionType: "stdio",
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    pricing: { model: "free", costPerCall: 0 },
    developer: { address: "0x4444444444444444444444444444444444444444", listingFeePaid: true, listingFeeAmount: 0 },
    updatedAt: now,
  };

  const allTools = [healthyTool, failingTool, degradedTool, uncheckedTool];

  before(async () => {
    store = await createStore();
    for (const tool of allTools) {
      await store.upsert(tool);
    }

    app = new Hono();
    app.get("/tools", async (c) => {
      const reliability = c.req.query("reliability");
      const searchQuery = c.req.query("q");
      let tools = await store.list();

      if (reliability && reliability !== "all") {
        tools = tools.filter((t) => deriveReliability(t).reliability === reliability);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        tools = tools.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.namespace.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q)),
        );
      }

      const accept = c.req.header("Accept") ?? "";
      if (accept.includes("application/json")) {
        return c.json({ total: tools.length, tools });
      }

      return c.html(renderDirectoryPage(tools, tools.length, { search: searchQuery, reliability }));
    });
  });

  after(async () => {
    await store.close();
  });

  describe("Directory Card Component (renderToolCard)", () => {
    it("renders operational reliability badge and relative freshness for healthy tools", () => {
      const html = renderToolCard(healthyTool);

      assert.ok(html.includes("card-healthy"), "Should have card-healthy status class");
      assert.ok(html.includes("badge-high"), "Should include high reliability badge");
      assert.ok(html.includes("Operational"), "Should state Operational");
      assert.ok(html.includes("Freshness"), "Should include Freshness label");
      assert.ok(html.includes("2h ago"), "Should render relative freshness timestamp");
      assert.ok(html.includes("/tool/net.2xcel.card.healthy"), "Should link to tool detail page");
      assert.ok(html.includes("$0.1 USDC"), "Should display pricing badge");
    });

    it("renders failing reliability badge and concise failure reason snippet for failing tools", () => {
      const html = renderToolCard(failingTool);

      assert.ok(html.includes("card-failing"), "Should have card-failing class");
      assert.ok(html.includes("badge-failing"), "Should include failing badge");
      assert.ok(html.includes("Failing"), "Should state Failing");
      assert.ok(html.includes("card-failure-reason"), "Should render failure reason callout");
      assert.ok(html.includes("HTTP 502 Bad Gateway"), "Should show failure reason");
    });

    it("renders degraded reliability badge and freshness for stale check tools", () => {
      const html = renderToolCard(degradedTool);

      assert.ok(html.includes("card-degraded"), "Should have card-degraded class");
      assert.ok(html.includes("badge-degraded"), "Should include degraded badge");
      assert.ok(html.includes("Degraded"), "Should state Degraded");
      assert.ok(html.includes("2d ago"), "Should render freshness timestamp of 2d ago");
    });

    it("renders unchecked reliability badge and 'Never checked' freshness for untested tools", () => {
      const html = renderToolCard(uncheckedTool);

      assert.ok(html.includes("card-unchecked"), "Should have card-unchecked class");
      assert.ok(html.includes("badge-unchecked"), "Should include unchecked badge");
      assert.ok(html.includes("Unchecked"), "Should state Unchecked");
      assert.ok(html.includes("Never checked"), "Should indicate Never checked");
    });
  });

  describe("Directory Page Component (renderDirectoryPage)", () => {
    it("renders complete directory layout with filter chips and search form", () => {
      const html = renderDirectoryPage(allTools, allTools.length, { reliability: "all" });

      assert.ok(html.includes("AI Agent Tool Directory"));
      assert.ok(html.includes('class="cards-grid"'));
      assert.ok(html.includes('name="q"'));
      assert.ok(html.includes("Operational"));
      assert.ok(html.includes("Degraded"));
      assert.ok(html.includes("Failing"));
      assert.ok(html.includes("Unchecked"));
      assert.ok(html.includes("Showing <strong>4</strong> of <strong>4</strong>"));
    });

    it("renders informative empty state when no tools match", () => {
      const html = renderDirectoryPage([], 0, { search: "nonexistent" });

      assert.ok(html.includes("empty-state"));
      assert.ok(html.includes("No tools matched your criteria"));
    });
  });

  describe("HTTP Route Integration (GET /tools)", () => {
    it("returns 200 HTML with directory cards", async () => {
      const res = await app.request("http://localhost/tools");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/html"));

      const body = await res.text();
      assert.ok(body.includes("AI Agent Tool Directory"));
      assert.ok(body.includes("net.2xcel.card.healthy"));
      assert.ok(body.includes("net.2xcel.card.failing"));
    });

    it("filters directory cards by reliability=high", async () => {
      const res = await app.request("http://localhost/tools?reliability=high");
      assert.equal(res.status, 200);

      const body = await res.text();
      assert.ok(body.includes("net.2xcel.card.healthy"));
      assert.ok(!body.includes("net.2xcel.card.failing"));
      assert.ok(!body.includes("net.2xcel.card.unchecked"));
    });

    it("filters directory cards by reliability=failing", async () => {
      const res = await app.request("http://localhost/tools?reliability=failing");
      assert.equal(res.status, 200);

      const body = await res.text();
      assert.ok(body.includes("net.2xcel.card.failing"));
      assert.ok(!body.includes("net.2xcel.card.healthy"));
    });

    it("filters directory cards by keyword query q", async () => {
      const res = await app.request("http://localhost/tools?q=healthy");
      assert.equal(res.status, 200);

      const body = await res.text();
      assert.ok(body.includes("net.2xcel.card.healthy"));
      assert.ok(!body.includes("net.2xcel.card.failing"));
    });

    it("returns JSON when Accept: application/json is provided", async () => {
      const res = await app.request("http://localhost/tools", {
        headers: { Accept: "application/json" },
      });
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("application/json"));

      const data = await res.json() as any;
      assert.equal(data.total, 4);
    });
  });
});
