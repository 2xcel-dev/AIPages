import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createStore, type ToolStore } from "../src/db.js";
import { type Tool } from "../src/types.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import {
  generateSamplePayload,
  generateRequestExample,
  renderToolPage,
  findToolBySlug,
} from "../src/views/toolPage.js";

describe("Copyable Request Examples on Tool Detail Pages (/tools/:slug)", () => {
  let store: ToolStore;
  let app: Hono;

  const mockPaidTool: Tool = {
    namespace: "net.2xcel.test.sample-paid",
    name: "sample_paid_tool",
    description: "Paid automated verification tool requiring x402 payment.",
    endpointUrl: "https://api.example.com/v1/paid-verify",
    connectionType: "http",
    healthStatus: "active",
    lastChecked: new Date(),
    status: "active",
    pricing: { model: "paid", costPerCall: 0.15 },
    authentication:
      "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
    developer: {
      address: "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
      listingFeePaid: true,
      listingFeeAmount: 0,
    },
    schema: {
      type: "object",
      properties: {
        targetUrl: { type: "string", description: "Target URL to inspect" },
        maxDepth: { type: "integer", default: 3, description: "Maximum recursion depth" },
        verifySignature: { type: "boolean", default: true },
        options: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["fast", "deep"] },
            filterTags: { type: "array", items: { type: "string" } },
          },
        },
      },
      required: ["targetUrl"],
    },
  };

  const mockFreeTool: Tool = {
    namespace: "io.github.test.free-reader",
    name: "free_reader",
    description: "Free public file reader utility.",
    endpointUrl: "https://api.example.com/v1/reader",
    connectionType: "http",
    healthStatus: "active",
    lastChecked: new Date(),
    status: "active",
    pricing: { model: "free", costPerCall: 0 },
    schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to read" },
      },
      required: ["path"],
    },
  };

  before(async () => {
    store = await createStore();
    await store.upsert(mockPaidTool);
    await store.upsert(mockFreeTool);
    for (const ausTool of CANONICAL_AUS_TOOLS) {
      await store.upsert(ausTool as unknown as Tool);
    }

    app = new Hono();
    app.get("/tools/:slug", async (c) => {
      const slug = c.req.param("slug");
      const tool = await findToolBySlug(store, slug);
      if (!tool) return c.text("Not Found", 404);
      return c.html(renderToolPage(tool));
    });
  });

  after(async () => {
    await store.close();
  });

  describe("Sample Payload Generator (generateSamplePayload)", () => {
    it("handles null, undefined, or empty schema gracefully with fallback object", () => {
      assert.deepEqual(generateSamplePayload(null), { input: "sample_value" });
      assert.deepEqual(generateSamplePayload(undefined), { input: "sample_value" });
      assert.deepEqual(generateSamplePayload({}), { input: "sample_value" });
    });

    it("synthesizes primitive fields matching types and property hints", () => {
      const payload = generateSamplePayload({
        type: "object",
        properties: {
          url: { type: "string" },
          query: { type: "string" },
          prompt: { type: "string" },
          code: { type: "string" },
          address: { type: "string" },
          count: { type: "integer" },
          enabled: { type: "boolean" },
        },
      });

      assert.equal(payload.url, "https://example.com/data");
      assert.equal(payload.query, "sample query");
      assert.equal(payload.prompt, "Analyze this input for patterns");
      assert.equal(payload.code, "console.log('hello');");
      assert.equal(payload.address, "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C");
      assert.equal(payload.count, 1);
      assert.equal(payload.enabled, true);
    });

    it("respects schema defaults, examples, and enums", () => {
      const payload = generateSamplePayload({
        type: "object",
        properties: {
          mode: { type: "string", enum: ["strict", "relaxed"] },
          limit: { type: "number", default: 50 },
          token: { type: "string", example: "test-token-123" },
        },
      });

      assert.equal(payload.mode, "strict");
      assert.equal(payload.limit, 50);
      assert.equal(payload.token, "test-token-123");
    });

    it("synthesizes nested objects and arrays with item properties", () => {
      const payload = generateSamplePayload({
        type: "object",
        properties: {
          meta: {
            type: "object",
            properties: {
              tag: { type: "string", default: "v1" },
            },
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                amount: { type: "number", default: 100 },
              },
            },
          },
        },
      });

      assert.deepEqual(payload.meta, { tag: "v1" });
      assert.ok(Array.isArray(payload.items));
      assert.equal(payload.items.length, 1);
      assert.equal(payload.items[0].id, "req_12345");
      assert.equal(payload.items[0].amount, 100);
    });

    it("generates valid payloads for all 8 canonical AUS tools", () => {
      for (const ausTool of CANONICAL_AUS_TOOLS) {
        const payload = generateSamplePayload(ausTool.schema);
        assert.ok(payload, `Payload must exist for ${ausTool.namespace}`);
        assert.equal(typeof payload, "object");
        assert.ok(Object.keys(payload).length > 0, `Payload for ${ausTool.namespace} must have keys`);
      }
    });
  });

  describe("Request Example Builder (generateRequestExample)", () => {
    it("generates x402 paid request example with exact endpoint and receipt header", () => {
      const example = generateRequestExample(mockPaidTool);

      assert.equal(example.endpoint, "https://api.example.com/v1/paid-verify");
      assert.equal(example.method, "POST");
      assert.equal(example.isX402, true);
      assert.equal(example.headers["Content-Type"], "application/json");
      assert.equal(example.headers["x-payment-receipt"], "<BASE_USDC_PAYMENT_RECEIPT>");
      assert.equal(example.costDisplay, "$0.15 USDC");

      // Verify cURL structure
      assert.ok(example.curl.startsWith('curl -X POST "https://api.example.com/v1/paid-verify"'));
      assert.ok(example.curl.includes('-H "Content-Type: application/json"'));
      assert.ok(example.curl.includes('-H "x-payment-receipt: <BASE_USDC_PAYMENT_RECEIPT>"'));
      assert.ok(example.curl.includes("-d '{"));

      // Verify Raw HTTP
      assert.ok(example.rawHttp.includes("POST /v1/paid-verify HTTP/1.1"));
      assert.ok(example.rawHttp.includes("Host: api.example.com"));
      assert.ok(example.rawHttp.includes("x-payment-receipt: <BASE_USDC_PAYMENT_RECEIPT>"));

      // Verify JavaScript fetch code
      assert.ok(example.fetchCode.includes('await fetch("https://api.example.com/v1/paid-verify"'));
      assert.ok(example.fetchCode.includes('"x-payment-receipt": "<BASE_USDC_PAYMENT_RECEIPT>"'));
      assert.ok(example.fetchCode.includes("402 Payment Required"));

      // Zero-leakage verification: no real private keys or secret hashes
      assert.ok(!example.curl.includes("0x1234567890abcdef"));
      assert.ok(example.curl.includes("<BASE_USDC_PAYMENT_RECEIPT>"));
    });

    it("generates clean free request example without payment receipt header", () => {
      const example = generateRequestExample(mockFreeTool);

      assert.equal(example.endpoint, "https://api.example.com/v1/reader");
      assert.equal(example.method, "POST");
      assert.equal(example.isX402, false);
      assert.equal(example.headers["Content-Type"], "application/json");
      assert.equal(example.headers["x-payment-receipt"], undefined);
      assert.equal(example.costDisplay, "Free ($0.00)");
      assert.ok(example.curl.includes('curl -X POST "https://api.example.com/v1/reader"'));
      assert.ok(!example.curl.includes("x-payment-receipt"));
      assert.ok(example.authDescription.includes("No authentication required"));
    });

    it("generates correct canonical AUS fleet request examples for all 8 engines", () => {
      for (const ausTool of CANONICAL_AUS_TOOLS) {
        const example = generateRequestExample(ausTool as unknown as Tool);

        assert.equal(example.method, "POST");
        assert.equal(example.isX402, true);
        assert.equal(example.endpoint, ausTool.endpointUrl);
        assert.ok(example.headers["x-payment-receipt"]);
        assert.ok(example.curl.includes(ausTool.endpointUrl));
        assert.ok(example.curl.includes("x-payment-receipt: <BASE_USDC_PAYMENT_RECEIPT>"));
        assert.ok(example.authDescription.includes("Base Mainnet"));
        assert.ok(example.authDescription.includes("USDC"));
      }
    });
  });

  describe("HTML Integration Section & UI Elements (renderToolPage)", () => {
    it("renders integration card with id, aria-label, and copyable curl snippet for paid tool", () => {
      const html = renderToolPage(mockPaidTool);

      // Section presence and accessibility
      assert.ok(html.includes('id="integration-examples"'));
      assert.ok(html.includes('aria-label="Integration & Request Examples"'));
      assert.ok(html.includes("Integration &amp; Request Example"));

      // Authentication and protocol notice
      assert.ok(html.includes("x402 Payment Required"));
      assert.ok(html.includes("Base Mainnet (Chain ID 8453)"));
      assert.ok(html.includes("&lt;BASE_USDC_PAYMENT_RECEIPT&gt;"));
      assert.ok(html.includes("$0.15 USDC"));

      // Snippet and copy button
      assert.ok(html.includes('id="snippet-curl"'));
      assert.ok(html.includes('curl -X POST &quot;https://api.example.com/v1/paid-verify&quot;'));
      assert.ok(html.includes('class="btn btn-sm btn-copy"'));
      assert.ok(html.includes("Copy cURL"));

      // Code tabs for cURL, JavaScript, and HTTP
      assert.ok(html.includes('data-tab="curl"'));
      assert.ok(html.includes('data-tab="javascript"'));
      assert.ok(html.includes('data-tab="http"'));
      assert.ok(html.includes('id="snippet-javascript"'));
      assert.ok(html.includes('id="snippet-http"'));

      // Metadata card quick proxy snippet also enhanced with copy button
      assert.ok(html.includes('id="proxy-snippet"'));
      assert.ok(html.includes("btn-proxy-copy"));
      assert.ok(html.includes('href="#integration-examples"'));
    });

    it("renders free endpoint status and no payment header for free tool", () => {
      const html = renderToolPage(mockFreeTool);

      assert.ok(html.includes("Free Endpoint"));
      assert.ok(html.includes("No authentication required"));
      assert.ok(!html.includes("x402 Payment Required"));
      assert.ok(html.includes('id="snippet-curl"'));
      assert.ok(html.includes('curl -X POST &quot;https://api.example.com/v1/reader&quot;'));
    });

    it("renders client-side script for tab switching and clipboard fallback", () => {
      const html = renderToolPage(mockPaidTool);

      assert.ok(html.includes("<script>"));
      assert.ok(html.includes("function switchExampleTab(tab)"));
      assert.ok(html.includes("function copyActiveExample(btn)"));
      assert.ok(html.includes("function copyProxySnippet(btn)"));
      assert.ok(html.includes("navigator.clipboard.writeText"));
      assert.ok(html.includes("fallbackCopy"));
    });
  });

  describe("HTTP Route Live Integration (GET /tools/:slug)", () => {
    it("GET /tools/:slug returns 200 HTML with copyable examples for canonical schema-sanitizer", async () => {
      const res = await app.request("http://localhost/tools/net.2xcel.aus.schema-sanitizer");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/html"));

      const html = await res.text();
      assert.ok(html.includes("Integration &amp; Request Example"));
      assert.ok(html.includes("https://aus.2xcel.net/tools/schema-sanitizer"));
      assert.ok(html.includes("x-payment-receipt"));
      assert.ok(html.includes("&lt;BASE_USDC_PAYMENT_RECEIPT&gt;"));
      assert.ok(html.includes("Copy cURL"));
      assert.ok(html.includes("stripHtml"));
    });
  });
});
