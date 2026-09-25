/**
 * Public Tools Directory API Router.
 *
 * Implements GET /api/tools with rich query parameter support:
 *   - source: filter by provenance (e.g. "official-registry", "github", "npm", "pypi", "first-party")
 *   - search: text search across name, namespace, description, and capabilities (alias: q)
 *   - active: boolean filter ("true" or "1" for active operational tools; "false" or "0" for inactive)
 *   - limit: maximum results per page (default: 20, max: 100)
 *   - page: 1-based page number for pagination
 *
 * Returns structured JSON containing pagination metadata and verified tool records from MongoDB.
 */
import { Hono } from "hono";
import type { ToolStore } from "../db.js";
import { type Tool, type ConnectionType, type HealthStatus } from "../types.js";
/**
 * Format a verified Tool document into the standard public API record shape.
 */
export declare function formatToolRecord(tool: Tool): {
    namespace: string;
    name: string;
    description: string;
    schema: import("../types.js").ToolSchema;
    connectionType: ConnectionType;
    endpointUrl: string | null;
    healthStatus: HealthStatus;
    lastChecked: string | null;
    failureReason: string | null;
    reliability: import("../types.js").ReliabilityIndicator;
    health: {
        status: HealthStatus;
        lastChecked: string | null;
        reliability: import("../types.js").ReliabilityIndicator;
        failureReason: string | null;
    };
    pricing: {
        model: "free" | "freemium" | "paid";
        costPerCall: number;
        currency: string;
        chain: string;
    };
    developer: {
        address: string;
        listingFeePaid?: boolean;
        listingFeeAmount?: number;
        isFirstParty?: boolean;
        name?: string;
    } | undefined;
    status: "active" | "inactive" | "pending" | "rejected";
    updatedAt: string;
    embeddingDimensions: number | null;
    schemaSource: string | null;
    isFirstParty: boolean;
    capabilities: string[];
    rateLimit: string | null;
    authentication: string | null;
    protocolDetails: string | null;
};
/**
 * Helper to match tool provenance against a source filter query.
 */
export declare function matchesSource(tool: Tool, sourceQuery?: string | null): boolean;
/**
 * Helper to match search query across tool name, namespace, description, and capabilities.
 */
export declare function matchesSearch(tool: Tool, searchQuery?: string | null): boolean;
/**
 * Handle GET /api/tools request with filtering, pagination, and metadata.
 */
export declare function handleGetTools(c: any, store: ToolStore): Promise<any>;
/**
 * Factory for the public tools API router.
 */
export declare function createToolsApiRouter(getStore: () => ToolStore): Hono;
export default createToolsApiRouter;
//# sourceMappingURL=tools.d.ts.map