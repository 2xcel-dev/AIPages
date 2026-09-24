/**
 * Standard JSON Syndication Feed Endpoint.
 *
 * Implements a standard JSON Feed (v1.1 specification) built directly on top of
 * the AIPages tools directory data layer:
 *   https://jsonfeed.org/version/1.1
 *
 * Provides real-time syndication of machine-readable tool schemas, endpoints,
 * pricing, and health reliability states for autonomous AI agents and aggregators.
 *
 * Supported query parameters:
 *   - limit: maximum items in the feed (default: 50, max: 250)
 *   - source: filter by source provenance (e.g. "official-registry", "github", "first-party")
 *   - active: filter by active health status ("true" / "1" vs "false" / "0")
 *   - search: keyword search across name, namespace, description, and capabilities
 *   - capability: filter by specific capability tag
 */

import { Hono } from "hono";
import type { ToolStore } from "../db.js";
import { deriveReliability, type Tool } from "../types.js";
import { slugify } from "../manifest.js";
import { matchesSource, matchesSearch } from "./tools.js";

export const FEED_VERSION = "https://jsonfeed.org/version/1.1";
export const FEED_TITLE = "AIPages Autonomous AI Tool Directory Syndication Feed";
export const FEED_HOME_PAGE = "https://aipages.tech";
export const FEED_URL = "https://aipages.tech/api/feed.json";
export const FEED_DESCRIPTION =
  "Real-time syndication feed of machine-readable tools, schemas, endpoints, and health statuses for autonomous AI agents.";

export interface JsonFeedAuthor {
  name: string;
  url?: string;
  avatar?: string;
}

export interface JsonFeedItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  content_text: string;
  date_published?: string;
  date_modified?: string;
  tags?: string[];
  _aipages: {
    namespace: string;
    name: string;
    description: string;
    schema: unknown;
    connectionType: string;
    endpointUrl: string | null;
    healthStatus: string;
    reliability: string;
    lastChecked: string | null;
    failureReason?: string | null;
    health?: {
      status: string;
      lastChecked: string | null;
      reliability: string;
      failureReason: string | null;
    };
    pricing: unknown;
    developer: unknown;
    isFirstParty: boolean;
    capabilities: string[];
    rateLimit: string | null;
    authentication: string | null;
  };
}

export interface JsonFeedDocument {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  description: string;
  user_comment?: string;
  favicon?: string;
  language?: string;
  expired?: boolean;
  authors?: JsonFeedAuthor[];
  items: JsonFeedItem[];
}

export interface SyndicationFeedOptions {
  feedUrl?: string;
  homePageUrl?: string;
  title?: string;
  description?: string;
}

/**
 * Format a Tool record into a standard JSON Feed item with _aipages machine extensions.
 */
export function formatFeedItem(tool: Tool, baseUrl = FEED_HOME_PAGE): JsonFeedItem {
  const health = deriveReliability(tool);
  const isFirstParty = Boolean(
    tool.isFirstParty ??
    tool.developer?.isFirstParty ??
    tool.namespace?.startsWith("net.2xcel.aus")
  );
  const pricingModel = tool.pricing?.model ?? "free";
  const costPerCall = tool.pricing?.costPerCall ?? 0;

  const slug = tool.name ? slugify(tool.name) : slugify(tool.namespace);
  const canonicalUrl = `${baseUrl.replace(/\/+$/, "")}/tool/${slug}`;

  const publishedDate = tool.createdAt instanceof Date
    ? tool.createdAt.toISOString()
    : tool.updatedAt instanceof Date
      ? tool.updatedAt.toISOString()
      : new Date().toISOString();

  const modifiedDate = tool.updatedAt instanceof Date
    ? tool.updatedAt.toISOString()
    : publishedDate;

  return {
    id: canonicalUrl,
    url: canonicalUrl,
    title: `${tool.name} (${tool.namespace})`,
    summary: tool.description,
    content_text: tool.description,
    date_published: publishedDate,
    date_modified: modifiedDate,
    tags: tool.capabilities ?? [],
    _aipages: {
      namespace: tool.namespace,
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      connectionType: tool.connectionType,
      endpointUrl: tool.endpointUrl ?? null,
      healthStatus: health.healthStatus,
      reliability: health.reliability,
      lastChecked: health.lastCheckedIso,
      failureReason: health.failureReason,
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
      developer: tool.developer ?? null,
      isFirstParty,
      capabilities: tool.capabilities ?? [],
      rateLimit: tool.rateLimit ?? (isFirstParty ? "100 requests per 60 seconds per IP" : null),
      authentication: tool.authentication ?? (isFirstParty ? "x402 payment protocol" : null),
    },
  };
}

