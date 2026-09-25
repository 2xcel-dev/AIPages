/**
 * Core data model for the `tools` collection in MongoDB Atlas.
 */
/**
 * A JSON Schema describing a tool's input parameters.
 *
 * The two typed hints (`type`/`properties`/`required`) exist for ergonomics,
 * but the schema is stored faithfully: `$ref`, `items`, `enum`, `anyOf`,
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
    createdAt?: Date;
    updatedAt: Date;
    /** Timestamp of the most recent health check probe */
    lastChecked?: Date;
    lastCheckedAt?: Date;
    /** Concise failure reason if the health check failed (no bodies or secrets) */
    failureReason?: string | null;
    pricing?: {
        model: "free" | "freemium" | "paid";
        costPerCall: number;
    };
    developer?: {
        address: string;
        listingFeePaid?: boolean;
        listingFeeAmount?: number;
        isFirstParty?: boolean;
        name?: string;
    };
    status?: "active" | "inactive" | "pending" | "rejected";
    /** Provenance: URL of the manifest the schema was parsed from (crawler-only). */
    schemaSource?: string;
    /** Explicit first-party indicator */
    isFirstParty?: boolean;
    /** Capability tags for discovery and query routing */
    capabilities?: string[];
    /** Human-readable rate limit constraint (e.g. "100 requests per 60 seconds per IP") */
    rateLimit?: string;
    /** Authentication and payment protocol instructions */
    authentication?: string;
    /** Technical protocol specification details */
    protocolDetails?: string;
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
export declare function deriveReliability(tool: Partial<Tool>): {
    healthStatus: HealthStatus;
    lastCheckedIso: string | null;
    failureReason: string | null;
    reliability: ReliabilityIndicator;
};
/**
 * Projection of a Tool document suitable for API responses (no embedding).
 */
export declare function toSearchResult(tool: Tool, score: number): SearchResult;
//# sourceMappingURL=types.d.ts.map