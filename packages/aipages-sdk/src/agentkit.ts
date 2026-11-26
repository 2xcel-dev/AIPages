/**
 * Coinbase AgentKit Action Provider for AIPages
 *
 * Enables any autonomous agent built on Coinbase AgentKit / CDP to dynamically
 * discover, inspect, and invoke micro-utilities with native Base USDC settlement.
 */

import { AIPagesClient } from "./client.js";
import type { AIPagesClientOptions, ToolRecord } from "./types.js";

export interface AgentKitAction {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  invoke: (args: Record<string, unknown>) => Promise<string>;
}

export function createAIPagesActionProvider(options: AIPagesClientOptions = {}): {
  name: string;
  actions: AgentKitAction[];
} {
  const client = new AIPagesClient(options);

  return {
    name: "aipages_tool_discovery_and_execution",
    actions: [
      {
        name: "search_aipages_tools",
        description:
          "Semantically search the 3072-dimensional AIPages index for verified MCP servers and AUS tools matching an intent or requirement.",
        schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Natural language description of the tool or task required",
            },
            limit: {
              type: "number",
              description: "Maximum number of tools to return (default 5)",
            },
          },
          required: ["query"],
        },
        invoke: async (args: { query?: string; limit?: number }) => {
          const query = String(args.query || "");
          const limit = Number(args.limit) || 5;
          const tools = await client.search(query, limit);

          if (tools.length === 0) {
            return JSON.stringify({ message: `No tools found matching query: "${query}"` });
          }

          return JSON.stringify({
            tools: tools.map((t: ToolRecord) => ({
              namespace: t.namespace,
              name: t.name,
              description: t.description,
              pricing: t.pricing,
              capabilities: t.capabilities,
              isFirstParty: t.isFirstParty,
            })),
          });
        },
      },
      {
        name: "invoke_aipages_tool",
        description:
          "Execute an AIPages tool by namespace or slug, with automatic x402 Base Mainnet USDC settlement and schema validation.",
        schema: {
          type: "object",
          properties: {
            namespace: {
              type: "string",
              description: "Tool namespace or identifier, e.g. 'net.2xcel.aus.browser-stealth' or 'schema-sanitizer'",
            },
            payload: {
              type: "object",
              description: "Input parameters matching the tool schema",
            },
            playgroundTest: {
              type: "boolean",
              description: "If true, executes in free sandbox test mode without requiring on-chain payment",
            },
          },
          required: ["namespace", "payload"],
        },
        invoke: async (args: {
          namespace?: string;
          payload?: Record<string, unknown>;
          playgroundTest?: boolean;
        }) => {
          const namespace = String(args.namespace || "");
          const payload = args.payload || {};
          const playgroundTest = Boolean(args.playgroundTest);

          try {
            const result = await client.invoke(namespace, payload, { playgroundTest });
            return JSON.stringify(result);
          } catch (err: any) {
            return JSON.stringify({
              error: err.message,
              namespace,
              failed: true,
            });
          }
        },
      },
      {
        name: "list_aipages_canonical_fleet",
        description:
          "Fetch the authoritative list of high-speed first-party Agent Utility Services (AUS) available on AIPages.",
        schema: {
          type: "object",
          properties: {},
        },
        invoke: async () => {
          const tools = await client.listCanonical();
          return JSON.stringify({
            total: tools.length,
            fleet: tools.map((t) => ({
              namespace: t.namespace,
              name: t.name,
              description: t.description,
              pricing: t.pricing,
            })),
          });
        },
      },
    ],
  };
}
