import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  app,
  ROBOTS_TXT,
  AGENT_PERMISSIONS_MANIFEST,
  MCP_ACTIONS_MANIFEST,
  isAiOrSearchCrawler,
} from "../src/index.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import {
  generateLlmsTxt,
  generateLlmsFullTxt,
  generateToolMarkdown,
} from "../src/views/llmsTxt.js";
import { renderDirectoryPage } from "../src/views/directoryPage.js";
import {
  getCapabilityIndex,
  renderCapabilitiesPage,
  generateCapabilitiesMarkdown,
} from "../src/views/capabilitiesPage.js";
import { renderToolPage } from "../src/views/toolPage.js";
import { openapi } from "../src/openapi.js";
import { metrics } from "../src/metrics.js";
import type { Tool } from "../src/types.js";

describe("AEO Foundations Audit & Infrastructure Verification Suite", () => {
  const sampleTools: Tool[] = CANONICAL_AUS_TOOLS.map((t) => ({
    ...t,
    updatedAt: new Date(),
  }));

  describe("Layer 1: Discovery Layer (robots.txt, llms.txt, llms-full.txt, AGENTS.md, AI Crawler Root Negotiation)", () => {
    it("GET /robots.txt explicitly allows AI search & training crawlers and blocks Bytespider", async () => {
      const res = await app.request("http://localhost/robots.txt");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/plain"));

      const text = await res.text();
      assert.equal(text, ROBOTS_TXT);
      assert.ok(text.includes("User-agent: GPTBot\nAllow: /"));
      assert.ok(text.includes("User-agent: OAI-SearchBot\nAllow: /"));
      assert.ok(text.includes("User-agent: ClaudeBot\nAllow: /"));
      assert.ok(text.includes("User-agent: PerplexityBot\nAllow: /"));
      assert.ok(text.includes("User-agent: Google-Extended\nAllow: /"));
      assert.ok(text.includes("User-agent: Applebot-Extended\nAllow: /"));
      assert.ok(text.includes("User-agent: Bytespider\nDisallow: /"));
      assert.ok(text.includes("Sitemap: https://aipages.tech/sitemap.xml"));
      assert.ok(text.includes("https://aipages.tech/llms.txt"));
      assert.ok(text.includes("https://aipages.tech/llms-full.txt"));
    });

    it("GET / serves full SSR HTML directory to AI crawlers sending Accept: */*", async () => {
      const crawlers = [
        "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
        "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
        "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
        "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
      ];

      for (const ua of crawlers) {
        assert.equal(isAiOrSearchCrawler(ua), true);
        const res = await app.request("http://localhost/", {
          headers: {
            Accept: "*/*",
            "User-Agent": ua,
          },
        });
        assert.equal(res.status, 200);
        assert.ok(
          res.headers.get("content-type")?.includes("text/html"),
          `Expected HTML for crawler ${ua}`,
        );
        const html = await res.text();
        assert.ok(html.includes('<h2 class="section-title">AI Agent Tool Directory</h2>'));
        assert.ok(html.includes("/tool/net.2xcel.aus.schema-sanitizer"));
      }
    });

    it("records AI crawler visits in Prometheus metrics (GET /metrics)", async () => {
      await app.request("http://localhost/llms.txt", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PerplexityBot/1.0)" },
      });

      const prom = metrics.formatPrometheus(16);
      assert.ok(prom.includes("aipages_ai_crawler_requests_total"));
      assert.ok(prom.includes('bot="PerplexityBot"'));
    });

    it("GET /llms.txt and GET /llms-full.txt return 200 text/markdown with zero dead links", async () => {
      const resLlms = await app.request("http://localhost/llms.txt");
      assert.equal(resLlms.status, 200);
      assert.ok(resLlms.headers.get("content-type")?.includes("text/markdown"));
      const llmsText = await resLlms.text();
      assert.ok(llmsText.includes("/mcp.json"));
      assert.ok(llmsText.includes("/openapi.json"));
      assert.ok(llmsText.includes("/llms-full.txt"));

      const resFull = await app.request("http://localhost/llms-full.txt");
      assert.equal(resFull.status, 200);
      assert.ok(resFull.headers.get("content-type")?.includes("text/markdown"));
      const fullText = await resFull.text();
      assert.ok(fullText.includes("# AIPages - Full Autonomous Agent Tool & Schema Reference"));
      assert.ok(fullText.includes("#### Input JSON Schema"));
      assert.ok(fullText.includes("net.2xcel.aus.schema-sanitizer"));
    });

    it("caps third-party tools in generateLlmsTxt to protect token budget", () => {
      const manyThirdParty: Tool[] = Array.from({ length: 40 }, (_, i) => ({
        namespace: `io.github.test.tool-${i}`,
        name: `test_tool_${i}`,
        description: `Third party tool number ${i}`,
        connectionType: "http",
        healthStatus: "active",
        status: "active",
        isFirstParty: false,
        pricing: { model: "free", costPerCall: 0 },
        updatedAt: new Date(),
      }));

      const txt = generateLlmsTxt([...sampleTools, ...manyThirdParty]);
      assert.ok(txt.includes("test_tool_0"));
      assert.ok(txt.includes("test_tool_24"));
      assert.ok(!txt.includes("test_tool_25"));
      assert.ok(txt.includes("View all 40 catalog tools with full schemas"));
    });

    it("GET /AGENTS.md and GET /openapi.json return 200 with production server URL", async () => {
      const resAgents = await app.request("http://localhost/AGENTS.md");
      assert.equal(resAgents.status, 200);
      assert.ok(resAgents.headers.get("content-type")?.includes("text/markdown"));
      const agentsMd = await resAgents.text();
      assert.ok(agentsMd.includes("AGENTS.md"));
      assert.ok(agentsMd.includes("https://aipages.tech/llms-full.txt"));

      const resOpenApi = await app.request("http://localhost/openapi.json");
      assert.equal(resOpenApi.status, 200);
      const spec = await resOpenApi.json();
      assert.equal(spec.openapi, "3.1.0");
      assert.equal(openapi.servers[0].url, "https://aipages.tech");
    });
  });

  describe("Layer 2: Parsability Layer (Markdown Endpoints, Heading Hierarchy, Canonical & Schema.org)", () => {
    it("serves single-tool Markdown at GET /tool/:slug.md and with Accept: text/markdown", async () => {
      const resMdExt = await app.request("http://localhost/tool/net.2xcel.aus.schema-sanitizer.md");
      assert.equal(resMdExt.status, 200);
      assert.ok(resMdExt.headers.get("content-type")?.includes("text/markdown"));
      const mdText = await resMdExt.text();
      assert.ok(mdText.startsWith("# schema_sanitizer (`net.2xcel.aus.schema-sanitizer`)"));
      assert.ok(mdText.includes("## Input Parameters (JSON Schema Draft-07)"));
      assert.ok(mdText.includes("x-playground-test: true"));

      const resAcceptMd = await app.request("http://localhost/tool/net.2xcel.aus.financial-audit", {
        headers: { Accept: "text/markdown" },
      });
      assert.equal(resAcceptMd.status, 200);
      assert.ok(resAcceptMd.headers.get("content-type")?.includes("text/markdown"));
    });

    it("serves capabilities Markdown at GET /capabilities?format=md", async () => {
      const res = await app.request("http://localhost/capabilities?format=md");
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("text/markdown"));
      const md = await res.text();
      assert.ok(md.startsWith("# AIPages Functional Capabilities Index"));
      assert.ok(md.includes("schema-sanitization"));
    });

    it("enforces semantic H1 -> H2 -> H3 hierarchy, WebSite SearchAction JSON-LD, and canonical link on directory page", () => {
      const html = renderDirectoryPage(sampleTools.slice(0, 4), sampleTools.length, {
        availableCapabilities: Array.from({ length: 40 }, (_, i) => `cap-${i}`),
      });

      assert.ok(html.includes('<link rel="canonical" href="https://aipages.tech/tool">'));
      assert.ok(html.includes('<meta name="description"'));
      assert.ok(html.includes('"@type":"WebSite"') || html.includes('"@type": "WebSite"'));
      assert.ok(html.includes('"@type":"SearchAction"') || html.includes('"@type": "SearchAction"'));
      assert.ok(html.includes('<h2 class="sr-only">Registered Autonomous Agent Tools</h2>'));
      assert.ok(html.includes("+16 more &rarr;"));
    });

    it("includes HowTo and FAQPage JSON-LD schema plus canonical and markdown alternate links on tool pages", () => {
      const html = renderToolPage(sampleTools[0], sampleTools.slice(1, 3));

      assert.ok(
        html.includes('<link rel="canonical" href="https://aipages.tech/tool/net.2xcel.aus.schema-sanitizer">'),
      );
      assert.ok(
        html.includes('<link rel="alternate" type="text/markdown"'),
      );
      assert.ok(html.includes('id="aeo-howto-faq-schema"'));
      assert.ok(html.includes('"@type": "HowTo"'));
      assert.ok(html.includes('"@type": "FAQPage"'));
    });

    it("contains zero raw emoji icons in capabilitiesPage HTML", () => {
      const caps = getCapabilityIndex(sampleTools);
      const html = renderCapabilitiesPage(caps, sampleTools.length);
      assert.ok(!html.includes("🏷️"));
      assert.ok(!html.includes("🔍"));
      assert.ok(html.includes('<link rel="canonical" href="https://aipages.tech/capabilities">'));
    });
  });

  describe("Layer 3: Capability Layer (mcp.json, agent-permissions.json, mcp-actions.json, declarative WebMCP forms)", () => {
    it("GET /mcp.json and GET /.well-known/mcp.json return valid MCP discovery manifest", async () => {
      const res = await app.request("http://localhost/mcp.json");
      assert.equal(res.status, 200);
      const manifest = await res.json();
      assert.equal(manifest.name, "aipages-registry");
      assert.ok(manifest.mcpServers["aipages-registry"] || manifest.mcpServers["aipages-gateway"]);
      assert.ok(Array.isArray(manifest.tools));
      assert.ok(manifest.tools.length >= 16);
    });

    it("GET /agent-permissions.json declares crawler access, rate limits, and x402 settlement policy", async () => {
      const res = await app.request("http://localhost/agent-permissions.json");
      assert.equal(res.status, 200);
      const perms = await res.json();
      assert.equal(perms.defaultPolicy, "allow");
      assert.ok(perms.crawlers.allow.includes("GPTBot"));
      assert.ok(perms.crawlers.disallow.includes("Bytespider"));
      assert.equal(perms.site, AGENT_PERMISSIONS_MANIFEST.site);
    });

    it("GET /mcp-actions.json declares structured WebMCP actions matching HTML data-mcp-action forms", async () => {
      const res = await app.request("http://localhost/mcp-actions.json");
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.actions.length, MCP_ACTIONS_MANIFEST.actions.length);

      const dirHtml = renderDirectoryPage(sampleTools.slice(0, 2), 2);
      assert.ok(dirHtml.includes('data-mcp-action="search-tools"'));

      const toolHtml = renderToolPage(sampleTools[0]);
      assert.ok(toolHtml.includes('data-mcp-action="invoke-tool"'));
      assert.ok(toolHtml.includes('data-mcp-namespace="net.2xcel.aus.schema-sanitizer"'));
    });
  });
});
