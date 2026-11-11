import { deriveReliability, type Tool } from "../types.js";
import { generateSamplePayload, generateRequestExample } from "./toolPage.js";

/**
 * Generate an authoritative Model Context Protocol (MCP) discovery manifest
 * published at GET /mcp.json and GET /.well-known/mcp.json.
 *
 * Compatible with:
 * - AIPages authoritative manifest parser (parseMcpManifest in src/manifest.ts)
 * - Claude Desktop, Cursor (.cursor/mcp.json), Cline, and standard MCP clients
 */
export function generateMcpManifest(
  tools: Tool[],
  baseUrl: string = "https://aipages.tech",
) {
  const base = baseUrl.replace(/\/+$/, "");
  const activeTools = tools.filter(
    (t) => t.status !== "rejected" && t.status !== "pending",
  );

  const builtInRegistryTools = [
    {
      name: "search_agent_tools",
      namespace: "net.2xcel.aipages.search",
      description:
        "Semantic 3072-dimension vector search across verified AI agent tools and MCP servers in the AIPages registry.",
      transport: "http",
      endpointUrl: `${base}/search`,
      inputSchema: {
        type: "object",
        properties: {
          q: {
            type: "string",
            description:
              "Natural-language task description or capability intent query (e.g. 'parse webpage to markdown', 'audit smart contract on Base').",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 50,
            default: 10,
            description: "Maximum number of matching tools to return.",
          },
        },
        required: ["q"],
      },
    },
    {
      name: "list_directory_tools",
      namespace: "net.2xcel.aipages.list-tools",
      description:
        "List and filter verified tools in the AIPages registry by capability, source provenance, connection protocol, pricing model, or reliability status.",
      transport: "http",
      endpointUrl: `${base}/api/tools`,
      inputSchema: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Keyword filter across name, namespace, description, and capabilities.",
          },
          capability: {
            type: "string",
            description: "Filter by functional capability tag (e.g. 'schema-sanitization', 'web-scraping').",
          },
          reliability: {
            type: "string",
            enum: ["all", "high", "degraded", "failing", "unchecked"],
            description: "Filter by endpoint probe reliability state.",
          },
          connectionType: {
            type: "string",
            enum: ["http", "sse", "stdio", "websocket"],
            description: "Filter by transport protocol.",
          },
          pricingModel: {
            type: "string",
            enum: ["free", "freemium", "paid"],
            description: "Filter by pricing tier.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
      },
    },
    {
      name: "register_agent_tool",
      namespace: "net.2xcel.aipages.submit-tool",
      description:
        "Register a new MCP server or HTTP API tool in the AIPages 3072-dimension vector search index (100% free listing).",
      transport: "http",
      endpointUrl: `${base}/api/tools/submit`,
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Tool identifier slug (e.g. 'solana_state_verifier').",
          },
          description: {
            type: "string",
            description: "Detailed tool description embedded into the 3072-dim Gemini vector index.",
          },
          connectionType: {
            type: "string",
            enum: ["http", "sse", "stdio", "websocket"],
            description: "Transport protocol used by the tool.",
          },
          endpointUrl: {
            type: "string",
            description: "Live HTTPS endpoint URL for remote tools.",
          },
          pricingModel: {
            type: "string",
            enum: ["free", "freemium", "paid"],
            description: "Tool monetization model.",
          },
          costPerCall: {
            type: "number",
            minimum: 0,
            description: "Execution cost per call in USDC on Base Mainnet (0 for free tools).",
          },
          developerAddress: {
            type: "string",
            description: "Base Mainnet wallet address (0x...) for receiving payouts.",
          },
          schema: {
            type: "object",
            description: "JSON Schema describing the tool's input parameters.",
          },
        },
        required: [
          "name",
          "description",
          "connectionType",
          "pricingModel",
          "costPerCall",
          "developerAddress",
        ],
      },
    },
  ];

  const catalogTools = activeTools.map((tool) => {
    const health = deriveReliability(tool);
    const inputSchema =
      tool.schema &&
      typeof tool.schema === "object" &&
      (tool.schema.type || tool.schema.properties)
        ? tool.schema
        : {
            type: "object",
            properties: {
              payload: {
                type: "string",
                description: `Input payload for ${tool.name}`,
              },
            },
          };

    return {
      name: tool.name,
      namespace: tool.namespace,
      description: tool.description,
      transport: tool.connectionType || "http",
      endpointUrl: tool.endpointUrl || `${base}/tool/${tool.namespace}`,
      invokeUrl: `${base}/api/invoke/${tool.namespace}`,
      directInvokeUrl: `${base}/tool/${tool.namespace}`,
      inputSchema,
      capabilities: tool.capabilities ?? [],
      isFirstParty: Boolean(tool.isFirstParty),
      pricing: {
        model: tool.pricing?.model ?? "free",
        costPerCall: tool.pricing?.costPerCall ?? 0,
        currency: "USDC",
        network: "Base Mainnet (eip155:8453)",
      },
      reliability: health.reliability,
      healthStatus: health.healthStatus,
    };
  });

  return {
    schemaVersion: "2026-01",
    name: "aipages-registry",
    version: "1.0.0",
    description:
      "Machine-native discovery registry and 3072-dimension vector search index for autonomous AI agent tools and MCP servers.",
    url: base,
    transport: "http",
    discoveryEndpoints: {
      search: `${base}/search?q={query}&limit=10`,
      tools: `${base}/api/tools`,
      capabilities: `${base}/capabilities?format=json`,
      openapi: `${base}/api/openapi.json`,
      llmsTxt: `${base}/llms.txt`,
      llmsFullTxt: `${base}/llms-full.txt`,
      webMcpActions: `${base}/mcp-actions.json`,
      agentPermissions: `${base}/agent-permissions.json`,
      syndicationFeed: `${base}/api/feed.json`,
    },
    mcpServers: {
      "aipages-registry": {
        name: "AIPages Agent Tool Registry",
        description:
          "3072-dim vector search and HTTP 402 execution gateway for 50+ autonomous agent tools on Base Mainnet.",
        url: `${base}/mcp.json`,
        type: "http",
      },
      "aipages-gateway": {
        name: "AIPages HTTP 402 Execution Gateway",
        description:
          "Syndication and invocation gateway for AIPages autonomous agent tools.",
        url: `${base}/api/feed.json`,
        type: "http",
      },
    },
    tools: [...builtInRegistryTools, ...catalogTools],
  };
}

