import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createStore, type ToolStore } from "../src/db.js";
import { type Tool } from "../src/types.js";
import { handleDirectoryRequest } from "../src/index.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import { buildFilterUrl, renderDirectoryPage } from "../src/views/directoryPage.js";

describe("Capability Filter Controls in Directory (/ and /tools)", () => {
  let store: ToolStore;
  let app: Hono;

  const mockToolA: Tool = {
    namespace: "net.2xcel.test.sec-audit",
    name: "security_auditor",
    description: "Audits smart contracts and detects vulnerabilities.",
    connectionType: "http",
    healthStatus: "active",
    lastChecked: new Date(),
    status: "active",
    capabilities: ["security-audit", "compliance", "static-analysis"],
    pricing: { model: "paid", costPerCall: 0.1 },
    updatedAt: new Date(),
  };

  const mockToolB: Tool = {
    namespace: "net.2xcel.test.fast-sanitizer",
    name: "fast_sanitizer",
    description: "Cleans untrusted JSON payloads and strips scripts.",
    connectionType: "http",
    healthStatus: "active",
    lastChecked: new Date(),
    status: "active",
    capabilities: ["schema-sanitization", "data-cleaning"],
    pricing: { model: "free", costPerCall: 0 },
    updatedAt: new Date(),
  };

  before(async () => {
    store = await createStore();
    await store.upsert(mockToolA);
    await store.upsert(mockToolB);
    for (const tool of CANONICAL_AUS_TOOLS) {
      await store.upsert(tool as unknown as Tool);
    }

    app = new Hono();
    app.get("/", async (c) => handleDirectoryRequest(c, "/", store));
    app.get("/tools", async (c) => handleDirectoryRequest(c, "/tools", store));
  });

  after(async () => {
    await store.close();
  });

  describe("URL Query State Builder (buildFilterUrl)", () => {
    it("generates clean URL omitting default/empty parameters", () => {
      assert.equal(buildFilterUrl("/", {}), "/");
      assert.equal(buildFilterUrl("/tools", { reliability: "all", capability: "all" }), "/tools");
    });

    it("preserves search and reliability while updating capability", () => {
      const url = buildFilterUrl("/", {
        q: "audit",
        reliability: "high",
        capability: "compliance",
      });
      assert.ok(url.includes("q=audit"));
      assert.ok(url.includes("reliability=high"));
      assert.ok(url.includes("capability=compliance"));
    });

    it("clears capability when passed 'all'", () => {
      const url = buildFilterUrl("/", {
        q: "audit",
        reliability: "high",
        capability: "all",
      });
      assert.ok(!url.includes("capability="));
      assert.ok(url.includes("q=audit"));
      assert.ok(url.includes("reliability=high"));
    });
  });

  describe("Database Capability Filtering (InMemoryToolStore.list)", () => {
    it("filters tools matching a specific capability tag case-insensitively", async () => {
      const results = await store.list({ capability: "security-audit" });
      assert.equal(results.length, 1);
      assert.equal(results[0].namespace, "net.2xcel.test.sec-audit");
    });

    it("combines capability filtering with search keyword query (q)", async () => {
      // Both tools have different capabilities, test filtering for security-audit with search 'smart'
      const match = await store.list({ capability: "security-audit", q: "contracts" });
      assert.equal(match.length, 1);
      assert.equal(match[0].name, "security_auditor");

      // No match if query does not match tool even if capability does
      const noMatch = await store.list({ capability: "security-audit", q: "nonexistent-keyword-xyz" });
      assert.equal(noMatch.length, 0);
    });

    it("returns empty array for non-existent capability", async () => {
      const results = await store.list({ capability: "quantum-teleportation-999" });
      assert.equal(results.length, 0);
    });
  });

  describe("Directory View Rendering (renderDirectoryPage)", () => {
    it("renders capability filter chip row with all available tags and active indicator", () => {
      const html = renderDirectoryPage([mockToolA, mockToolB], 2, {
        baseUrl: "/",
        capability: "compliance",
        availableCapabilities: ["compliance", "data-cleaning", "schema-sanitization", "security-audit"],
      });

      // Capability row exists
      assert.ok(html.includes("capability-pills-row"));
      assert.ok(html.includes("Capability:"));

      // All chip is rendered and not active
      assert.ok(html.includes('data-capability="all"'));

      // Active chip is highlighted and shows clear toggle
      assert.ok(html.includes('data-capability="compliance"'));
      assert.ok(html.includes("✕ compliance"));

      // Inactive chip is rendered without clear symbol
      assert.ok(html.includes('data-capability="security-audit"'));
      assert.ok(html.includes("security-audit"));

      // Results header indicates active capability with clear button
      assert.ok(html.includes("with capability"));
      assert.ok(html.includes("active-filter-tag"));
      assert.ok(html.includes("Clear Capability Filter"));

      // Tool cards render capability pills
      assert.ok(html.includes("card-caps-row"));
      assert.ok(html.includes("card-cap-pill"));
    });

    it("renders empty state with clear capability filter button when no tools match", () => {
      const html = renderDirectoryPage([], 0, {
        baseUrl: "/",
        capability: "unknown-cap",
        availableCapabilities: ["compliance"],
      });

      assert.ok(html.includes("No tools matched your criteria"));
      assert.ok(html.includes("No tools found with capability &ldquo;unknown-cap&rdquo;"));
      assert.ok(html.includes("Clear Capability Filter"));
      assert.ok(html.includes("View All Tools"));
    });
  });

  describe("HTTP Route Live Integration (/ and /tools)", () => {
    it("GET /?capability=financial-audit returns only financial-audit tools in HTML", async () => {
      const res = await app.request("http://localhost/?capability=financial-audit");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/html"));

      const html = await res.text();
      assert.ok(html.includes("financial_audit"));
      assert.ok(html.includes("net.2xcel.aus.financial-audit"));
      assert.ok(!html.includes("fast_sanitizer"));
      assert.ok(html.includes("active-filter-tag"));
      assert.ok(html.includes("✕ financial-audit"));
    });

    it("GET /tools?capability=schema-sanitization filters correctly on /tools", async () => {
      const res = await app.request("http://localhost/tools?capability=schema-sanitization");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/html"));

      const html = await res.text();
      assert.ok(html.includes("schema_sanitizer") || html.includes("fast_sanitizer"));
      assert.ok(!html.includes("security_auditor"));
      assert.ok(html.includes("action=\"/tools\""));
    });

    it("GET /?capability=security-audit&format=json returns filtered JSON response", async () => {
      const res = await app.request("http://localhost/?capability=security-audit&format=json");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("application/json"));

      const json = await res.json();
      assert.equal(json.total, 1);
      assert.equal(json.capability, "security-audit");
      assert.equal(json.tools[0].namespace, "net.2xcel.test.sec-audit");
      assert.ok(Array.isArray(json.availableCapabilities));
      assert.ok(json.availableCapabilities.includes("security-audit"));
    });

    it("GET /?capability=nonexistent-cap returns empty state with reset links", async () => {
      const res = await app.request("http://localhost/?capability=nonexistent-cap");
      assert.equal(res.status, 200);

      const html = await res.text();
      assert.ok(html.includes("No tools matched your criteria"));
      assert.ok(html.includes("Clear Capability Filter"));
    });

    it("preserves keyword search query when filtering by capability (/?q=batch&capability=financial-audit)", async () => {
      const res = await app.request("http://localhost/?q=batch&capability=financial-audit");
      assert.equal(res.status, 200);

      const html = await res.text();
      assert.ok(html.includes("financial_audit"));
      assert.ok(html.includes('value="batch"'));
      assert.ok(html.includes('name="capability" value="financial-audit"'));
    });
  });
});
