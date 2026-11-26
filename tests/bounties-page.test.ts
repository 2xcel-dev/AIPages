import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";
import { renderBountiesPage } from "../src/views/bountiesPage.js";
import { recordUnmetSearch } from "../src/analytics.js";
import { generateSitemapXml } from "../src/views/sitemap.js";

describe("Public Unmet Demand Bounty Board (/bounties)", () => {
  it("renders bounties page with HTTP 200 and valid HTML", async () => {
    const res = await app.request("/bounties");
    assert.equal(res.status, 200);
    const contentType = res.headers.get("content-type") || "";
    assert.match(contentType, /text\/html/);

    const html = await res.text();
    assert.match(html, /Live Autonomous Agent Demands|Build What <span>Agents Want<\/span>/);
    assert.match(html, /Agent Requests/);
    assert.match(html, /Build &amp; Claim Bounty/);
    assert.match(html, /bounty-card/);
  });

  it("strictly contains zero raw emojis in the rendered HTML output", () => {
    const html = renderBountiesPage();
    // Common emoji code points regex (surrogate pairs and emoji symbols)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    const hasEmoji = emojiRegex.test(html);
    assert.equal(hasEmoji, false, "Bounties page HTML must not contain raw emojis");
  });

  it("updates live cards when recordUnmetSearch is invoked", () => {
    const uniqueQuery = `custom-telemetry-test-oracle-${Date.now()}`;
    recordUnmetSearch(uniqueQuery, "test-runner-agent");

    const html = renderBountiesPage();
    assert.ok(html.includes(uniqueQuery), "Rendered bounties page should include recent unmet search");
  });

  it("includes /bounties in the XML sitemap", () => {
    const sitemap = generateSitemapXml([]);
    assert.ok(sitemap.includes("https://aipages.tech/bounties"));
  });
});