/**
 * Generate the WebMCP Actions inventory (GET /mcp-actions.json and /.well-known/mcp-actions.json).
 * Documents both Declarative WebMCP HTML form annotations (toolname, tooldescription, toolparamdescription)
 * and Imperative WebMCP registrations (document.modelContext.registerTool) across AIPages.
 */
export function generateWebMcpActionsManifest(
  tools: Tool[],
  baseUrl: string = "https://aipages.tech",
) {
  const base = baseUrl.replace(/\/+$/, "");
  const activeTools = tools.filter(
    (t) => t.status !== "rejected" && t.status !== "pending",
  );

  return {
    spec: "W3C Web Machine Learning Community Group - WebMCP (2026 Draft)",
    site: base,
    updatedAt: new Date().toISOString(),
    modesSupported: ["declarative", "imperative"],
    declarativeForms: [
      {
        toolname: "search_agent_tools",
        tooldescription:
          "Search and filter verified AI agent tools and MCP servers in the AIPages directory by keyword, capability, or reliability.",
        pageUrls: [`${base}/`, `${base}/tool`, `${base}/tools`],
        method: "GET",
        action: `${base}/tools`,
        parameters: [
          {
            name: "q",
            type: "text",
            required: false,
            description: "Natural-language keyword, tool name, namespace, or capability tag to search for",
          },
          {
            name: "capability",
            type: "text",
            required: false,
            description: "Optional capability tag filter",
          },
          {
            name: "reliability",
            type: "text",
            required: false,
            description: "Optional endpoint reliability filter (all, high, degraded, failing, unchecked)",
          },
        ],
      },
      {
        toolname: "filter_tools_by_capability",
        tooldescription:
          "Browse and filter autonomous AI agent tools by functional capability taxonomy.",
        pageUrls: [`${base}/capabilities`],
        method: "GET",
        action: `${base}/tool`,
        parameters: [
          {
            name: "capability",
            type: "text",
            required: true,
            description: "Capability tag (e.g. schema-sanitization, financial-audit, web-scraping, sandbox-execution)",
          },
        ],
      },
      {
        toolname: "register_agent_tool",
        tooldescription:
          "Register a new MCP server or HTTP API tool in the AIPages 3072-dimension vector search index for free.",
        pageUrls: [`${base}/submit`],
        method: "POST",
        action: `${base}/api/tools/submit`,
        parameters: [
          { name: "name", type: "text", required: true, description: "Unique tool slug identifier" },
          {
            name: "connectionType",
            type: "select",
            required: true,
            enum: ["http", "sse", "stdio", "websocket"],
            description: "Transport protocol used by the tool",
          },
          {
            name: "description",
            type: "text",
            required: true,
            description: "Detailed tool description for 3072-dimension semantic vector indexing",
          },
          {
            name: "endpointUrl",
            type: "url",
            required: false,
            description: "Live HTTPS endpoint URL for remote invocations",
          },
          {
            name: "developerAddress",
            type: "text",
            required: true,
            description: "Base Mainnet wallet address (0x...) for receiving USDC/USDT settlements",
          },
          {
            name: "pricingModel",
            type: "select",
            required: true,
            enum: ["paid", "free", "freemium"],
            description: "Pricing model for tool execution",
          },
          {
            name: "costPerCall",
            type: "number",
            required: true,
            description: "Price per invocation in USDC on Base Mainnet (0 for free tools)",
          },
          {
            name: "schema",
            type: "textarea",
            required: false,
            description: "JSON Schema object defining the tool input parameters",
          },
        ],
      },
      {
        toolname: "execute_tool_<tool_name>",
        tooldescription:
          "Execute or test any indexed tool directly from its detail page using a JSON payload (supports free 0-Friction Sandbox Test Mode and Base x402 settlement).",
        pageUrls: [`${base}/tool/{slug}`, `${base}/tools/{slug}`],
        method: "POST",
        action: `${base}/tool/{namespace}?test=true`,
        parameters: [
          {
            name: "payload",
            type: "textarea",
            required: true,
            description: "JSON object matching the tool input schema",
          },
          {
            name: "paymentReceipt",
            type: "text",
            required: false,
            description: "Optional Base Mainnet USDC transaction hash for x402 production settlement",
          },
        ],
      },
    ],
    imperativeTools: [
      {
        name: "search_agent_tools",
        registeredOn: ["/", "/tool", "/tools", "/capabilities", "/submit", "/tool/:slug"],
        description: "Execute semantic 3072-dim vector search over the AIPages tool registry via GET /search.",
        consequentialHint: false,
      },
      {
        name: "list_directory_tools",
        registeredOn: ["/", "/tool", "/tools"],
        description: "Filter and paginate verified tools via GET /api/tools.",
        consequentialHint: false,
      },
      {
        name: "get_mcp_client_config",
        registeredOn: ["/", "/tool", "/tools", "/tool/:slug"],
        description: "Retrieve ready-to-paste MCP client configuration JSON for Claude Desktop, Cursor, or Cline.",
        consequentialHint: false,
      },
      {
        name: "list_tool_capabilities",
        registeredOn: ["/capabilities"],
        description: "Retrieve aggregated functional capability taxonomy and tool counts via GET /capabilities?format=json.",
        consequentialHint: false,
      },
      {
        name: "register_agent_tool",
        registeredOn: ["/submit"],
        description: "Submit a new tool listing to POST /api/tools/submit and index its 3072-dim vector embedding.",
        consequentialHint: true,
      },
      {
        name: "execute_tool_<tool_name>",
        registeredOn: ["/tool/:slug", "/tools/:slug"],
        description: "Invoke the current tool using its authoritative JSON Schema inputSchema via POST /tool/:namespace.",
        consequentialHint: false,
        totalToolsCovered: activeTools.length,
      },
    ],
  };
}

