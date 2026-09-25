/**
 * Scraper & Ingester: aggregates tool manifests from open registries.
 *
 * GitHub: code search for repos shipping `mcp.json`, `openapi.json`, or
 * `swagger.json` manifests (the crawler fetches + parses each one).
 * npm: package keyword search (used by the admin /scrape endpoint).
 *
 * Schemas are never invented here: the crawler parses genuine manifests via
 * manifest.ts and rejects anything without a real, parseable schema.
 */
import type { ToolStore } from "./db.js";
import type { ToolSchema, ConnectionType } from "./types.js";
interface RawToolManifest {
    namespace: string;
    name: string;
    description: string;
    schema?: ToolSchema;
    connectionType?: ConnectionType;
    endpointUrl?: string;
}
/** Ingest a list of raw manifests: embed each and upsert into the store. */
export declare function ingestManifests(store: ToolStore, manifests: RawToolManifest[]): Promise<number>;
/**
 * GitHub Search API response item shape.
 */
export interface GitHubSearchItem {
    /** Matched filename (e.g. "mcp.json"). */
    name: string;
    /** Matched file path within the repo. */
    path: string;
    repository: {
        full_name: string;
        html_url: string;
    };
}
/**
 * Search GitHub for repos shipping genuine tool manifests.
 *
 * Uses the GitHub Search API (unauthenticated = 60 req/hr, 5000 with token).
 * Searches for repos containing `mcp.json`, `openapi.json`, or `swagger.json`.
 *
 * Returns raw search items (including the matched file path); the crawler
 * fetches and parses each manifest, rejecting anything unparseable.
 */
export declare function scrapeGitHub(maxResults?: number): Promise<GitHubSearchItem[]>;
export interface GitHubRepoResult {
    full_name: string;
    html_url: string;
    description?: string;
}
/**
 * Search GitHub repositories by query (e.g. "topic:mcp-server topic:mcp").
 *
 * Unlike code search (`/search/code`), repository search works without a
 * token (60 req/hr unauthenticated). Used as the crawler's fallback discovery
 * path when no GITHUB_TOKEN is configured; the manifest is still fetched and
 * parsed from each repo, so schema authority is unchanged.
 */
export declare function searchGitHubRepos(query: string, maxResults?: number): Promise<GitHubRepoResult[]>;
export interface GitHubRepoInfo {
    full_name: string;
    html_url: string;
    description: string | null;
    language: string | null;
}
/**
 * Fetch a GitHub repository's metadata (description, language) via the
 * GitHub Repos API. Used by the crawler's Gemini-schema fallback when a
 * repo has no manifest but a rich description.
 */
export declare function fetchRepoInfo(repo: string): Promise<GitHubRepoInfo | null>;
/**
 * npm registry search response shape.
 */
export interface NpmSearchObject {
    package: {
        name: string;
        description?: string;
        links?: {
            repository?: string;
        };
    };
}
export interface NpmSearchResult {
    objects: NpmSearchObject[];
}
/**
 * Scrape npm for packages tagged with "mcp" or "ai-agent-tool".
 *
 * Used by the admin /scrape endpoint only; the crawler does not ingest from
 * npm, since npm packages provide no genuine tool schema.
 */
export declare function scrapeNpm(maxResults?: number): Promise<NpmSearchResult>;
export {};
//# sourceMappingURL=scraper.d.ts.map