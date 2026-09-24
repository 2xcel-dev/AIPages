import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createStore, type ToolStore } from "../src/db.js";
import { type Tool } from "../src/types.js";
import {
  getCapabilityIndex,
  renderCapabilitiesPage,
  CAPABILITY_DESCRIPTIONS,
} from "../src/views/capabilitiesPage.js";
import { renderToolPage, renderNotFoundPage, findToolBySlug } from "../src/views/toolPage.js";
import { renderDirectoryPage } from "../src/views/directoryPage.js";
import { generateSitemapXml } from "../src/views/sitemap.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";

describe("Task 10: Public Capabilities Directory Page (/capabilities)", () => {
  let store: ToolStore;
  let app: Hono;

  const now = new Date("2026-09-23T08:00:00.000Z");

  const sampleTool1: Tool = {
    namespace: "net.2xcel.test.sanitizer-pro",
    name: "sanitizer_pro",
    description: "Advanced JSON sanitizer with custom schema rules.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/sanitize",
    healthStatus: "active",
    lastChecked: now,
    status: "active",
    capabilities: ["schema-sanitization", "data-cleaning", "json-schema"],
    pricing: { model: "paid", costPerCall: 0.05 },
    isFirstParty: false,
    updatedAt: now,
  };

  const sampleTool2: Tool = {
    namespace: "net.2xcel.test.fast-cleaner",
    name: "fast_cleaner",
    description: "Lightweight string and data cleaner.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/clean",
    healthStatus: "unknown",
    status: "active",
    capabilities: ["data-cleaning", "validation"],
    pricing: { model: "free", costPerCall: 0 },
    isFirstParty: false,
    updatedAt: now,
  };

  const pendingTool: Tool = {
    namespace: "net.2xcel.test.pending-tool",
    name: "pending_tool",
    description: "Pending submission tool that should not be visible.",
    connectionType: "http",
    healthStatus: "unknown",
    status: "pending",
    capabilities: ["secret-cap"],
    updatedAt: now,
  };

  before(async () => {
    store = await createStore();
    await store.upsert(sampleTool1);
    await store.upsert(sampleTool2);
    await store.upsert(pendingTool);

    for (const aus of CANONICAL_AUS_TOOLS) {
      await store.upsert({
        ...aus,
        updatedAt: now,
      });
    }

    app = new Hono();

    app.get("/capabilities", async (c) => {
      const allTools = await store.list();
      const publicTools = allTools.filter(
        (t) => t.status !== "rejected" && t.status !== "pending",
      );
      const capabilities = getCapabilityIndex(publicTools);

      const accept = c.req.header("Accept") ?? "";
      const format = c.req.query("format");
      if (
        format === "json" ||
        (accept.includes("application/json") && !accept.includes("text/html"))
      ) {
        return c.json({
          totalCapabilities: capabilities.length,
          totalTools: publicTools.length,
          capabilities,
        });
      }

      return c.html(renderCapabilitiesPage(capabilities, publicTools.length));
    });

    app.get("/tools", async (c) => {
      const tools = await store.list();
      return c.html(renderDirectoryPage(tools, tools.length));
    });

    app.get("/tools/:slug", async (c) => {
      const slug = c.req.param("slug");
      if (!slug) return c.html(renderNotFoundPage(""), 404);
      const tool = await findToolBySlug(store, slug);
      if (!tool) return c.html(renderNotFoundPage(slug), 404);
      return c.html(renderToolPage(tool));
    });

    app.get("/sitemap.xml", async (c) => {
      const allTools = await store.list();
      const xml = generateSitemapXml(allTools);
      c.header("Content-Type", "application/xml; charset=utf-8");
      return c.body(xml);
    });
  });

  describe("Capabilities Aggregator (getCapabilityIndex)", () => {
    it("aggregates distinct capabilities with accurate tool counts", () => {
      const index = getCapabilityIndex([sampleTool1, sampleTool2]);

      const dataCleaning = index.find((c) => c.name === "data-cleaning");
      assert.ok(dataCleaning, "Must aggregate 'data-cleaning'");
      assert.equal(dataCleaning.toolCount, 2);
      assert.equal(dataCleaning.directoryUrl, "/tool?capability=data-cleaning");
      assert.equal(dataCleaning.tools.length, 2);

      const schemaSan = index.find((c) => c.name === "schema-sanitization");
      assert.ok(schemaSan);
      assert.equal(schemaSan.toolCount, 1);
    });

    it("sorts capabilities by tool count descending", () => {
      const index = getCapabilityIndex([sampleTool1, sampleTool2]);
      assert.ok(index.length >= 4);
      // 'data-cleaning' has 2 tools, others have 1
      assert.equal(index[0].name, "data-cleaning");
      assert.equal(index[0].toolCount, 2);
    });

    it("excludes non-public tools (pending or rejected status)", () => {
      const index = getCapabilityIndex([sampleTool1, pendingTool]);
      const secretCap = index.find((c) => c.name === "secret-cap");
      assert.equal(secretCap, undefined);
    });

    it("indexes all 8 canonical AUS tool capabilities", () => {
      const ausToolsAsFull: Tool[] = CANONICAL_AUS_TOOLS.map((t) => ({
        ...t,
        updatedAt: now,
      }));
      const index = getCapabilityIndex(ausToolsAsFull);

      // Verify representative canonical capabilities exist
      const requiredCaps = [
        "schema-sanitization",
        "financial-audit",
        "verification-oracle",
        "geospatial",
        "sandbox-execution",
        "claude-reason",
        "media-transcoder",
        "agentic-audit",
      ];

      for (const cap of requiredCaps) {
        const found = index.find((c) => c.name === cap);
        assert.ok(found, `Canonical capability ${cap} must be indexed`);
        assert.ok(found.toolCount >= 1);
        assert.ok(found.description.length > 10);
      }
    });

    it("uses curated descriptions when available in CAPABILITY_DESCRIPTIONS", () => {
      assert.ok(CAPABILITY_DESCRIPTIONS["schema-sanitization"]);
      assert.ok(CAPABILITY_DESCRIPTIONS["financial-audit"]);
      assert.ok(CAPABILITY_DESCRIPTIONS["sandbox-execution"]);

      const index = getCapabilityIndex([sampleTool1]);
      const schemaSan = index.find((c) => c.name === "schema-sanitization");
      assert.equal(schemaSan?.description, CAPABILITY_DESCRIPTIONS["schema-sanitization"]);
    });
  });

  describe("HTML Rendering (renderCapabilitiesPage)", () => {
    it("renders valid HTML with Schema.org CollectionPage JSON-LD", () => {
      const capabilities = getCapabilityIndex([sampleTool1, sampleTool2]);
      const html = renderCapabilitiesPage(capabilities, 2);

      assert.ok(html.includes("<!DOCTYPE html>"));
      assert.ok(html.includes("<title>Tool Capabilities Index - AIPages Agent Tool Registry</title>"));
      assert.ok(html.includes('<link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">'));

      // Validate JSON-LD script
      const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(match, "Must include JSON-LD script");
      const parsed = JSON.parse(match[1]);
      assert.equal(parsed["@type"], "CollectionPage");
      assert.equal(parsed.numberOfItems, capabilities.length);
      assert.ok(Array.isArray(parsed.itemListElement));
    });

    it("renders capability cards with tool preview pills, prices, and directory links", () => {
      const capabilities = getCapabilityIndex([sampleTool1, sampleTool2]);
      const html = renderCapabilitiesPage(capabilities, 2);

      assert.ok(html.includes("data-cleaning"));
      assert.ok(html.includes("2 tools"));
      assert.ok(html.includes("sanitizer_pro"));
      assert.ok(html.includes("fast_cleaner"));
      assert.ok(html.includes("/tool?capability=data-cleaning"));
      assert.ok(html.includes("Browse data-cleaning Tools &rarr;"));
    });

    it("renders quick filter input and empty state elements", () => {
      const capabilities = getCapabilityIndex([sampleTool1]);
      const html = renderCapabilitiesPage(capabilities, 1);

      assert.ok(html.includes('id="cap-filter"'));
      assert.ok(html.includes('id="cap-grid"'));
      assert.ok(html.includes('id="empty-state"'));
    });
  });

  describe("HTTP Route Live Integration (/capabilities)", () => {
    it("GET /capabilities returns 200 text/html with rich directory discovery content", async () => {
      const res = await app.request("http://localhost/capabilities");
      assert.equal(res.status, 200);

      const contentType = res.headers.get("content-type") ?? "";
      assert.ok(contentType.includes("text/html"));

      const body = await res.text();
      assert.ok(body.includes("AI Agent Tool Capabilities"));
      assert.ok(body.includes("Distinct Capabilities"));
      assert.ok(body.includes("schema-sanitization"));
      assert.ok(body.includes("financial-audit"));
      assert.ok(body.includes("sandbox-execution"));
      assert.ok(body.includes("/tool?capability="));
    });

    it("GET /capabilities with Accept: application/json returns structured JSON", async () => {
      const res = await app.request("http://localhost/capabilities", {
        headers: { Accept: "application/json" },
      });
      assert.equal(res.status, 200);

      const contentType = res.headers.get("content-type") ?? "";
      assert.ok(contentType.includes("application/json"));

      const data = await res.json();
      assert.ok(data.totalCapabilities >= 8);
      assert.ok(data.totalTools >= 8);
      assert.ok(Array.isArray(data.capabilities));

      const san = data.capabilities.find((c: any) => c.name === "schema-sanitization");
      assert.ok(san);
      assert.ok(san.toolCount >= 1);
      assert.ok(san.tools.length >= 1);
      assert.ok(san.directoryUrl.includes("/tool?capability=schema-sanitization"));
    });

    it("GET /capabilities?format=json returns structured JSON", async () => {
      const res = await app.request("http://localhost/capabilities?format=json");
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.totalCapabilities > 0);
    });

    it("GET /sitemap.xml includes /capabilities URL", async () => {
      const res = await app.request("http://localhost/sitemap.xml");
      assert.equal(res.status, 200);
      const xml = await res.text();
      assert.ok(xml.includes("<loc>https://aipages.tech/capabilities</loc>"));
    });

    it("Navbar on directory and tool detail pages links to /capabilities", async () => {
      const dirRes = await app.request("http://localhost/tools");
      assert.equal(dirRes.status, 200);
      const dirHtml = await dirRes.text();
      assert.ok(dirHtml.includes('<a href="/capabilities">Capabilities</a>'));

      const toolRes = await app.request("http://localhost/tools/sanitizer_pro");
      assert.equal(toolRes.status, 200);
      const toolHtml = await toolRes.text();
      assert.ok(toolHtml.includes('<a href="/capabilities">Capabilities</a>'));
    });
  });
});