/**
 * Generate machine-readable agent permissions & task policies
 * (GET /agent-permissions.json and GET /.well-known/agent-permissions.json).
 */
export function generateAgentPermissionsManifest(
  baseUrl: string = "https://aipages.tech",
) {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    schemaVersion: "1.0",
    site: base,
    name: "AIPages Autonomous Agent Registry",
    updatedAt: new Date().toISOString(),
    defaultPolicy: "allow",
    authenticationRequiredForDiscovery: false,
    captchaRequired: false,
    guestTaskFlowsAllowed: true,
    crawlers: {
      GPTBot: "allow",
      "OAI-SearchBot": "allow",
      "ChatGPT-User": "allow",
      ClaudeBot: "allow",
      "Claude-Web": "allow",
      "anthropic-ai": "allow",
      PerplexityBot: "allow",
      "Google-Extended": "allow",
      Applebot: "allow",
      "Applebot-Extended": "allow",
      CCBot: "allow",
      "cohere-ai": "allow",
      Bytespider: "disallow",
    },
    allowedActions: [
      {
        action: "semantic_search",
        endpoint: `${base}/search?q={query}&limit={limit}`,
        method: "GET",
        authRequired: false,
        cost: "free",
        rateLimit: "60 requests per 60 seconds per IP",
      },
      {
        action: "list_tools",
        endpoint: `${base}/api/tools`,
        method: "GET",
        authRequired: false,
        cost: "free",
        rateLimit: "120 requests per 60 seconds per IP",
      },
      {
        action: "inspect_tool_schema",
        endpoint: `${base}/api/tools/{namespace}`,
        method: "GET",
        authRequired: false,
        cost: "free",
      },
      {
        action: "read_tool_markdown",
        endpoint: `${base}/tool/{namespace}.md`,
        method: "GET",
        authRequired: false,
        cost: "free",
      },
      {
        action: "register_tool",
        endpoint: `${base}/api/tools/submit`,
        method: "POST",
        authRequired: false,
        cost: "free",
        rateLimit: "15 requests per 60 seconds per IP",
      },
      {
        action: "sandbox_test_tool",
        endpoint: `${base}/tool/{namespace}?test=true`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-playground-test": "true",
          "x-agent-id": "browser-playground",
        },
        authRequired: false,
        cost: "free (0-friction sandbox test for first-party AUS engines)",
      },
      {
        action: "invoke_tool_x402",
        endpoint: `${base}/api/invoke/{namespace}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-ID": "<agent_identifier>",
          "X-Payment": "<base_mainnet_usdc_tx_hash>",
        },
        authRequired: true,
        paymentProtocol: "x402 (HTTP 402 Payment Required)",
        network: "Base Mainnet (eip155:8453)",
        currency: "USDC",
        settlementGuarantee: "atomic_2xx_success_only",
        rateLimit: "60 requests per 60 seconds per agent",
      },
    ],
  };
}

/**
 * Generate standard AI Plugin manifest (GET /.well-known/ai-plugin.json).
 */
export function generateAiPluginManifest(
  baseUrl: string = "https://aipages.tech",
) {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    schema_version: "v1",
    name_for_human: "AIPages Agent Tool Registry",
    name_for_model: "aipages_tool_registry",
    description_for_human:
      "Machine-native discovery registry and 3072-dim vector search index for autonomous AI agent tools and MCP servers.",
    description_for_model:
      "Use AIPages to search, discover, inspect JSON Schemas, register, and invoke verified AI agent tools and Model Context Protocol (MCP) servers. Query GET /search?q=<intent> for semantic vector search, GET /api/tools for filtered listings, GET /api/tools/<namespace> for exact JSON Schemas, POST /api/tools/submit to list a new tool for free, and POST /api/invoke/<namespace> (or POST /tool/<namespace>?test=true for sandbox testing) to execute tools.",
    auth: {
      type: "none",
    },
    api: {
      type: "openapi",
      url: `${base}/api/openapi.json`,
      is_user_authenticated: false,
    },
    logo_url: `${base}/assets/aipages-banner.svg`,
    contact_email: "support@aipages.tech",
    legal_info_url: `${base}/terms`,
  };
}

/**
 * Generate AI-aware robots.txt with explicit directives for search, citation,
 * and autonomous browsing agents plus machine-readable discovery pointers.
 */
export function generateRobotsTxt(
  baseUrl: string = "https://aipages.tech",
): string {
  const base = baseUrl.replace(/\/+$/, "");
  return [
    "# AIPages.tech - AI Crawler & Autonomous Agent Access Policy",
    "# Discovery, schema inspection, and tool registration are 100% open to AI agents.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "# --- AI Search & Citation Crawlers (Explicitly Allowed) ---",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: Claude-Web",
    "Allow: /",
    "",
    "User-agent: anthropic-ai",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    "User-agent: Applebot-Extended",
    "Allow: /",
    "",
    "User-agent: CCBot",
    "Allow: /",
    "",
    "User-agent: cohere-ai",
    "Allow: /",
    "",
    "# --- Unwanted Aggressive Scrapers ---",
    "User-agent: Bytespider",
    "Disallow: /",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    `# LLM Summary Manifest: ${base}/llms.txt`,
    `# LLM Full Reference & Schemas: ${base}/llms-full.txt`,
    `# MCP Server Manifest: ${base}/mcp.json`,
    `# WebMCP Actions Inventory: ${base}/mcp-actions.json`,
    `# Agent Permissions Policy: ${base}/agent-permissions.json`,
    `# OpenAPI 3.1 Specification: ${base}/api/openapi.json`,
    `# JSON Feed v1.1 Syndication: ${base}/api/feed.json`,
    "",
  ].join("\n");
}

