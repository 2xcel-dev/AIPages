import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { InMemoryToolStore } from "../src/db.js";
import { type Tool } from "../src/types.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import { handleDirectoryRequest, DISCOVERY_MANIFEST } from "../src/index.js";

describe("Homepage Directory Keyword Search & Content Negotiation", () => {
  let store: InMemoryToolStore;
  let app: Hono;

  before(async () => {
    store = new InMemoryToolStore();
    // Seed canonical AUS tools
    for (const tool of CANONICAL_AUS_TOOLS) {
      await store.upsert(tool as Tool);
    }

    app = new Hono();

    app.get("/", async (c) => {
      const accept = c.req.header("Accept") ?? "";
      const format = c.req.query("format");
      const searchQuery = c.req.query("q") ?? c.req.query("search");
      const reliability = c.req.query("reliability");
      const connectionType = c.req.query("connectionType");
      const pricingModel = c.req.query("pricingModel");

      const hasSearchParams = Boolean(searchQuery || reliability || connectionType || pricingModel);

      if (!hasSearchParams) {
        if (
          format === "json" ||
          (!accept.includes("text/html") && (accept.includes("application/json") || accept === "*/*" || !accept))
        ) {
          return c.json(DISCOVERY_MANIFEST);
        }
      }

      return handleDirectoryRequest(c, "/", store);
    });

    app.get("/tools", async (c) => {
      return handleDirectoryRequest(c, "/tools", store);
    });
  });

  describe("Homepage HTML Directory Rendering (GET /)", () => {
    it("renders the directory page with search input and tool cards for browser clients", async () => {
      const res = await app.request("http://localhost/", {
        headers: { Accept: "text/html,application/xhtml+xml" },
      });

      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/html"));
      const body = await res.text();

      assert.ok(body.includes('action="/"'), "Search form should submit to /");
      assert.ok(body.includes('name="q"'), "Search form should have input name q");
      assert.ok(body.includes("schema-sanitizer"), "Should render seeded AUS tools");
      assert.ok(body.includes("financial-audit"), "Should render seeded AUS tools");
      assert.ok(body.includes("reliability="), "Should include reliability filter links");
    });

    it("matches tools by name and preserves entered query in search input value and URL", async () => {
      const res = await app.request("http://localhost/?q=sanitizer", {
        headers: { Accept: "text/html" },
      });

      assert.equal(res.status, 200);
      const body = await res.text();

      assert.ok(body.includes('value="sanitizer"'), "Should preserve entered query in search input");
      assert.ok(body.includes("schema-sanitizer"), "Should show schema sanitizer card");
      assert.ok(!body.includes("media-transcoder"), "Should not show unrelated tools");
      assert.ok(body.includes("/?q=sanitizer&amp;reliability=high") || body.includes("/?q=sanitizer&reliability=high"),
        "Filter pills should retain search query q");
    });

    it("matches tools by capability tag", async () => {
      // media-transcoder has capabilities: ['media-transcoder', 'format-conversion', 'asset-optimization']
      const res = await app.request("http://localhost/?q=format-conversion", {
        headers: { Accept: "text/html" },
      });

      assert.equal(res.status, 200);
      const body = await res.text();

      assert.ok(body.includes("media_transcoder"), "Should match media_transcoder tool by capability tag");
      assert.ok(!body.includes("claude_reason"), "Should not match unrelated tools");
    });

    it("matches tools by description text", async () => {
      // geospatial-verifier description contains: "Haversine distance calculation"
      const res = await app.request("http://localhost/?q=haversine", {
        headers: { Accept: "text/html" },
      });

      assert.equal(res.status, 200);
      const body = await res.text();

      assert.ok(body.includes("geospatial_verifier"), "Should match tool by description text");
    });

    it("matches tools by namespace", async () => {
      const res = await app.request("http://localhost/?q=net.2xcel.aus.sandbox-execution", {
        headers: { Accept: "text/html" },
      });

      assert.equal(res.status, 200);
      const body = await res.text();

      assert.ok(body.includes("sandbox_execution"), "Should match tool by namespace");
    });

    it("renders clear empty state with query and reset button when nothing matches", async () => {
      const res = await app.request("http://localhost/?q=nonexistent123xyz", {
        headers: { Accept: "text/html" },
      });

      assert.equal(res.status, 200);
      const body = await res.text();

      assert.ok(body.includes("empty-state"), "Should contain empty-state container");
      assert.ok(body.includes("No tools matched your criteria"), "Should contain empty state headline");
      assert.ok(body.includes("nonexistent123xyz"), "Should display the searched keyword in empty state");
      assert.ok(body.includes('href="/"'), "Should provide reset link back to homepage");
      assert.ok(body.includes("View All Tools"), "Should provide View All Tools button text");
    });
  });

  describe("Content Negotiation on GET /", () => {
    it("returns JSON discovery manifest when Accept: application/json without search parameters", async () => {
      const res = await app.request("http://localhost/", {
        headers: { Accept: "application/json" },
      });

      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("application/json"));
      const json = await res.json();

      assert.equal(json.name, "AIPages");
      assert.equal(json.version, "0.1.0");
      assert.ok(json.endpoints);
      assert.ok(json.pricing);
    });

    it("returns JSON discovery manifest when ?format=json without search parameters", async () => {
      const res = await app.request("http://localhost/?format=json");

      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("application/json"));
      const json = await res.json();

      assert.equal(json.name, "AIPages");
      assert.equal(json.version, "0.1.0");
    });

    it("returns JSON discovery manifest for default curl requests (Accept: */*) without search params", async () => {
      const res = await app.request("http://localhost/", {
        headers: { Accept: "*/*" },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.name, "AIPages");
    });

    it("returns JSON tool results when search query is provided with Accept: application/json", async () => {
      const res = await app.request("http://localhost/?q=sanitizer", {
        headers: { Accept: "application/json" },
      });

      assert.equal(res.status, 200);
      const json = await res.json();

      assert.ok(Array.isArray(json.tools), "Should return tools array");
      assert.equal(json.total, 1);
      assert.equal(json.tools[0].name, "schema_sanitizer");
    });

    it("returns JSON tool results when search query is provided with format=json", async () => {
      const res = await app.request("http://localhost/?q=sanitizer&format=json");

      assert.equal(res.status, 200);
      const json = await res.json();

      assert.ok(Array.isArray(json.tools));
      assert.equal(json.total, 1);
      assert.equal(json.tools[0].name, "schema_sanitizer");
    });
  });

  describe("Directory at /tools Compatibility", () => {
    it("submits search form to /tools and preserves baseUrl in filter links", async () => {
      const res = await app.request("http://localhost/tools?q=audit", {
        headers: { Accept: "text/html" },
      });

      assert.equal(res.status, 200);
      const body = await res.text();

      assert.ok(body.includes('action="/tools"'), "Form action should be /tools");
      assert.ok(body.includes('value="audit"'), "Search input should preserve query");
      assert.ok(body.includes("/tools?q=audit"), "Filter pills should link to /tools?q=audit...");
    });
  });
});
