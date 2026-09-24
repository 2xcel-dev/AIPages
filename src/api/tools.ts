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
import {
  deriveReliability,
  type Tool,
  type ConnectionType,
  type HealthStatus,
} from "../types.js";

/**
 * Format a verified Tool document into the standard public API record shape.
 */
export function formatToolRecord(tool: Tool) {
  const health = deriveReliability(tool);
  const isFirstParty = Boolean(
    tool.isFirstParty ??
    tool.developer?.isFirstParty ??
    tool.namespace?.startsWith("net.2xcel.aus")
  );
  const pricingModel = tool.pricing?.model ?? "free";
  const costPerCall = tool.pricing?.costPerCall ?? 0;

  return {
    namespace: tool.namespace,
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
    connectionType: tool.connectionType,
    endpointUrl: tool.endpointUrl ?? null,
    healthStatus: health.healthStatus,
    lastChecked: health.lastCheckedIso,
    failureReason: health.failureReason,
    reliability: health.reliability,
    health: {
      status: health.healthStatus,
      lastChecked: health.lastCheckedIso,
      reliability: health.reliability,
      failureReason: health.failureReason,
    },
    pricing: {
      model: pricingModel,
      costPerCall,
      currency: "USDC",
      chain: "Base",
    },
    developer: tool.developer,
    status: tool.status ?? "active",
    updatedAt: tool.updatedAt instanceof Date ? tool.updatedAt.toISOString() : tool.updatedAt,
    embeddingDimensions: tool.embedding?.length ?? null,
    schemaSource: tool.schemaSource ?? null,
    isFirstParty,
    capabilities: tool.capabilities ?? [],
    rateLimit: tool.rateLimit ?? (isFirstParty ? "100 requests per 60 seconds per IP" : null),
    authentication: tool.authentication ?? (isFirstParty ? "x402 payment protocol" : null),
    protocolDetails: tool.protocolDetails ?? null,
  };
}

/**
 * Helper to match tool provenance against a source filter query.
 */
export function matchesSource(tool: Tool, sourceQuery?: string | null): boolean {
  if (!sourceQuery) return true;
  const q = sourceQuery.toLowerCase().trim();
  if (!q || q === "all") return true;

  if (q === "official-registry" || q === "official" || q === "registry") {
    const src = tool.schemaSource?.toLowerCase() ?? "";
    return Boolean(
      src.startsWith("official-registry") ||
      src.includes("registry.modelcontextprotocol.io") ||
      tool.namespace.startsWith("mcp.registry.") ||
      tool.namespace.startsWith("io.modelcontextprotocol.")
    );
  }

  if (q === "github") {
    const src = tool.schemaSource?.toLowerCase() ?? "";
    return Boolean(
      src.startsWith("github") ||
      src.includes("github.com") ||
      tool.namespace.startsWith("github.")
    );
  }

  if (q === "npm") {
    const src = tool.schemaSource?.toLowerCase() ?? "";
    return Boolean(
      src.startsWith("npm") ||
      src.includes("npmjs.com") ||
      tool.namespace.startsWith("npm.") ||
      tool.namespace.includes(".npm.")
    );
  }

  if (q === "pypi") {
    const src = tool.schemaSource?.toLowerCase() ?? "";
    return Boolean(
      src.startsWith("pypi") ||
      src.includes("pypi.org") ||
      tool.namespace.startsWith("pypi.") ||
      tool.namespace.includes(".pypi.")
    );
  }

  if (q === "first-party" || q === "aus" || q === "2xcel") {
    return Boolean(
      tool.isFirstParty ||
      tool.developer?.isFirstParty ||
      tool.namespace.startsWith("net.2xcel.aus") ||
      tool.schemaSource?.toLowerCase().startsWith("first-party")
    );
  }

  // Generic substring match on schemaSource or namespace
  return Boolean(
    (tool.schemaSource && tool.schemaSource.toLowerCase().includes(q)) ||
    tool.namespace.toLowerCase().includes(q)
  );
}

/**
 * Helper to match search query across tool name, namespace, description, and capabilities.
 */