/**
 * Generate comprehensive, token-budgeted llms-full.txt Markdown documentation
 * containing full tool schemas, sample payloads, cURL snippets, and WebMCP guides.
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
    "# AIPages - Complete Agent & Developer Reference (llms-full.txt)",
    "",
    "> Machine-native discovery registry, 3072-dimension vector search index, and HTTP 402 execution gateway for autonomous AI agent tools and Model Context Protocol (MCP) servers.",
    "",
    "## 1. Quick-Start Agent Workflows",
    "",
    "### Workflow A: Semantic Tool Discovery (Free, Zero Auth)",
    "```bash",
    `curl -s "${base}/search?q=clean+html+to+markdown&limit=5"`,
    "```",
    "",
    "### Workflow B: Filter Tools by Functional Capability (Free, Zero Auth)",
    "```bash",
    `curl -s "${base}/api/tools?capability=schema-sanitization&active=true"`,
    "```",
    "",
    "### Workflow C: 0-Friction Sandbox Test Execution (Free on First-Party AUS Tools)",
    "```bash",
    `curl -X POST "${base}/tool/net.2xcel.aus.schema-sanitizer?test=true" \\`,
    '  -H "Content-Type: application/json" \\',
    '  -H "x-playground-test: true" \\',
    '  -H "x-agent-id: my-autonomous-agent" \\',
    "  -d '{\"data\":{\"raw\":\"<b>Hello Agent</b>\"},\"rules\":{\"stripHtml\":true}}'",
    "```",
    "",
    "### Workflow D: Production Tool Execution via HTTP 402 (Base Mainnet USDC)",
    "1. Call `POST /api/invoke/:namespace` with `X-Agent-ID`.",
    "2. If the tool is paid and no payment header is attached, AIPages returns `HTTP 402 Payment Required` with the exact Base Mainnet (Chain ID 8453) USDC recipient and amount.",
    "3. Settle the USDC transfer on Base and retry with `X-Payment: <0x_tx_hash>` (or `x-payment-receipt`).",
    "4. Settlement is strictly atomic: you are only charged when the downstream tool returns a `2xx` status code.",
    "",
    "### Workflow E: Register a New Tool in the 3072-Dim Vector Registry (Free)",
    "```bash",
    `curl -X POST "${base}/api/tools/submit" \\`,
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "name": "my_custom_mcp_tool",',
    '    "description": "Executes deterministic code analysis and returns structured AST diagnostics.",',
    '    "connectionType": "http",',
    '    "endpointUrl": "https://api.example.com/v1/analyze",',
    '    "pricingModel": "free",',
    '    "costPerCall": 0,',
    '    "developerAddress": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",',
    '    "schema": {',
    '      "type": "object",',
    '      "properties": { "sourceCode": { "type": "string" } },',
    '      "required": ["sourceCode"]',
    "    }",
    "  }'",
    "```",
    "",
    "## 2. WebMCP Readiness (Browser Agents: Claude in Chrome, Perplexity, Edge Copilot)",
    "",
    "Every HTML page on AIPages supports both **Declarative WebMCP** (`<form toolname=\"...\" tooldescription=\"...\">`) and **Imperative WebMCP** (`document.modelContext.registerTool()`):",
    "- **Homepage & Directory (`/`, `/tools`)**: `search_agent_tools`, `list_directory_tools`, `get_mcp_client_config`",
    "- **Capabilities Index (`/capabilities`)**: `filter_tools_by_capability`, `list_tool_capabilities`",
    "- **Submit Tool Portal (`/submit`)**: `register_agent_tool`",
    "- **Tool Detail & Playground (`/tool/:slug`)**: `execute_tool_<name>` (bound to the tool's exact JSON Schema), `get_tool_mcp_config`, `get_tool_specification`",
    "",
    "## 3. First-Party Agent Utility Services (AUS) Fleet - Full Schemas",
    "",
  ];

  for (const t of firstParty) {
    const sample = generateSamplePayload(t.schema);
    const schemaCompact = JSON.stringify(t.schema ?? { type: "object" });
    const sampleCompact = JSON.stringify(sample);
    const cost =
      t.pricing?.costPerCall !== undefined
        ? `$${t.pricing.costPerCall} USDC`
        : "Paid";

    lines.push(`### ${t.name} (\`${t.namespace}\`)`);
    lines.push(`- **Description**: ${t.description}`);
    lines.push(`- **Page URL**: ${base}/tool/${t.namespace}`);
    lines.push(`- **Markdown Spec**: ${base}/tool/${t.namespace}.md`);
    lines.push(`- **Direct Invoke**: \`POST ${base}/tool/${t.namespace}\` (Sandbox: \`?test=true\`)`);
    lines.push(`- **Protocol**: \`${t.connectionType}\` | **Cost**: ${cost} on Base Mainnet`);
    lines.push(`- **Capabilities**: ${(t.capabilities ?? []).join(", ")}`);
    lines.push(`- **Input JSON Schema**: \`${schemaCompact}\``);
    lines.push(`- **Sample Payload**: \`${sampleCompact}\``);
    lines.push("");
  }

  if (thirdParty.length > 0) {
    lines.push("## 4. Verified Third-Party & Open-Source Catalog Tools");
    lines.push("");
    for (const t of thirdParty) {
      const cost =
        t.pricing?.model === "free"
          ? "Free ($0.00)"
          : `$${t.pricing?.costPerCall ?? 0} USDC`;
      const caps = (t.capabilities ?? []).join(", ") || "general";
      lines.push(
        `- **${t.name}** (\`${t.namespace}\`) - ${t.description} | Protocol: \`${t.connectionType}\` | Cost: ${cost} | Capabilities: ${caps} | Spec: ${base}/tool/${t.namespace}.md`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate a clean, token-budgeted (<1,500 tokens) Markdown representation
 * of a single tool for GET /tool/:slug.md or Accept: text/markdown.
 */
