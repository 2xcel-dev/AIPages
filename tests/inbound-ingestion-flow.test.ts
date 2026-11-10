import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { initApp, app } from "../src/index.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import type { ToolStore } from "../src/db.js";
import type { Tool } from "../src/types.js";

describe("Inbound Ingestion & Autonomous Agent Workflow Loop", () => {
  let store: ToolStore;

  before(async () => {
    const initialized = await initApp();
    store = initialized.store;
    for (const tool of CANONICAL_AUS_TOOLS) {
      await store.upsert(tool as unknown as Tool);
    }
  });

  describe("Stage 1: LLM Discovery via llms.txt & Automated Syndication", () => {
    it("GET /llms.txt surfaces anti-bot web scraping with on-chain Base USDC settlement", async () => {
      const res = await app.request("http://localhost/llms.txt");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/markdown"));

      const text = await res.text();
      assert.ok(text.includes("net.2xcel.aus.browser-stealth"));
      assert.ok(text.includes("anti-bot web scraping with on-chain settlement"));
      assert.ok(text.includes("https://aipages.tech/tools/net.2xcel.aus.browser-stealth"));
      assert.ok(text.includes("Base USDC"));
      assert.ok(text.includes(".cursor/mcp.json"));
    });
  });

  describe("Stage 2: User Lands on Tool Landing Page (/tools/net.2xcel.aus.browser-stealth)", () => {
    it("renders tool detail page with 'Add to Cursor' button and Interactive Playground", async () => {
      const res = await app.request("http://localhost/tools/net.2xcel.aus.browser-stealth");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/html"));

      const html = await res.text();
      // Hero & 1-Click Agent Copy Buttons (Claude Desktop, Cursor, Cline)
      assert.ok(html.includes("browser_stealth") || html.includes("browser-stealth"));
      assert.ok(html.includes("Add to Claude"));
      assert.ok(html.includes("Add to Cursor"));
      assert.ok(html.includes("Add to Cline"));
      assert.ok(html.includes("copyClientConfig('claude', this)"));
      assert.ok(html.includes("copyClientConfig('cursor', this)"));
      assert.ok(html.includes("copyClientConfig('cline', this)"));
      assert.ok(html.includes("openCursorModal()"));
      assert.ok(html.includes('id="cursor-modal"'));
      assert.ok(html.includes(".cursor/mcp.json"));
      assert.ok(html.includes("claude_desktop_config.json"));
      assert.ok(html.includes("cline_mcp_settings.json"));

      // Interactive Playground surfaced front-and-center
      assert.ok(html.includes('id="test-console"'));
      assert.ok(html.includes("Interactive Test Console"));
      assert.ok(html.includes("0-Friction Test"));
      assert.ok(html.includes("btn-mode-sandbox"));
      assert.ok(html.includes("btn-mode-production"));
      assert.ok(html.includes("Run 0-Friction Test"));

      // Integration Tabs & Snippets for Cursor, Claude, and Cline
      assert.ok(html.includes('data-tab="cursor"'));
      assert.ok(html.includes('data-tab="claude"'));
      assert.ok(html.includes('data-tab="cline"'));
      assert.ok(html.includes('id="snippet-cursor"'));
      assert.ok(html.includes('id="snippet-claude"'));
      assert.ok(html.includes('id="snippet-cline"'));
      assert.ok(html.includes("@aipages/mcp-gateway"));
    });

    it("GET /tool/net.2xcel.aus.browser-stealth alias also serves full responsive page", async () => {
      const res = await app.request("http://localhost/tool/net.2xcel.aus.browser-stealth");
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("Add to Cursor"));
      assert.ok(html.includes("0-Friction Test"));
    });
  });

  describe("Stage 3: Interactive Playground 0-Friction Test Execution", () => {
    it("executes live payload with 0 friction via x-playground-test: true", async () => {
      const payload = {
        url: "https://news.ycombinator.com",
        renderJs: true,
        extractMode: "markdown",
        timeoutMs: 5000,
      };

      const res = await app.request("http://localhost/tool/net.2xcel.aus.browser-stealth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-playground-test": "true",
          "x-agent-id": "browser-playground",
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, "success");
      assert.equal(data.toolNamespace, "net.2xcel.aus.browser-stealth");
      assert.ok(data.result);
      assert.equal(data.result.utility, "browser-stealth");
      assert.equal(data.result.anti_bot_bypassed, true);
      assert.ok(data.result.content.includes("Source URL"));
      assert.ok(data.fee.note.includes("Playground test execution"));
    });
  });

  describe("Stage 4: Production Base USDC Settlement Gate (x402)", () => {
    it("returns 402 Payment Required when executing in production mode without payment header", async () => {
      const payload = {
        url: "https://news.ycombinator.com",
        renderJs: true,
        extractMode: "markdown",
      };

      const res = await app.request("http://localhost/tool/net.2xcel.aus.browser-stealth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-id": "browser-agent",
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 402);
      const body = await res.json();
      assert.equal(body.error, "Payment required");
      assert.ok(body.description.includes("USDC platform fee"));
      assert.ok(body.payment);
      assert.ok(
        body.payment.accepts[0].network.includes("8453") ||
        body.payment.accepts[0].network === "base",
        `Expected network to be Base (8453 / base), got ${body.payment.accepts[0].network}`
      );
      assert.equal(body.payment.accepts[0].asset, "USDC");
    });
  });
});
