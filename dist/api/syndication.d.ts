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
import { type Tool } from "../types.js";
export declare const FEED_VERSION = "https://jsonfeed.org/version/1.1";
export declare const FEED_TITLE = "AIPages Autonomous AI Tool Directory Syndication Feed";
export declare const FEED_HOME_PAGE = "https://aipages.tech";
export declare const FEED_URL = "https://aipages.tech/api/feed.json";
export declare const FEED_DESCRIPTION = "Real-time syndication feed of machine-readable tools, schemas, endpoints, and health statuses for autonomous AI agents.";
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
export declare function formatFeedItem(tool: Tool, baseUrl?: string): JsonFeedItem;
/**
 * Build a complete JSON Feed v1.1 document from tool records.
 */
export declare function buildSyndicationFeed(tools: Tool[], options?: SyndicationFeedOptions): JsonFeedDocument;
/**
 * Handler for the syndication feed endpoints.
 */
export declare function handleSyndicationFeed(c: any, store: ToolStore): Promise<any>;
/**
 * Factory for the syndication feed router.
 */
export declare function createSyndicationRouter(getStore: () => ToolStore): Hono;
export default createSyndicationRouter;
//# sourceMappingURL=syndication.d.ts.map