export function generateToolMarkdown(
  tool: Tool,
  baseUrl: string = "https://aipages.tech",
): string {
  const base = baseUrl.replace(/\/+$/, "");
  const health = deriveReliability(tool);
  const example = generateRequestExample(tool);
  const schemaStr = JSON.stringify(tool.schema ?? { type: "object" }, null, 2);

  return [
    `# ${tool.name} (${tool.namespace})`,
    "",
    `> ${tool.description || "Verified autonomous agent tool indexed in AIPages."}`,
    "",
    "## Tool Metadata & Reliability",
    `- **Namespace**: \`${tool.namespace}\``,
    `- **Connection Protocol**: \`${(tool.connectionType || "http").toUpperCase()}\``,
    `- **Endpoint URL**: ${tool.endpointUrl || `${base}/tool/${tool.namespace}`}`,
    `- **Reliability Status**: \`${health.reliability}\` (Health: \`${health.healthStatus}\`${health.lastCheckedIso ? `, Last Checked: ${health.lastCheckedIso}` : ""})`,
    `- **Pricing**: ${example.costDisplay} (Network: Base Mainnet, Chain ID 8453)`,
    `- **Authentication**: ${example.authDescription}`,
    `- **Capabilities**: ${(tool.capabilities ?? []).map((c) => `\`${c}\``).join(", ") || "none"}`,
    "",
    "## Input Parameters JSON Schema",
    "```json",
    schemaStr,
    "```",
    "",
    "## Sample Request Payload",
    "```json",
    example.bodyJson,
    "```",
    "",
    "## cURL Invocation Example",
    "```bash",
    example.curl,
    "```",
    "",
    "## 0-Friction Sandbox Test (No Payment Required for First-Party Tools)",
    "```bash",
    `curl -X POST "${base}/tool/${tool.namespace}?test=true" \\`,
    '  -H "Content-Type: application/json" \\',
    '  -H "x-playground-test: true" \\',
    '  -H "x-agent-id: markdown-agent" \\',
    `  -d '${JSON.stringify(example.body)}'`,
    "```",
    "",
    "## Cursor / Claude Desktop MCP Configuration (.cursor/mcp.json)",
    "```json",
    example.cursorConfig,
    "```",
    "",
  ].join("\n");
}