export function matchesSearch(tool: Tool, searchQuery?: string | null): boolean {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase().trim();
  if (!q) return true;

  if (tool.name.toLowerCase().includes(q)) return true;
  if (tool.namespace.toLowerCase().includes(q)) return true;
  if (tool.description && tool.description.toLowerCase().includes(q)) return true;
  if (
    tool.capabilities &&
    Array.isArray(tool.capabilities) &&
    tool.capabilities.some((c) => c.toLowerCase().includes(q))
  ) {
    return true;
  }
  return false;
}

/**
 * Handle GET /api/tools request with filtering, pagination, and metadata.
 */
export async function handleGetTools(c: any, store: ToolStore) {
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset") ?? c.req.query("skip");
  const pageParam = c.req.query("page");

  const sourceParam = c.req.query("source");
  const searchParam = c.req.query("search") ?? c.req.query("q") ?? c.req.query("query");
  const activeParam = c.req.query("active");

  const status = c.req.query("status");
  const connectionType = c.req.query("connectionType") as ConnectionType | undefined;
  const healthStatus = c.req.query("healthStatus") as HealthStatus | undefined;
  const pricingModel = c.req.query("pricingModel");
  const capability = c.req.query("capability") ?? c.req.query("keyword");
  const hasEndpointParam = c.req.query("hasEndpoint");
  const hasEndpoint = hasEndpointParam !== undefined ? hasEndpointParam === "true" : undefined;
  const reliabilityParam = c.req.query("reliability");

  // Validate reliability query parameter if provided
  if (reliabilityParam !== undefined) {
    const validReliabilities = ["high", "degraded", "failing", "unchecked", "all"];
    const normalizedReliability = reliabilityParam.toLowerCase().trim();
    if (!validReliabilities.includes(normalizedReliability)) {
      return c.json(
        {
          error: "Invalid reliability filter parameter",
          message:
            "Allowed values for 'reliability' are: 'high', 'degraded', 'failing', 'unchecked', or 'all'.",
          provided: reliabilityParam,
        },
        400,
      );
    }
  }

  const limit = Math.min(Math.max(1, Number(limitParam ?? 20)), 100);

  // Compute pagination offsets
  let page = 1;
  let offset = 0;

  if (pageParam !== undefined) {
    page = Math.max(1, Number(pageParam) || 1);
    offset = (page - 1) * limit;
  } else if (offsetParam !== undefined) {
    offset = Math.max(0, Number(offsetParam) || 0);
    page = Math.floor(offset / limit) + 1;
  }

  // Base database query
  const filter = {
    hasEndpoint,
    status,
    connectionType,
    healthStatus,
    pricingModel,
    capability,
    q: searchParam,
  };

  let tools = await store.list(filter);

  // Filter by reliability if specified
  if (reliabilityParam) {
    const targetReliability = reliabilityParam.toLowerCase().trim();
    if (targetReliability !== "all") {
      tools = tools.filter((t) => deriveReliability(t).reliability === targetReliability);
    }
  }

  // Filter by source provenance if specified
  if (sourceParam) {
    tools = tools.filter((t) => matchesSource(t, sourceParam));
  }

  // Filter by active status if specified ("true"/"1" vs "false"/"0")
  if (activeParam !== undefined) {
    const isActiveFilter = activeParam === "true" || activeParam === "1";
    if (isActiveFilter) {
      tools = tools.filter(
        (t) =>
          t.healthStatus === "active" &&
          t.status !== "rejected" &&
          t.status !== "pending",
      );
    } else {
      tools = tools.filter(
        (t) =>
          t.healthStatus !== "active" ||
          t.status === "inactive" ||
          t.status === "rejected",
      );
    }
  }

  // Ensure full keyword matching coverage
  if (searchParam && searchParam.trim()) {
    tools = tools.filter((t) => matchesSearch(t, searchParam));
  }

  const total = tools.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedTools = tools.slice(offset, offset + limit);
  const formattedTools = paginatedTools.map(formatToolRecord);

  return c.json({
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    total,
    count: formattedTools.length,
    limit,
    offset,
    tools: formattedTools,
  });
}

/**
 * Factory for the public tools API router.
 */
export function createToolsApiRouter(getStore: () => ToolStore): Hono {
  const router = new Hono();

  router.get("/api/tools", async (c) => {
    const store = getStore();
    return handleGetTools(c, store);
  });

  return router;
}

export default createToolsApiRouter;
