import { describe, it } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { app } from "../src/index.js";
import {
  classifyToolGroup,
  renderCategoryGlyphSvg,
  deriveToolUseCase,
  renderToolCard,
} from "../src/views/components/toolCard.js";
import { buildFilterUrl } from "../src/views/components/filterBar.js";
import {
  renderQuickInstallWidget,
  renderStickyMcpDock,
} from "../src/views/components/installDock.js";
import type { Tool } from "../src/types.js";

const MOCK_TOOL: Tool = {
  namespace: "net.2xcel.aus.schema-sanitizer",
  name: "schema_sanitizer",
  description: "Sanitizes untrusted payloads and strips XSS vectors.",
  version: "1.0.0",
  connectionType: "http",
  endpointUrl: "https://aipages.tech/tool/net.2xcel.aus.schema-sanitizer",
  capabilities: ["security", "sanitization"],
  pricing: {
    model: "free",
    costPerCall: 0,
  },
  schema: {
    type: "object",
    properties: {
      data: { type: "object" },
    },
  },
  isFirstParty: true,
  healthStatus: "active",
};

describe("Native Streaming Compression & View Modularization Suite", () => {
  describe("Streaming Response Compression (zlib / CompressionStream)", () => {
    it("returns Content-Encoding: gzip when client provides Accept-Encoding: gzip", async () => {
      const res = await app.request("/api/tools?limit=5", {
        headers: {
          "Accept-Encoding": "gzip",
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-encoding"), "gzip");

      // Verify binary buffer can be decompressed with zlib.gunzipSync
      const arrayBuffer = await res.arrayBuffer();
      const decompressedBuffer = zlib.gunzipSync(Buffer.from(arrayBuffer));
      const json = JSON.parse(decompressedBuffer.toString("utf-8"));

      assert.ok(json.pagination);
      assert.ok(Array.isArray(json.tools));
    });

    it("returns uncompressed payload when Accept-Encoding is omitted", async () => {
      const res = await app.request("/api/tools?limit=5");
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-encoding"), null);

      const json = await res.json();
      assert.ok(json.pagination);
      assert.ok(Array.isArray(json.tools));
    });

    it("compresses JSON syndication feed when requested", async () => {
      const res = await app.request("/api/feed.json", {
        headers: {
          "Accept-Encoding": "gzip",
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-encoding"), "gzip");

      const arrayBuffer = await res.arrayBuffer();
      const decompressed = zlib.gunzipSync(Buffer.from(arrayBuffer)).toString("utf-8");
      const feed = JSON.parse(decompressed);
      assert.equal(feed.version, "https://jsonfeed.org/version/1.1");
    });
  });

  describe("Modularized View Components", () => {
    it("classifies tool group correctly in component helper", () => {
      const group = classifyToolGroup(MOCK_TOOL);
      assert.equal(group, "core");

      const glyph = renderCategoryGlyphSvg(group);
      assert.ok(glyph.includes("<svg"));
      assert.ok(glyph.includes("viewBox"));
    });

    it("derives tool use case correctly", () => {
      const useCase = deriveToolUseCase(MOCK_TOOL);
      assert.equal(useCase, "Input Security & Sanitization");
    });

    it("renders tool card cleanly with expected markup and attributes", () => {
      const html = renderToolCard(MOCK_TOOL, "/", "security", 0);
      assert.ok(html.includes("tool-card"));
      assert.ok(html.includes("data-namespace=\"net.2xcel.aus.schema-sanitizer\""));
      assert.ok(html.includes("Copy MCP"));
      assert.ok(html.includes("AUS OFFICIAL"));
    });

    it("builds filter url with query params properly", () => {
      const url = buildFilterUrl("/", {
        q: "sanitizer",
        reliability: "high",
        connectionType: "http",
        pricingModel: "free",
        capability: "security",
      });
      assert.ok(url.includes("q=sanitizer"));
      assert.ok(url.includes("reliability=high"));
      assert.ok(url.includes("capability=security"));
    });

    it("renders quick install widget and sticky MCP dock", () => {
      const example = {
        endpoint: "https://aipages.tech/tool/net.2xcel.aus.schema-sanitizer",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {},
        bodyJson: "{}",
        curl: "curl ...",
        fetchCode: "fetch(...)",
        rawHttp: "POST / ...",
        cursorConfig: "{}",
        claudeConfig: "{}",
        clineConfig: "{}",
        claudeCodeCmd: "claude mcp add aus-schema-sanitizer -- npx -y @aipages/mcp-gateway net.2xcel.aus.schema-sanitizer",
        toolServerName: "schema-sanitizer",
        authDescription: "Free",
        isX402: false,
        costDisplay: "0.00",
      };

      const widgetHtml = renderQuickInstallWidget(MOCK_TOOL, example, true);
      assert.ok(widgetHtml.includes("mcp-quick-install-widget"));
      assert.ok(widgetHtml.includes("claude mcp add aus-schema-sanitizer"));

      const dockHtml = renderStickyMcpDock(MOCK_TOOL, example);
      assert.ok(dockHtml.includes("mcp-sticky-dock"));
      assert.ok(dockHtml.includes("dock-btn-claudecode"));
    });
  });
});
