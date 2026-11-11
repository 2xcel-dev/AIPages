#!/usr/bin/env node
/**
 * @aipages/mcp-gateway
 *
 * Unified Model Context Protocol (MCP) Trojan-Horse Gateway for AIPages.
 *
 * One configuration block installs the entire ecosystem:
 *   - aipages_search: Semantic vector discovery across all registered agent tools.
 *   - aipages_execute: On-the-fly execution proxy with zero-friction sandbox mode and Base USDC x402 settlement.
 *   - aipages_list: Instant catalog inspect of high-performance canonical AUS microservices.
 */

import readline from "node:readline";

const AIPAGES_BASE_URL = process.env.AIPAGES_BASE_URL || "https://aipages.tech";
const AIPAGES_API_KEY = process.env.AIPAGES_API_KEY || "";
const AIPAGES_REFERRAL_CODE = process.env.AIPAGES_REFERRAL_CODE || "ref_mcp_gateway";

// Canonical fallback fleet for instant offline execution
const CANONICAL_TOOLS_FALLBACK = [
  {
    namespace: "net.2xcel.aus.browser-stealth",
    name: "Browser Stealth Cloud",
    description: "Headless anti-bot extraction & clean markdown rendering",
    pricing: "$0.15 USDC (Free in sandbox)",
    endpoint: `${AIPAGES_BASE_URL}/tool/net.2xcel.aus.browser-stealth`,
  },
  {
    namespace: "net.2xcel.aus.schema-sanitizer",
    name: "Schema Sanitizer",
    description: "XSS, AST injection & prototype pollution neutralization",
    pricing: "Free / $0.002 USDC",
    endpoint: `${AIPAGES_BASE_URL}/tool/net.2xcel.aus.schema-sanitizer`,
  },
  {
    namespace: "net.2xcel.aus.financial-audit",
    name: "Financial Audit Oracle",
    description: "Cryptographic ledger validation & balance checks on Base",
    pricing: "$0.25 USDC (Free in sandbox)",
    endpoint: `${AIPAGES_BASE_URL}/tool/net.2xcel.aus.financial-audit`,
  },
  {
    namespace: "net.2xcel.aus.media-transcoder",
    name: "Media Transcoder",
    description: "Multimodal audio/image compression & base64 ops",
    pricing: "$0.10 USDC (Free in sandbox)",
    endpoint: `${AIPAGES_BASE_URL}/tool/net.2xcel.aus.media-transcoder`,
  },
];

const TOOLS_MANIFEST = [
  {
    name: "aipages_search",
    description:
      "Search the AIPages machine-native vector registry for active agent tools, MCP servers, and canonical AUS execution microservices. Returns matching tools, their namespaces, pricing, and input schemas.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query or natural language description of what you need the tool to do.",
        },
        limit: {
          type: "number",
          description: "Maximum number of tools to return (default: 5).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "aipages_execute",
    description:
      "Execute any AIPages tool or AUS canonical microservice on-the-fly without installing extra packages. Supports zero-friction free sandbox testing (testMode: true) and Base Mainnet USDC x402 settlement.",
    inputSchema: {
      type: "object",
      properties: {
        namespace: {
          type: "string",
          description: "Tool namespace or slug (e.g. 'net.2xcel.aus.browser-stealth' or 'browser-stealth').",
        },
        parameters: {
          type: "object",
          description: "Input payload matching the tool schema.",
        },
        testMode: {
          type: "boolean",
          description: "Set to true (default) for zero-friction free sandbox testing. Set to false for live on-chain execution.",
        },
        paymentReceipt: {
          type: "string",
          description: "Optional 0x-prefixed Base USDC transaction hash for paid live runs.",
        },
      },
      required: ["namespace", "parameters"],
    },
  },
  {
    name: "aipages_list",
    description: "List the top canonical AUS microservices available on the AIPages network.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional filter category (e.g. 'utility', 'scraping', 'financial').",
        },
      },
    },
  },
];

/**
 * Handle aipages_search tool call
 */
