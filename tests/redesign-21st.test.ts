import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { app } from "../src/index.js";
import { renderDirectoryPage } from "../src/views/directoryPage.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import { DISCOVERED_GEMINI_TOOLS } from "../src/data/discoveredTools.js";
import type { Tool } from "../src/types.js";

describe("UI/UX Pro Max & 21st.dev MCP Redesign Verification Suite", () => {
  it("renders all 7 21st.dev MCP component sections and Google Flow artworks in renderDirectoryPage", () => {
    const sampleTools = [
      ...(CANONICAL_AUS_TOOLS as unknown as Tool[]),
      ...(DISCOVERED_GEMINI_TOOLS as unknown as Tool[]),
    ];
    const html = renderDirectoryPage(sampleTools, sampleTools.length, {
      baseUrl: "/",
    });

    // 1. #8948 SaaS Hero + USDT settlement
    assert.ok(html.includes("The API Marketplace <span>Built for AI Agents</span>"), "Missing SaaS Hero headline");
    assert.ok(html.includes("instant USDT micro-payments on Base Mainnet"), "Missing USDT subheadline");

    // 2. #29870 Stats Section
    assert.ok(html.includes("class=\"stats-block-grid\""), "Missing 21st.dev #29870 stats grid");
    assert.ok(html.includes("0.00 USDT"), "Missing 0.00 USDT metric");

    // 3. #10025 Elegant Split-Panel Carousel with 7 Google Flow slides
    assert.ok(html.includes("id=\"flow-showcase\""), "Missing 21st.dev #10025 carousel showcase");
    assert.ok(html.includes("/assets/flow/flow-01-hero-marketplace.jpg"), "Missing Flow slide 1");
    assert.ok(html.includes("/assets/flow/flow-07-scale-workflows.jpg"), "Missing Flow slide 7");

    // 4. Category Tabs + #5115 Pricing Cards
    assert.ok(html.includes("class=\"category-tabs-bar\""), "Missing 4-tab category switcher");
    assert.ok(html.includes("Core AUS Utilities"), "Missing Core AUS Utilities tab");
    assert.ok(html.includes("AUS Mesh, Ledger &amp; Motion"), "Missing Extended AUS tab");
    assert.ok(html.includes("Open Agent Frameworks"), "Missing Open Agent Frameworks tab");

    // 5. #9309 Split Feature Showcase
    assert.ok(html.includes("id=\"protocol\" class=\"showcase-section\""), "Missing 21st.dev #9309 feature showcase section");
    assert.ok(html.includes("Agent JSON Feed"), "Missing showcase tab");

    // 6. #31986 FAQ Accordion Section
    assert.ok(html.includes("class=\"faq-section\""), "Missing 21st.dev #31986 FAQ section");
    assert.ok(html.includes("Frequently Asked Questions"), "Missing FAQ heading");

    // 7. #7264 Minimal Footer + Embedded Agent JSON
    assert.ok(html.includes("class=\"minimal-footer-frame\""), "Missing 21st.dev #7264 minimal footer");
    assert.ok(html.includes("id=\"aipages-agent-manifest\""), "Missing inline application/agent+json manifest");
  });

  it("serves authorized legal and developer pages (/privacy, /refund-policy, /terms, /submit)", async () => {
    const routes = [
      { path: "/privacy", expected: "Privacy Policy" },
      { path: "/refund-policy", expected: "USDT Refund Policy" },
      { path: "/terms", expected: "Terms of Service" },
      { path: "/submit", expected: "List Your Tool in the" },
    ];

    for (const r of routes) {
      const res = await app.request(r.path, { headers: { Accept: "text/html" } });
      assert.equal(res.status, 200, `Expected 200 on ${r.path}`);
      const html = await res.text();
      assert.ok(html.includes(r.expected), `Expected '${r.expected}' on ${r.path}`);
      assert.ok(html.includes("application/ld+json"), `Expected JSON-LD schema on ${r.path}`);
    }
  });

  it("serves Google Flow promotional carousel artwork from /assets/flow/:file", async () => {
    const res = await app.request("/assets/flow/flow-01-hero-marketplace.jpg");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/jpeg");
  });

  it("enforces zero em dashes in newly redesigned view templates", () => {
    const files = [
      "src/views/sharedLayout.ts",
      "src/views/directoryPage.ts",
      "src/views/capabilitiesPage.ts",
      "src/views/legalPages.ts",
    ];
    for (const rel of files) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
      assert.ok(!content.includes("—") && !content.includes("&mdash;"), `Found forbidden em dash in ${rel}`);
    }
  });
});
