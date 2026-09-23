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
  /** Timestamp of the most recent health check probe */
  lastChecked?: Date;
  lastCheckedAt?: Date;
  /** Concise failure reason if the health check failed (no bodies or secrets) */
  failureReason?: string | null;
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

export type ReliabilityIndicator = "high" | "degraded" | "failing" | "unchecked";

export interface SearchResult {
  namespace: string;
  name: string;
  description: string;
  connectionType: ConnectionType;
  endpointUrl?: string;
  healthStatus: HealthStatus;
  lastChecked?: Date;
  failureReason?: string | null;
  reliability?: ReliabilityIndicator;
  score: number;
}

/**
 * Derive endpoint health and compact reliability indicator from stored tool results.
 * Returns explicit "unchecked" enum state when no result exists.
 */
export function deriveReliability(tool: Partial<Tool>): {
  healthStatus: HealthStatus;
  lastCheckedIso: string | null;
  failureReason: string | null;
  reliability: ReliabilityIndicator;
} {
  const lastCheckedDate = tool.lastChecked ?? tool.lastCheckedAt;
  const lastCheckedIso = lastCheckedDate ? new Date(lastCheckedDate).toISOString() : null;
  const healthStatus: HealthStatus = tool.healthStatus ?? "unknown";
  const failureReason = tool.failureReason ?? null;

  // Unchecked / no stored result exists
  if (!lastCheckedDate || healthStatus === "unknown") {
    return {
      healthStatus,
      lastCheckedIso: null,
      failureReason: null,
      reliability: "unchecked",
    };
  }

  // Failing endpoint
  if (healthStatus === "inactive") {
    return {
      healthStatus: "inactive",
      lastCheckedIso,
      failureReason,
      reliability: "failing",
    };
  }

  // Active endpoint: evaluate freshness
  const ageMs = Date.now() - new Date(lastCheckedDate).getTime();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  if (ageMs > TWENTY_FOUR_HOURS_MS) {
    return {
      healthStatus: "active",
      lastCheckedIso,
      failureReason: null,
      reliability: "degraded",
    };
  }

  return {
    healthStatus: "active",
    lastCheckedIso,
    failureReason: null,
    reliability: "high",
  };
}

/**
 * Projection of a Tool document suitable for API responses (no embedding).
 */
export function toSearchResult(tool: Tool, score: number): SearchResult {
  const { reliability } = deriveReliability(tool);
  return {
    namespace: tool.namespace,
    name: tool.name,
    description: tool.description,
    connectionType: tool.connectionType,
    endpointUrl: tool.endpointUrl,
    healthStatus: tool.healthStatus,
    lastChecked: tool.lastChecked ?? tool.lastCheckedAt,
    failureReason: tool.failureReason ?? null,
    reliability,
    score: Number(score.toFixed(4)),
  };
}