export interface WebMcpScriptContext {
  pageType: "directory" | "capabilities" | "submit" | "tool" | "legal";
  tool?: Tool;
}

/**
 * Render the client-side Imperative WebMCP (`document.modelContext.registerTool`)
 * script block and `window.verifyWebMcpTools()` discovery helper.
 *
 * Safely checks `if ('modelContext' in document)` before registering tools.
 */
export function renderWebMcpRuntimeScript(ctx: WebMcpScriptContext): string {
  const toolMeta = ctx.tool
    ? {
        namespace: ctx.tool.namespace,
        name: ctx.tool.name,
        safeName: (ctx.tool.name || "tool")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .toLowerCase(),
        description: ctx.tool.description || `Execute ${ctx.tool.name}`,
        schema:
          ctx.tool.schema &&
          typeof ctx.tool.schema === "object" &&
          (ctx.tool.schema.type || ctx.tool.schema.properties)
            ? ctx.tool.schema
            : {
                type: "object",
                properties: {
                  input: { type: "string", description: "Tool input payload" },
                },
              },
        samplePayload: generateSamplePayload(ctx.tool.schema),
      }
    : null;

  return `
  <script id="webmcp-imperative-registration" data-webmcp-runtime="aipages-webmcp-runtime">
    (function() {
      var pageType = ${JSON.stringify(ctx.pageType)};
      var activeTool = ${JSON.stringify(toolMeta).replace(/</g, "\\u003c")};

      async function registerAipagesWebMcpTools() {
        if (typeof document === 'undefined' || !('modelContext' in document) || !document.modelContext) {
          return [];
        }
        var mc = document.modelContext;
        if (typeof mc.registerTool !== 'function') {
          return [];
        }

        var registered = [];

        async function safeRegister(toolDef) {
          try {
            await mc.registerTool(toolDef);
            registered.push(toolDef.name);
          } catch (err) {
            console.warn('[WebMCP] Failed to register tool ' + toolDef.name + ':', err);
          }
        }

        // 1. Universal Tool: Semantic Vector Search
        await safeRegister({
          name: 'search_agent_tools',
          description: 'Search the AIPages 3072-dimension vector registry for autonomous AI agent tools and MCP servers matching a natural-language task intent.',
          inputSchema: {
            type: 'object',
            required: ['q'],
            properties: {
              q: {
                type: 'string',
                description: 'Natural-language capability or task query (e.g. "convert html to clean markdown", "audit base smart contract")'
              },
              limit: {
                type: 'integer',
                minimum: 1,
                maximum: 50,
                default: 10,
                description: 'Maximum number of matching tools to return'
              }
            }
          },
          annotations: { readOnlyHint: true, consequentialHint: false },
          execute: async function(params, opts) {
            var q = encodeURIComponent((params && params.q) || '');
            var limit = (params && params.limit) || 10;
            var res = await fetch('/search?q=' + q + '&limit=' + limit, {
              method: 'GET',
              signal: opts && opts.signal,
              headers: { 'Accept': 'application/json' }
            });
            var data = await res.json();
            return JSON.stringify(data);
          }
        });

        // 2. Directory & Capabilities Filtering Tools
        if (pageType === 'directory' || pageType === 'capabilities') {
          await safeRegister({
            name: 'list_directory_tools',
            description: 'Filter and list verified agent tools in the AIPages catalog by keyword, capability tag, reliability status, connection protocol, or pricing model.',
            inputSchema: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Keyword search across name, namespace, description, and capabilities' },
                capability: { type: 'string', description: 'Capability tag filter (e.g. "schema-sanitization", "financial-audit", "web-scraping")' },
                reliability: { type: 'string', enum: ['all', 'high', 'degraded', 'failing', 'unchecked'], description: 'Endpoint probe reliability state' },
                connectionType: { type: 'string', enum: ['http', 'sse', 'stdio', 'websocket'], description: 'Connection protocol' },
                pricingModel: { type: 'string', enum: ['free', 'freemium', 'paid'], description: 'Pricing model' },
                limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
              }
            },
            annotations: { readOnlyHint: true, consequentialHint: false },
            execute: async function(params, opts) {
              var qs = new URLSearchParams();
              if (params && params.search) qs.set('search', params.search);
              if (params && params.capability) qs.set('capability', params.capability);
              if (params && params.reliability) qs.set('reliability', params.reliability);
              if (params && params.connectionType) qs.set('connectionType', params.connectionType);
              if (params && params.pricingModel) qs.set('pricingModel', params.pricingModel);
              if (params && params.limit) qs.set('limit', String(params.limit));
              var res = await fetch('/api/tools?' + qs.toString(), {
                method: 'GET',
                signal: opts && opts.signal,
                headers: { 'Accept': 'application/json' }
              });
              var data = await res.json();
              return JSON.stringify(data);
            }
          });
        }

        if (pageType === 'capabilities') {
          await safeRegister({
            name: 'list_tool_capabilities',
            description: 'Retrieve the full functional capability taxonomy with tool counts and descriptions from AIPages.',
            inputSchema: {
              type: 'object',
              properties: {
                filter: { type: 'string', description: 'Optional substring to filter capability names or descriptions' }
              }
            },
            annotations: { readOnlyHint: true, consequentialHint: false },
            execute: async function(params, opts) {
              var res = await fetch('/capabilities?format=json', {
                method: 'GET',
                signal: opts && opts.signal,
                headers: { 'Accept': 'application/json' }
              });
              var data = await res.json();
              if (params && params.filter && Array.isArray(data.capabilities)) {
                var f = String(params.filter).toLowerCase();
                data.capabilities = data.capabilities.filter(function(c) {
                  return c.name.toLowerCase().includes(f) || (c.description && c.description.toLowerCase().includes(f));
                });
              }
              return JSON.stringify(data);
            }
          });
        }

        // 3. Submit Tool Page: Imperative Tool Registration
        if (pageType === 'submit') {
          await safeRegister({
            name: 'register_agent_tool',
            description: 'Register a new MCP server or HTTP API tool in the AIPages 3072-dimension vector search index for free.',
            inputSchema: {
              type: 'object',
              required: ['name', 'description', 'connectionType', 'pricingModel', 'costPerCall', 'developerAddress'],
              properties: {
                name: { type: 'string', description: 'Unique tool name slug (e.g. "solana_state_verifier")' },
                description: { type: 'string', description: 'Detailed description used to generate the 3072-dim Gemini vector embedding' },
                connectionType: { type: 'string', enum: ['http', 'sse', 'stdio', 'websocket'], description: 'Connection protocol' },
                endpointUrl: { type: 'string', format: 'uri', description: 'Live HTTPS endpoint URL' },
                pricingModel: { type: 'string', enum: ['free', 'freemium', 'paid'], description: 'Pricing tier' },
                costPerCall: { type: 'number', minimum: 0, description: 'Execution cost in USDC on Base Mainnet (0 for free)' },
                developerAddress: { type: 'string', description: 'Base Mainnet wallet address (0x...)' },
                schema: { type: 'object', description: 'JSON Schema object for tool input parameters' }
              }
            },
            annotations: { consequentialHint: true },
            execute: async function(params, opts) {
              var res = await fetch('/api/tools/submit', {
                method: 'POST',
                signal: opts && opts.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
              });
              var result = await res.json();
              return JSON.stringify({
                success: res.ok,
                status: res.status,
                namespace: result.namespace || null,
                toolUrl: result.namespace ? ('/tool/' + encodeURIComponent(result.namespace)) : null,
                result: result
              });
            }
          });
        }

        // 4. Tool Detail Page: Direct Tool Execution & MCP Client Config
        if (pageType === 'tool' && activeTool) {
          await safeRegister({
            name: 'execute_tool_' + activeTool.safeName,
            description: 'Execute or test ' + activeTool.name + ' (' + activeTool.namespace + ') in 0-Friction Sandbox Mode: ' + activeTool.description,
            inputSchema: activeTool.schema,
            annotations: { consequentialHint: false },
            execute: async function(params, opts) {
              var payload = (params && Object.keys(params).length > 0) ? params : activeTool.samplePayload;
              var res = await fetch('/tool/' + encodeURIComponent(activeTool.namespace) + '?test=true', {
                method: 'POST',
                signal: opts && opts.signal,
                headers: {
                  'Content-Type': 'application/json',
                  'x-playground-test': 'true',
                  'x-agent-id': 'webmcp-browser-agent'
                },
                body: JSON.stringify(payload)
              });
              var data = await res.json().catch(function() { return { status: res.status }; });
              return JSON.stringify({
                success: res.ok,
                status: res.status,
                toolNamespace: activeTool.namespace,
                output: data
              });
            }
          });

          await safeRegister({
            name: 'get_tool_specification',
            description: 'Fetch the complete machine-readable specification, JSON Schema, reliability status, and pricing for ' + activeTool.name + '.',
            inputSchema: {
              type: 'object',
              properties: {}
            },
            annotations: { readOnlyHint: true, consequentialHint: false },
            execute: async function(_params, opts) {
              var res = await fetch('/api/tools/' + encodeURIComponent(activeTool.namespace), {
                method: 'GET',
                signal: opts && opts.signal,
                headers: { 'Accept': 'application/json' }
              });
              var data = await res.json();
              return JSON.stringify(data);
            }
          });
        }

        // 5. MCP Client Configuration Helper
        await safeRegister({
          name: 'get_mcp_client_config',
          description: 'Get ready-to-use Model Context Protocol (MCP) configuration JSON for Claude Desktop, Cursor, or Cline.',
          inputSchema: {
            type: 'object',
            properties: {
              client: {
                type: 'string',
                enum: ['cursor', 'claude', 'cline'],
                default: 'cursor',
                description: 'Target AI coding client'
              }
            }
          },
          annotations: { readOnlyHint: true, consequentialHint: false },
          execute: async function(params) {
            var client = (params && params.client) || 'cursor';
            if (typeof clientConfigs !== 'undefined' && clientConfigs[client]) {
              return clientConfigs[client];
            }
            return JSON.stringify({
              mcpServers: {
                'aipages-registry': {
                  url: window.location.origin + '/mcp.json'
                }
              }
            }, null, 2);
          }
        });

        return registered;
      }

      window.verifyWebMcpTools = async function() {
        if (typeof document !== 'undefined' && 'modelContext' in document && document.modelContext && typeof document.modelContext.getTools === 'function') {
          var tools = await document.modelContext.getTools();
          if (typeof console !== 'undefined' && console.table) {
            console.table(tools.map(function(t) { return { name: t.name, description: t.description }; }));
          }
          return tools;
        }
        return [];
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { registerAipagesWebMcpTools(); });
      } else {
        registerAipagesWebMcpTools();
      }
    })();
  </script>`;
}
