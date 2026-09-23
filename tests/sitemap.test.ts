import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createStore, type ToolStore } from "../src/db.js";
import { type Tool } from "../src/types.js";
import { generateSitemapXml, escapeXml } from "../src/views/sitemap.js";
import { renderToolPage, renderNotFoundPage, findToolBySlug } from "../src/views/toolPage.js";
import { renderDirectoryPage } from "../src/views/directoryPage.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";

describe("Task 9: XML Sitemap & Discovery (/sitemap.xml & /robots.txt)", () => {
  let store: ToolStore;
  let app: Hono;

  const now = new Date("2026-09-23T08:00:00.000Z");
  const yesterday = new Date("2026-09-22T08:00:00.000Z");

  const sampleToolA: Tool = {
    namespace: "net.2xcel.test.sample-a",
    name: "sample_tool_a",
    description: "Sample tool A for sitemap testing.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/a",
    healthStatus: "active",
    lastChecked: now,
    status: "active",
    capabilities: ["testing", "sitemap"],
    updatedAt: now,
  };

  const sampleToolB: Tool = {
    namespace: "net.2xcel.test.sample-b",
    name: "sample_tool_b",
    description: "Sample tool B with special characters in description & query.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/b?param1=x&param2=y",
    healthStatus: "unknown",
    status: "active",
    capabilities: ["validation"],
    updatedAt: yesterday,
  };

  const pendingTool: Tool = {
    namespace: "net.2xcel.test.pending-tool",
    name: "pending_tool",
    description: "Pending submission tool that should not appear in public sitemap.",
    connectionType: "http",
    healthStatus: "unknown",
    status: "pending",
    updatedAt: now,
  };

  before(async () => {
    store = await createStore();
    await store.upsert(sampleToolA);
    await store.upsert(sampleToolB);
    await store.upsert(pendingTool);

    // Also populate canonical AUS tools
    for (const aus of CANONICAL_AUS_TOOLS) {
      await store.upsert({
        ...aus,
        updatedAt: now,
      });
    }

    app = new Hono();

    app.get("/sitemap.xml", async (c) => {
      const allTools = await store.list();
      const xml = generateSitemapXml(allTools);
      c.header("Content-Type", "application/xml; charset=utf-8");
      c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
      return c.body(xml);
    });

    app.get("/robots.txt", (c) => {
      const robots = "User-agent: *\nAllow: /\n\nSitemap: https://aipages.2xcel.net/sitemap.xml\n";
      c.header("Content-Type", "text/plain; charset=utf-8");
      c.header("Cache-Control", "public, max-age=86400");
      return c.text(robots);
    });

    app.get("/tools/:slug", async (c) => {
      const slug = c.req.param("slug");
      if (!slug) return c.html(renderNotFoundPage(""), 404);
      const tool = await findToolBySlug(store, slug);
      if (!tool) return c.html(renderNotFoundPage(slug), 404);
      return c.html(renderToolPage(tool));
    });

    app.get("/tools", async (c) => {
      const tools = await store.list();
      return c.html(renderDirectoryPage(tools, tools.length));
    });
  });

  describe("XML Generation Unit Tests (generateSitemapXml)", () => {
    it("generates well-formed XML with standard urlset namespace", () => {
      const xml = generateSitemapXml([sampleToolA, sampleToolB]);

      assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
      assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
      assert.ok(xml.endsWith("</urlset>"));
    });

    it("includes homepage and tools directory with high priority and daily changefreq", () => {
      const xml = generateSitemapXml([sampleToolA]);

      assert.ok(xml.includes("<loc>https://aipages.2xcel.net/</loc>"));
      assert.ok(xml.includes("<changefreq>daily</changefreq>"));
      assert.ok(xml.includes("<priority>1.0</priority>"));

      assert.ok(xml.includes("<loc>https://aipages.2xcel.net/tools</loc>"));
      assert.ok(xml.includes("<priority>0.9</priority>"));
    });

    it("includes all public active tools with encoded URL and lastmod timestamp", () => {
      const xml = generateSitemapXml([sampleToolA, sampleToolB]);

      assert.ok(
        xml.includes("<loc>https://aipages.2xcel.net/tools/net.2xcel.test.sample-a</loc>"),
      );
      assert.ok(
        xml.includes("<loc>https://aipages.2xcel.net/tools/net.2xcel.test.sample-b</loc>"),
      );
      assert.ok(xml.includes("<lastmod>2026-09-23T08:00:00.000Z</lastmod>"));
      assert.ok(xml.includes("<lastmod>2026-09-22T08:00:00.000Z</lastmod>"));
      assert.ok(xml.includes("<priority>0.8</priority>"));
      assert.ok(xml.includes("<changefreq>weekly</changefreq>"));
    });

    it("excludes non-public tools (e.g. status: pending or rejected)", () => {
      const xml = generateSitemapXml([sampleToolA, pendingTool]);

      assert.ok(xml.includes("net.2xcel.test.sample-a"));
      assert.ok(!xml.includes("net.2xcel.test.pending-tool"));
    });

    it("escapes XML special characters safely", () => {
      assert.equal(escapeXml("a & b < c > d \"e\" 'f'"), "a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;");
    });
  });

  describe("HTTP Integration Tests (GET /sitemap.xml & /robots.txt)", () => {
    it("GET /sitemap.xml returns 200 with application/xml and valid sitemap entries", async () => {
      const res = await app.request("http://localhost/sitemap.xml");
      assert.equal(res.status, 200);

      const contentType = res.headers.get("content-type") ?? "";
      assert.ok(contentType.includes("application/xml"), `Expected application/xml, got ${contentType}`);

      const body = await res.text();
      assert.ok(body.includes('<?xml version="1.0" encoding="UTF-8"?>'));
      assert.ok(body.includes("<loc>https://aipages.2xcel.net/</loc>"));
      assert.ok(body.includes("<loc>https://aipages.2xcel.net/tools</loc>"));

      // All 8 canonical AUS tools must be present
      for (const aus of CANONICAL_AUS_TOOLS) {
        assert.ok(
          body.includes(`<loc>https://aipages.2xcel.net/tools/${aus.namespace}</loc>`),
          `Expected sitemap to include canonical AUS tool ${aus.namespace}`,
        );
      }
    });

    it("GET /robots.txt returns 200 with text/plain and points to /sitemap.xml", async () => {
      const res = await app.request("http://localhost/robots.txt");
      assert.equal(res.status, 200);

      const contentType = res.headers.get("content-type") ?? "";
      assert.ok(contentType.includes("text/plain"), `Expected text/plain, got ${contentType}`);

      const body = await res.text();
      assert.ok(body.includes("User-agent: *"));
      assert.ok(body.includes("Allow: /"));
      assert.ok(body.includes("Sitemap: https://aipages.2xcel.net/sitemap.xml"));
    });

    it("HTML pages include discovery link tag in head for sitemap", async () => {
      const dirRes = await app.request("http://localhost/tools");
      assert.equal(dirRes.status, 200);
      const dirHtml = await dirRes.text();
      assert.ok(
        dirHtml.includes('<link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">'),
        "Directory page must link to /sitemap.xml",
      );

      const toolRes = await app.request("http://localhost/tools/sample_tool_a");
      assert.equal(toolRes.status, 200);
      const toolHtml = await toolRes.text();
      assert.ok(
        toolHtml.includes('<link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">'),
        "Tool detail page must link to /sitemap.xml",
      );
    });
  });
});