/**
 * Build a complete JSON Feed v1.1 document from tool records.
 */
export function buildSyndicationFeed(
  tools: Tool[],
  options?: SyndicationFeedOptions,
): JsonFeedDocument {
  const homePageUrl = options?.homePageUrl ?? FEED_HOME_PAGE;
  const feedUrl = options?.feedUrl ?? FEED_URL;
  const title = options?.title ?? FEED_TITLE;
  const description = options?.description ?? FEED_DESCRIPTION;

  return {
    version: FEED_VERSION,
    title,
    home_page_url: homePageUrl,
    feed_url: feedUrl,
    description,
    user_comment:
      "This feed provides live syndicated tool records from the AIPages registry. Updated continuously on crawler cycles.",
    favicon: `${homePageUrl.replace(/\/+$/, "")}/favicon.ico`,
    language: "en-US",
    expired: false,
    authors: [
      {
        name: "AIPages Team",
        url: homePageUrl,
      },
    ],
    items: tools.map((t) => formatFeedItem(t, homePageUrl)),
  };
}

/**
 * Handler for the syndication feed endpoints.
 */
export async function handleSyndicationFeed(c: any, store: ToolStore) {
  const limitParam = c.req.query("limit");
  const sourceParam = c.req.query("source");
  const searchParam = c.req.query("search") ?? c.req.query("q");
  const activeParam = c.req.query("active");
  const capabilityParam = c.req.query("capability") ?? c.req.query("tag");

  const limit = Math.min(Math.max(1, Number(limitParam ?? 50)), 250);

  // Retrieve tools from store
  let tools = await store.list({
    capability: capabilityParam,
    q: searchParam,
  });

  // Filter out non-public tools
  tools = tools.filter((t) => t.status !== "rejected" && t.status !== "pending");

  // Filter by source if specified
  if (sourceParam) {
    tools = tools.filter((t) => matchesSource(t, sourceParam));
  }

  // Filter by active health if specified
  if (activeParam !== undefined) {
    const isActiveFilter = activeParam === "true" || activeParam === "1";
    if (isActiveFilter) {
      tools = tools.filter((t) => t.healthStatus === "active");
    } else {
      tools = tools.filter((t) => t.healthStatus !== "active");
    }
  }

  // Search filter
  if (searchParam && searchParam.trim()) {
    tools = tools.filter((t) => matchesSearch(t, searchParam));
  }

  // Slice to limit
  const feedTools = tools.slice(0, limit);
  const feed = buildSyndicationFeed(feedTools);

  // Return explicit JSON Feed content type and caching headers
  return c.newResponse(JSON.stringify(feed), 200, {
    "Content-Type": "application/feed+json; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=600",
  });
}

/**
 * Factory for the syndication feed router.
 */
export function createSyndicationRouter(getStore: () => ToolStore): Hono {
  const router = new Hono();

  const handler = async (c: any) => {
    const store = getStore();
    return handleSyndicationFeed(c, store);
  };

  router.get("/api/feed.json", handler);
  router.get("/api/syndication", handler);
  router.get("/api/syndication/feed.json", handler);
  router.get("/feed.json", handler);

  return router;
}

export default createSyndicationRouter;
