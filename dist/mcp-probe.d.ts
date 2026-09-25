import type { ToolSchema } from "./types.js";
export interface McpLaunchConfig {
    /** Server key from `mcpServers` (e.g. "chrome-devtools"). */
    name: string;
    command?: string;
    args?: string[];
    url?: string;
    type?: string;
    env?: Record<string, string>;
}
export interface McpProbeTool {
    name: string;
    description: string;
    schema: ToolSchema;
}
export interface McpProbeResult {
    serverName: string;
    transport: "stdio" | "http";
    tools: McpProbeTool[];
}
/**
 * Parse an `mcpServers` launch config from a config-style `mcp.json`.
 * Returns an empty array for registry-style manifests (`tools[]`) or garbage.
 */
export declare function parseMcpServersConfig(raw: string): McpLaunchConfig[];
/**
 * Probe a single MCP server and return its live tool schemas, or null on any
 * failure (spawn error, handshake timeout, no tools capability, empty list).
 */
export declare function probeMcpServer(config: McpLaunchConfig, timeoutMs?: number): Promise<McpProbeResult | null>;
//# sourceMappingURL=mcp-probe.d.ts.map