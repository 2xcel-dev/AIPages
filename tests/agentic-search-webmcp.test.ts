import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";
import { parseMcpManifest } from "../src/manifest.js";

describe("Agentic Search & WebMCP Readiness Suite", () => {
  describe("Flow 1: Directory Search WebMCP (Declarative + Imperative)", () => {
    it("annotates the directory search form with WebMCP attributes, labels, and Schema.org SearchAction", async () => {
      const res = await app.request("http://localhost/?capability=schema-sanitization&reliability=high", {
        headers: { Accept: "text/html" },
      });
      assert.equal(res.status, 200);
      const html = await res.text();

      // Declarative WebMCP attributes
      assert.ok(html.includes('toolname="search_agent_tools"'), "Search form should declare toolname");
      assert.ok(html.includes("tooldescription="), "Search form should declare tooldescription");
      assert.ok(html.includes('for="directory-search-input"'), "Search input should have an explicit <label>");
      assert.ok(html.includes('id="directory-search-input"'), "Search input should have matching id");
      assert.ok(html.includes("toolparamdescription="), "Search parameters should declare toolparamdescription");

      // Schema.org WebSite SearchAction + application/agent+json manifest
      assert.ok(html.includes('"@type":"SearchAction"'), "Should embed Schema.org SearchAction JSON-LD");
      assert.ok(html.includes('id="aipages-agent-manifest"'), "Should embed application/agent+json manifest");

      // Imperative WebMCP registration script
      assert.ok(html.includes('id="webmcp-imperative-registration"'), "Should include Imperative WebMCP script");
      assert.ok(html.includes("document.modelContext"), "Should register tools on document.modelContext");
      assert.ok(html.includes("window.verifyWebMcpTools"), "Should expose window.verifyWebMcpTools() helper");
    });
  });

  describe("Flow 2: Capabilities Taxonomy Filter WebMCP", () => {
    it("wraps the capability filter input in a labeled WebMCP form with GET /tool action", async () => {
      const res = await app.request("http://localhost/capabilities", {
        headers: { Accept: "text/html" },
      });
      assert.equal(res.status, 200);
      const html = await res.text();

      assert.ok(html.includes('toolname="filter_tools_by_capability"'), "Should declare filter_tools_by_capability tool");
      assert.ok(html.includes('action="/tool"'), "Form should submit directly to /tool?capability=...");
      assert.ok(html.includes('for="cap-filter"'), "Should include <label for='cap-filter'>");
      assert.ok(html.includes('name="capability"'), "Input should have name='capability' for native form submission");
      assert.ok(html.includes("toolparamdescription="), "Input should include toolparamdescription");
      assert.ok(html.includes('id="webmcp-imperative-registration"'), "Should include Imperative WebMCP script");
      assert.ok(!html.includes("🏷️") && !html.includes("🔍"), "Should contain zero raw emoji icons");
    });
  });

  describe("Flow 3: Self-Serve Tool Registration WebMCP (/submit + POST /api/tools/submit)", () => {
    it("renders /submit with Declarative + Imperative WebMCP and Schema.org RegisterAction", async () => {
      const res = await app.request("http://localhost/submit", {
        headers: { Accept: "text/html" },
      });
      assert.equal(res.status, 200);
      const html = await res.text();

      assert.ok(html.includes('id="submit-tool-form"'), "Should render submit-tool-form");
      assert.ok(html.includes('method="POST"'), "Form should declare method='POST'");
      assert.ok(html.includes('action="/api/tools/submit"'), "Form should declare action='/api/tools/submit'");
      assert.ok(html.includes('toolname="register_agent_tool"'), "Form should declare toolname='register_agent_tool'");
      assert.ok(html.includes("tooldescription="), "Form should declare tooldescription");
      assert.ok(html.includes("toolparamdescription="), "Form inputs should declare toolparamdescription");
      assert.ok(html.includes('"@type":"RegisterAction"'), "Should embed Schema.org RegisterAction JSON-LD");
      assert.ok(html.includes('id="webmcp-imperative-registration"'), "Should include Imperative WebMCP script");
    });

    it("accepts native application/x-www-form-urlencoded submissions on POST /api/tools/submit", async () => {
      const formBody = new URLSearchParams({
        name: "webmcp_form_verifier",
        description: "Verifies native URL-encoded form submission for Declarative WebMCP browser agents.",
        connectionType: "http",
        endpointUrl: "https://api.example.com/v1/webmcp-verify",
        developerAddress: "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
        pricingModel: "free",
        costPerCall: "0",
        schema: JSON.stringify({
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        }),
      });

      const res = await app.request("http://localhost/api/tools/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Forwarded-For": "10.99.88.77",
        },
        body: formBody.toString(),
      });

      assert.equal(res.status, 201);
      const data = (await res.json()) as any;
      assert.equal(data.namespace, "listing.webmcp_form_verifier");
      assert.equal(data.name, "webmcp_form_verifier");
      assert.equal(data.pricing.model, "free");
      assert.equal(data.pricing.costPerCall, 0);
    });
  });

  describe("Flow 4: Tool Detail Playground WebMCP & Native Form Execution", () => {
    it("renders /tool/:slug with Declarative + Imperative WebMCP and zero raw emojis", async () => {
      const res = await app.request("http://localhost/tool/net.2xcel.aus.schema-sanitizer", {
        headers: { Accept: "text/html" },
      });
      assert.equal(res.status, 200);
      const html = await res.text();

      assert.ok(
        html.includes('toolname="execute_tool_schema_sanitizer"'),
        "Playground form should declare tool-specific toolname",
      );
      assert.ok(
        html.includes('action="/tool/net.2xcel.aus.schema-sanitizer?test=true"'),
        "Playground form should default to 0-friction test action",
      );
      assert.ok(html.includes('for="playground-payload"'), "Playground textarea should have explicit <label>");
      assert.ok(html.includes("toolparamdescription="), "Playground controls should include toolparamdescription");
      assert.ok(html.includes('id="webmcp-imperative-registration"'), "Should include Imperative WebMCP script");
      assert.ok(!html.includes("⚡") && !html.includes("💎"), "Should contain zero raw emoji icons");
    });

    it("executes a 0-friction sandbox invocation via native application/x-www-form-urlencoded POST", async () => {
      const formBody = new URLSearchParams({
        payload: JSON.stringify({
          data: { raw: "<script>alert(1)</script>Hello Agent", apiKey: "secret-token" },
          rules: { stripHtml: true, maskFields: ["apiKey"] },
        }),
      });

      const res = await app.request("http://localhost/tool/net.2xcel.aus.schema-sanitizer?test=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.status, "success");
      assert.equal(data.toolNamespace, "net.2xcel.aus.schema-sanitizer");
    });
  });

  describe("Flow 5: Agent Discovery Layer & Protocol Endpoints", () => {
    it("serves authoritative MCP manifest at /mcp.json and /.well-known/mcp.json parseable by parseMcpManifest()", async () => {
      for (const path of ["/mcp.json", "/.well-known/mcp.json"]) {
        const res = await app.request(`http://localhost${path}`);
        assert.equal(res.status, 200, `${path} should return 200`);
        const raw = await res.text();
        const parsed = parseMcpManifest(raw);
        assert.ok(parsed && parsed.length >= 16, `${path} should yield schema-bearing tools via parseMcpManifest`);
      }
    });

    it("serves WebMCP actions manifest, agent permissions, OpenAPI, AI plugin, llms-full.txt, AGENTS.md, and legal pages", async () => {
      const jsonEndpoints = [
        "/mcp-actions.json",
        "/.well-known/mcp-actions.json",
        "/agent-permissions.json",
        "/.well-known/agent-permissions.json",
        "/openapi.json",
        "/.well-known/openapi.json",
        "/.well-known/ai-plugin.json",
      ];

      for (const endpoint of jsonEndpoints) {
        const res = await app.request(`http://localhost${endpoint}`);
        assert.equal(res.status, 200, `${endpoint} should return 200 OK`);
        assert.ok(
          res.headers.get("content-type")?.includes("application/json"),
          `${endpoint} should return application/json`,
        );
      }

      const mdEndpoints = [
        "/llms.txt",
        "/llms-full.txt",
        "/AGENTS.md",
        "/tool/net.2xcel.aus.schema-sanitizer.md",
      ];

      for (const endpoint of mdEndpoints) {
        const res = await app.request(`http://localhost${endpoint}`);
        assert.equal(res.status, 200, `${endpoint} should return 200 OK`);
        assert.ok(
          res.headers.get("content-type")?.includes("text/markdown"),
          `${endpoint} should return text/markdown`,
        );
      }

      const htmlEndpoints = ["/privacy", "/refund-policy", "/terms", "/submit"];
      for (const endpoint of htmlEndpoints) {
        const res = await app.request(`http://localhost${endpoint}`, {
          headers: { Accept: "text/html" },
        });
        assert.equal(res.status, 200, `${endpoint} should return 200 OK`);
        const body = await res.text();
        assert.ok(body.includes('id="webmcp-imperative-registration"'), `${endpoint} should include WebMCP runtime`);
      }
    });
  });
});
