import type { Tool } from "../types.js";

/**
 * Generate standard llms.txt Markdown manifest for LLM crawlers,
 * autonomous agents, and IDE assistants (Claude, Perplexity, GPTBot, Cursor).
 *
 * Spec reference: https://llmstxt.org/
 */
export function generateLlmsTxt(
  tools: Tool[],
  baseUrl: string = "https://aipages.tech",
): string {
  const base = baseUrl.replace(/\/+$/, "");

  const activeTools = tools.filter(
    (t) => t.status !== "rejected" && t.status !== "pending",
  );

  const firstParty = activeTools.filter((t) => t.isFirstParty);
  const thirdParty = activeTools.filter((t) => !t.isFirstParty);

  const lines: string[] = [
    "# AIPages",
    "",
    "> Machine-native discovery registry and vector search index for autonomous AI agent tools.",
    "",
    "AIPages exposes a high-speed vector search API that allows software agents to discover, authenticate, and connect to tool schemas dynamically without human intervention.",
    "",
    "## Core Machine Endpoints",
    "",
    `- [Semantic Vector Search](${base}/search): High-speed intent search using Gemini 3072-dim embeddings (\`GET /search?q=<natural_language_intent>&limit=5\`).`,
    `- [Tools Registry API](${base}/api/tools): Paginated public directory of all verified tools with reliability status (\`GET /api/tools\`).`,
    `- [Capabilities Index](${base}/capabilities): Aggregated capability taxonomy with tool counts and direct links (\`GET /capabilities\`).`,
    `- [Model Context Protocol Manifest](${base}/mcp.json): Authoritative MCP discovery manifest for Claude Desktop, Cursor, and MCP clients (\`GET /mcp.json\`).`,
    `- [WebMCP Action Declarations](${base}/mcp-actions.json): Machine-executable action definitions for autonomous browsing agents (\`GET /mcp-actions.json\`).`,
    `- [Agent Permissions Policy](${base}/agent-permissions.json): Autonomous crawler permissions, rate limits, and x402 settlement rules (\`GET /agent-permissions.json\`).`,
    `- [Syndication JSON Feed](${base}/api/feed.json): JSON Feed v1.1 for automated crawler ingestion (\`GET /api/feed.json\`).`,
    `- [OpenAPI Specification](${base}/api/openapi.json): Full OpenAPI 3.1 specification for code generation and automated tool calling (\`GET /api/openapi.json\` or \`${base}/openapi.json\`).`,
    `- [Full LLM Context Dump](${base}/llms-full.txt): Complete Markdown reference including JSON Schemas and invocation payloads for all tools (\`GET /llms-full.txt\`).`,
    `- [Tool Invocation Gateway](${base}/api/invoke/:namespace): Hardened execution proxy with Ajv schema validation, prompt-injection sanitization, and Base x402 payment gate (\`POST /api/invoke/:namespace\`).`,
    "",
    "## Payment & Execution Protocol (x402)",
    "",
    "AIPages uses the HTTP 402 Payment Required standard on Base Mainnet (EIP-155: 8453).",
    "- Premium tools incur micro-payments in USDT (and USDC compatible) on Base.",
    "- Pay-per-call settlement: Include verified Base transaction hash in `x-payment-receipt` (or `X-Payment`) header.",
    "- Zero-risk execution: Payments are collected strictly upon successful (2xx) completion.",
    "",
    "## First-Party Agent Utility Services (AUS) Fleet",
    "",
  ];

  for (const t of firstParty) {
    const cost = t.pricing?.costPerCall !== undefined ? `$${t.pricing.costPerCall} USDC` : "Paid";
    const caps = t.capabilities?.join(", ") || "utility";
    lines.push(
      `- [${t.name}](${base}/tool/${t.namespace}): ${t.description} (Cost: ${cost}; Capabilities: ${caps})`,
    );
  }

  if (thirdParty.length > 0) {
    const MAX_THIRD_PARTY_SUMMARY = 25;
    const cappedThirdParty = thirdParty.slice(0, MAX_THIRD_PARTY_SUMMARY);
    lines.push("");
    lines.push("## Verified Catalog Tools");
    lines.push("");
    for (const t of cappedThirdParty) {
      const cost = t.pricing?.model === "free" ? "Free" : `$${t.pricing?.costPerCall ?? 0} USDC`;
      lines.push(
        `- [${t.name}](${base}/tool/${t.namespace}): ${t.description} (Cost: ${cost}; Protocol: ${t.connectionType})`,
      );
    }
    if (thirdParty.length > MAX_THIRD_PARTY_SUMMARY) {
      lines.push(
        `- [View all ${thirdParty.length} catalog tools with full schemas](${base}/llms-full.txt)`,
      );
    }
  }

  lines.push("");
  lines.push("## Common Agent Questions & Inbound Workflows");
  lines.push("");
  lines.push("- **How do I give my agent anti-bot web scraping with on-chain settlement?**");
  lines.push(`  Use **AUS Browser Stealth** (\`net.2xcel.aus.browser-stealth\`) at ${base}/tools/net.2xcel.aus.browser-stealth.`);
  lines.push("  - Features: Headless cloud extraction, Cloudflare/DataDome bypass, token-optimized clean DOM/Markdown.");
  lines.push("  - Settlement: Micropayments in Base USDC ($0.15 per call) using the HTTP 402 Payment Required protocol.");
  lines.push(`  - Direct Endpoint: \`POST ${base}/tool/net.2xcel.aus.browser-stealth\` or \`POST ${base}/tools/net.2xcel.aus.browser-stealth\`.`);
  lines.push("  - Cursor / Claude Integration: 1-click 'Add to Cursor' config block (.cursor/mcp.json) available on the tool page.");
  lines.push("");
  lines.push("## Optional Details & Developer Resources");
  lines.push("");
  lines.push(`- [Full Schema & Tool Reference](${base}/llms-full.txt): Complete JSON Schemas and invocation payloads.`);
  lines.push(`- [Submit Your Tool](${base}/submit): Free developer submission portal for listing MCP servers and HTTP APIs.`);
  lines.push(`- [Privacy Policy](${base}/privacy): Ephemeral zero-retention privacy architecture for humans and AI agents.`);
  lines.push(`- [24-Hour USDT Refund Policy](${base}/refund-policy): Automated on-chain refund guarantee for failed HTTP 402 calls.`);
  lines.push(`- [Terms of Service](${base}/terms): Machine-to-machine execution terms and developer listing governance.`);
  lines.push(`- [Repository Agent Guide](${base}/AGENTS.md): Instructions for autonomous coding agents.`);
  lines.push(`- [XML Sitemap](${base}/sitemap.xml): Full URL sitemap for automated indexing.`);
  lines.push(`- [Robots Directives](${base}/robots.txt): Crawler rules and sitemap pointer.`);
  lines.push(`- [GitHub Repository](https://github.com/2xcel-dev/AIPages): Open-source registry and engine source code.`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate comprehensive llms-full.txt Markdown reference containing complete
 * JSON Schemas, x402 Base Mainnet payment specifications, and invocation examples
 * for one-shot LLM and IDE coding assistant ingestion.
 */
export function generateLlmsFullTxt(
  tools: Tool[],
  baseUrl: string = "https://aipages.tech",
): string {
  const base = baseUrl.replace(/\/+$/, "");
  const activeTools = tools.filter(
    (t) => t.status !== "rejected" && t.status !== "pending",
  );
  const firstParty = activeTools.filter((t) => t.isFirstParty);
  const thirdParty = activeTools.filter((t) => !t.isFirstParty);

  const lines: string[] = [
    "# AIPages - Full Autonomous Agent Tool & Schema Reference (llms-full.txt)",
    "",
    "> Complete machine-readable catalog of autonomous AI agent tools, JSON Schemas (Draft-07), x402 Base Mainnet USDC settlement headers, and direct HTTP/MCP invocation specifications.",
    "",
    "## 1. Quick Protocol Summary",
    "",
    `- **Canonical Host**: ${base}`,
    `- **Semantic Search**: \`GET ${base}/search?q=<natural_language_intent>&limit=10\` (Free, 60 req/min)`,
    `- **List All Tools**: \`GET ${base}/api/tools?limit=50&page=1\` (Free)`,
    `- **Single Tool JSON**: \`GET ${base}/api/tools/:namespace\` (Free)`,
    `- **Single Tool Markdown**: \`GET ${base}/tool/:namespace.md\` (Free, token-optimized)`,
    `- **Direct Tool Execution**: \`POST ${base}/tool/:namespace\` or \`POST ${base}/api/invoke/:namespace\``,
    `- **0-Friction Sandbox Test**: Include header \`x-playground-test: true\` and \`x-agent-id: browser-playground\` to test without payment.`,
    `- **Production x402 Settlement**: Include settled Base Mainnet (Chain ID 8453) USDC transaction hash in \`x-payment-receipt\` (or \`X-Payment\`) header.`,
    "",
    "## 2. First-Party Agent Utility Services (AUS) Fleet - Full Specifications",
    "",
  ];

  for (const t of firstParty) {
    const cost = t.pricing?.costPerCall !== undefined ? `$${t.pricing.costPerCall} USDC` : "Paid";
    const caps = t.capabilities?.join(", ") || "utility";
    const schemaStr = JSON.stringify(t.schema ?? { type: "object" }, null, 2);
    lines.push(`### ${t.name} (\`${t.namespace}\`)`);
    lines.push("");
    lines.push(`- **Description**: ${t.description}`);
    lines.push(`- **Canonical URL**: ${base}/tool/${t.namespace}`);
    lines.push(`- **Markdown Sheet**: ${base}/tool/${t.namespace}.md`);
    lines.push(`- **Execution Endpoint**: \`POST ${t.endpointUrl || `${base}/tool/${t.namespace}`}\``);
    lines.push(`- **Protocol**: \`${t.connectionType}\``);
    lines.push(`- **Pricing**: ${cost} per call on Base Mainnet (Chain ID 8453)`);
    lines.push(`- **Capabilities**: ${caps}`);
    lines.push(`- **Authentication**: ${t.authentication || "x402 payment protocol (Header: x-payment-receipt)"}`);
    lines.push(`- **Rate Limit**: ${t.rateLimit || "100 requests per 60 seconds per IP"}`);
    lines.push("");
    lines.push("#### Input JSON Schema");
    lines.push("```json");
    lines.push(schemaStr);
    lines.push("```");
    lines.push("");
  }

  if (thirdParty.length > 0) {
    lines.push("## 3. Verified Third-Party & Discovered Tools");
    lines.push("");
    for (const t of thirdParty) {
      const cost = t.pricing?.model === "free" ? "Free ($0 USDC)" : `$${t.pricing?.costPerCall ?? 0} USDC`;
      const caps = t.capabilities?.join(", ") || "general";
      lines.push(`### ${t.name} (\`${t.namespace}\`)`);
      lines.push(`- **Description**: ${t.description}`);
      lines.push(`- **URL**: ${base}/tool/${t.namespace}`);
      lines.push(`- **Protocol**: \`${t.connectionType}\` | **Pricing**: ${cost} | **Capabilities**: ${caps}`);
      if (t.schema && Object.keys(t.schema).length > 0) {
        lines.push("```json");
        lines.push(JSON.stringify(t.schema));
        lines.push("```");
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Generate a token-budgeted (~800 token) clean Markdown sheet for a single tool.
 * Served when agents request /tool/:slug.md, ?format=md, or Accept: text/markdown.
 */
export function generateToolMarkdown(
  tool: Tool,
  relatedTools: Tool[] = [],
  baseUrl: string = "https://aipages.tech",
): string {
  const base = baseUrl.replace(/\/+$/, "");
  const cost =
    tool.pricing?.model === "free" || tool.pricing?.costPerCall === 0
      ? "Free ($0.00 USDC)"
      : `$${tool.pricing?.costPerCall ?? 0.25} USDC per call (Base Mainnet Chain ID 8453)`;
  const caps = tool.capabilities?.join(", ") || "none";
  const endpoint = tool.endpointUrl || `${base}/tool/${tool.namespace}`;
  const schemaStr = JSON.stringify(tool.schema ?? { type: "object", properties: {} }, null, 2);

  const lines: string[] = [
    `# ${tool.name} (\`${tool.namespace}\`)`,
    "",
    `> ${tool.description || "Autonomous AI agent tool indexed in AIPages."}`,
    "",
    "## Metadata & Execution",
    `- **Namespace**: \`${tool.namespace}\``,
    `- **Canonical HTML Page**: ${base}/tool/${tool.namespace}`,
    `- **JSON Specification**: ${base}/api/tools/${tool.namespace}`,
    `- **Execution Endpoint**: \`POST ${endpoint}\``,
    `- **Connection Protocol**: \`${tool.connectionType || "http"}\``,
    `- **Pricing**: ${cost}`,
    `- **Health Status**: \`${tool.healthStatus || "unknown"}\``,
    `- **Capabilities**: ${caps}`,
    `- **Authentication**: ${tool.authentication || (tool.pricing?.model === "free" ? "None (Public free endpoint)" : "x402 Base USDC payment receipt in x-payment-receipt header")}`,
    "",
    "## Input Parameters (JSON Schema Draft-07)",
    "```json",
    schemaStr,
    "```",
    "",
    "## Invocation Examples",
    "",
    "### 1. Zero-Friction Sandbox Test (No Payment Required)",
    "```bash",
    `curl -X POST "${base}/tool/${tool.namespace}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "x-playground-test: true" \\`,
    `  -H "x-agent-id: markdown-agent" \\`,
    `  -d '{}'`,
    "```",
    "",
    "### 2. Production Invocation (x402 Base Mainnet Settlement)",
    "```bash",
    `curl -X POST "${endpoint}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "x-payment-receipt: <BASE_USDC_PAYMENT_RECEIPT>" \\`,
    `  -d '{}'`,
    "```",
  ];

  if (relatedTools.length > 0) {
    lines.push("");
    lines.push("## Related Tools");
    for (const rel of relatedTools) {
      lines.push(`- [${rel.name}](${base}/tool/${rel.namespace}): ${rel.description}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