async function handleSearch(args) {
  const query = args?.query || "";
  const limit = args?.limit || 5;

  try {
    const url = `${AIPAGES_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "aipages-mcp-gateway/1.0.0",
      },
    });

    if (resp.ok) {
      const data = await resp.json();
      const results = Array.isArray(data) ? data : (data.results || data.tools || []);
      if (results.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  found: results.length,
                  tools: results.map((t) => ({
                    namespace: t.namespace,
                    name: t.name,
                    description: t.description,
                    pricing: t.pricing || (t.price ? `${t.price} USDC` : "free"),
                    capabilities: t.capabilities || [],
                    executeCommand: `Use tool 'aipages_execute' with namespace '${t.namespace}'`,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  } catch (err) {
    // Network or parse issue; fallback to local fuzzy filter
  }

  // Fallback matching
  const qLower = query.toLowerCase();
  const matched = CANONICAL_TOOLS_FALLBACK.filter(
    (t) =>
      t.name.toLowerCase().includes(qLower) ||
      t.description.toLowerCase().includes(qLower) ||
      t.namespace.toLowerCase().includes(qLower)
  );

  const fallbackResults = matched.length > 0 ? matched : CANONICAL_TOOLS_FALLBACK;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            query,
            found: fallbackResults.length,
            tools: fallbackResults.map((t) => ({
              namespace: t.namespace,
              name: t.name,
              description: t.description,
              pricing: t.pricing,
              executeCommand: `Use tool 'aipages_execute' with namespace '${t.namespace}'`,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Handle aipages_execute tool call
 */
async function handleExecute(args) {
  const namespace = args?.namespace || "";
  const payload = args?.parameters || {};
  const testMode = args?.testMode !== false; // Default to free sandbox mode
  const paymentReceipt = args?.paymentReceipt || "";

  if (!namespace) {
    return {
      isError: true,
      content: [{ type: "text", text: "Error: namespace is required to execute a tool." }],
    };
  }

  // Construct target execution endpoint
  const cleanNamespace = namespace.startsWith("net.2xcel.aus.")
    ? namespace.replace("net.2xcel.aus.", "")
    : namespace;

  const endpoint = `${AIPAGES_BASE_URL}/tool/${cleanNamespace}`;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-agent-id": "aipages-mcp-gateway-agent",
    "x-promoted-by": AIPAGES_REFERRAL_CODE,
  };

  if (testMode) {
    headers["x-playground-test"] = "true";
  } else if (paymentReceipt) {
    headers["x-payment-receipt"] = paymentReceipt;
    headers["X-Payment"] = paymentReceipt;
  }

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const status = resp.status;
    const contentType = resp.headers.get("content-type") || "";
    let resultBody;

    if (contentType.includes("application/json")) {
      resultBody = await resp.json();
    } else {
      resultBody = await resp.text();
    }

    if (status === 402) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Payment Required (HTTP 402)",
                message:
                  "This tool requires on-chain settlement in USDC on Base Mainnet (Chain ID 8453), or testMode: true.",
                challenge: resultBody,
                settlementHelp:
                  "Run with 'testMode: true' for free sandbox testing, or provide a confirmed Base USDC payment receipt in 'paymentReceipt'.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (!resp.ok) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Execution failed with HTTP status ${status}: ${typeof resultBody === "string" ? resultBody : JSON.stringify(resultBody)}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              tool: namespace,
              mode: testMode ? "sandbox (free)" : "production (settled)",
              result: resultBody,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: `Gateway network error executing ${namespace}: ${err.message}` }],
    };
  }
}

/**
 * Handle aipages_list tool call
 */
async function handleList() {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            network: "AIPages Autonomous Tool Fleet",
            directory: `${AIPAGES_BASE_URL}/tools`,
            settlement: "Base Mainnet L2 (USDC)",
            featuredTools: CANONICAL_TOOLS_FALLBACK,
          },
          null,
          2
        ),
      },
    ],
  };
}

// ── JSON-RPC Stdio Server ──────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (err) {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }

  const { id, method, params } = request;

  // Handle Notifications (no response needed)
  if (id === undefined || id === null) {
    if (method === "notifications/initialized") {
      // client initialized acknowledge
    }
    return;
  }

  try {
    switch (method) {
      case "initialize":
        send({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "aipages-mcp-gateway",
              version: "1.0.0",
            },
          },
        });
        break;

      case "ping":
        send({ jsonrpc: "2.0", id, result: {} });
        break;

      case "tools/list":
        send({
          jsonrpc: "2.0",
          id,
          result: {
            tools: TOOLS_MANIFEST,
          },
        });
        break;

      case "tools/call": {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        let response;
        if (toolName === "aipages_search") {
          response = await handleSearch(toolArgs);
        } else if (toolName === "aipages_execute") {
          response = await handleExecute(toolArgs);
        } else if (toolName === "aipages_list") {
          response = await handleList();
        } else {
          send({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
          });
          return;
        }

        send({
          jsonrpc: "2.0",
          id,
          result: response,
        });
        break;
      }

      default:
        send({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        });
        break;
    }
  } catch (err) {
    send({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: `Internal error: ${err.message}`,
      },
    });
  }
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
