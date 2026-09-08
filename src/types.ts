/**
 * Core data model for the `tools` collection in MongoDB Atlas.
 */

/**
 * A JSON Schema describing a tool's input parameters.
 *
 * The two typed hints (`type`/`properties`/`required`) exist for ergonomics,
 * but the schema is stored faithfully — `$ref`, `items`, `enum`, `anyOf`,
 * nested schemas, and any other JSON Schema keyword are preserved via the
 * index signature. Schemas are NEVER inferred or guessed by the crawler;
 * they come verbatim from an `mcp.json` or OpenAPI manifest.
 */
export interface ToolSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [keyword: string]: unknown;
}

export type ConnectionType = "sse" | "stdio" | "http" | "websocket";
export type HealthStatus = "active" | "inactive" | "unknown";

export interface Tool {
  namespace: string;
  name: string;
  description: string;
  schema: ToolSchema;
  connectionType: ConnectionType;
  endpointUrl?: string;
  embedding?: number[];
  healthStatus: HealthStatus;
  updatedAt: Date;
  // ── Listing / monetization metadata (optional, stored in MongoDB) ──
  pricing?: {
    model: "free" | "freemium" | "paid";
    costPerCall: number;
  };
  developer?: {
    address: string;
    listingFeePaid?: boolean;
    listingFeeAmount?: number;
  };
  status?: "active" | "inactive" | "pending" | "rejected";
  /** Provenance: URL of the manifest the schema was parsed from (crawler-only). */
  schemaSource?: string;
}

export interface SearchResult {
  namespace: string;
  name: string;
  description: string;
  connectionType: ConnectionType;
  endpointUrl?: string;
  healthStatus: HealthStatus;
  score: number;
}

/**
 * Projection of a Tool document suitable for API responses (no embedding).
 */
export function toSearchResult(tool: Tool, score: number): SearchResult {
  return {
    namespace: tool.namespace,
    name: tool.name,
    description: tool.description,
    connectionType: tool.connectionType,
    endpointUrl: tool.endpointUrl,
    healthStatus: tool.healthStatus,
    score: Number(score.toFixed(4)),
  };
}
