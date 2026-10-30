/**
 * Generate standard llms.txt Markdown manifest for LLM crawlers,
 * autonomous agents, and IDE assistants (Claude, Perplexity, GPTBot, Cursor).
 *
 * Spec reference: https://llmstxt.org/
 */
export function generateLlmsTxt(tools, baseUrl = "https://aipages.tech") {
    const base = baseUrl.replace(/\/+$/, "");
    const activeTools = tools.filter((t) => t.status !== "rejected" && t.status !== "pending");
    const firstParty = activeTools.filter((t) => t.isFirstParty);
    const thirdParty = activeTools.filter((t) => !t.isFirstParty);
    const lines = [
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
        `- [Syndication JSON Feed](${base}/api/feed.json): JSON Feed v1.1 for automated crawler ingestion (\`GET /api/feed.json\`).`,
        `- [OpenAPI Specification](${base}/openapi.json): Full OpenAPI 3.1 specification for code generation and automated tool calling (\`GET /openapi.json\`).`,
        `- [Tool Invocation Gateway](${base}/api/invoke/:namespace): Hardened execution proxy with Ajv schema validation, prompt-injection sanitization, and Base x402 payment gate (\`POST /api/invoke/:namespace\`).`,
        "",
        "## Payment & Execution Protocol (x402)",
        "",
        "AIPages uses the HTTP 402 Payment Required standard on Base Mainnet (EIP-155: 8453).",
        "- Premium tools incur micro-payments in USDC on Base.",
        "- Pay-per-call settlement: Include verified Base transaction hash in `x-payment-receipt` (or `X-Payment`) header.",
        "- Zero-risk execution: Payments are collected strictly upon successful (2xx) completion.",
        "",
        "## First-Party Agent Utility Services (AUS) Fleet",
        "",
    ];
    for (const t of firstParty) {
        const cost = t.pricing?.costPerCall !== undefined ? `$${t.pricing.costPerCall} USDC` : "Paid";
        const caps = t.capabilities?.join(", ") || "utility";
        lines.push(`- [${t.name}](${base}/tool/${t.namespace}): ${t.description} (Cost: ${cost}; Capabilities: ${caps})`);
    }
    if (thirdParty.length > 0) {
        lines.push("");
        lines.push("## Verified Catalog Tools");
        lines.push("");
        for (const t of thirdParty) {
            const cost = t.pricing?.model === "free" ? "Free" : `$${t.pricing?.costPerCall ?? 0} USDC`;
            lines.push(`- [${t.name}](${base}/tool/${t.namespace}): ${t.description} (Cost: ${cost}; Protocol: ${t.connectionType})`);
        }
    }
    lines.push("");
    lines.push("## Optional Details & Developer Resources");
    lines.push("");
    lines.push(`- [XML Sitemap](${base}/sitemap.xml): Full URL sitemap for automated indexing.`);
    lines.push(`- [Robots Directives](${base}/robots.txt): Crawler rules and sitemap pointer.`);
    lines.push(`- [GitHub Repository](https://github.com/2xcel-dev/AIPages): Open-source registry and engine source code.`);
    lines.push("");
    return lines.join("\n");
}
//# sourceMappingURL=llmsTxt.js.map