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
import { config } from "./config.js";
import { embed } from "./embedding.js";
/** Ingest a list of raw manifests: embed each and upsert into the store. */
export async function ingestManifests(store, manifests) {
    let count = 0;
    for (const raw of manifests) {
        const text = `${raw.namespace} ${raw.name} ${raw.description}`;
        const embedding = await embed(text);
        const tool = {
            namespace: raw.namespace,
            name: raw.name,
            description: raw.description,
            schema: raw.schema ?? { type: "object", properties: {}, required: [] },
            connectionType: raw.connectionType ?? "sse",
            endpointUrl: raw.endpointUrl,
            embedding,
            healthStatus: "active",
            updatedAt: new Date(),
        };
        await store.upsert(tool);
        count++;
    }
    return count;
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
export async function scrapeGitHub(maxResults = 20) {
    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (config.githubToken)
        headers["Authorization"] = `Bearer ${config.githubToken}`;
    const queries = ["filename:mcp.json", "filename:openapi.json", "filename:swagger.json"];
    const results = [];
    for (const q of queries) {
        if (results.length >= maxResults)
            break;
        const url = `https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=${Math.min(maxResults, 30)}`;
        try {
            const res = await fetch(url, { headers });
            if (!res.ok) {
                console.warn(`[scrape] GitHub search failed (${res.status}) for "${q}"`);
                continue;
            }
            const data = await res.json();
            if (!data.items)
                continue;
            for (const item of data.items.slice(0, maxResults - results.length)) {
                results.push({
                    name: item.name,
                    path: item.path,
                    repository: {
                        full_name: item.repository.full_name,
                        html_url: item.repository.html_url,
                    },
                });
            }
        }
        catch (err) {
            console.warn(`[scrape] GitHub error for "${q}":`, err);
        }
    }
    return results;
}
/**
 * Search GitHub repositories by query (e.g. "topic:mcp-server topic:mcp").
 *
 * Unlike code search (`/search/code`), repository search works without a
 * token (60 req/hr unauthenticated). Used as the crawler's fallback discovery
 * path when no GITHUB_TOKEN is configured; the manifest is still fetched and
 * parsed from each repo, so schema authority is unchanged.
 */
export async function searchGitHubRepos(query, maxResults = 20) {
    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (config.githubToken)
        headers["Authorization"] = `Bearer ${config.githubToken}`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${Math.min(maxResults, 30)}&sort=stars`;
    try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
            console.warn(`[scrape] repo search failed (${res.status}) for "${query}"`);
            return [];
        }
        const data = await res.json();
        return (data.items ?? []).map((i) => ({
            full_name: i.full_name,
            html_url: i.html_url,
            description: i.description ?? undefined,
        }));
    }
    catch (err) {
        console.warn("[scrape] repo search error:", err);
        return [];
    }
}
/**
 * Fetch a GitHub repository's metadata (description, language) via the
 * GitHub Repos API. Used by the crawler's Gemini-schema fallback when a
 * repo has no manifest but a rich description.
 */
export async function fetchRepoInfo(repo) {
    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (config.githubToken)
        headers["Authorization"] = `Bearer ${config.githubToken}`;
    const url = `https://api.github.com/repos/${repo}`;
    try {
        const res = await fetch(url, { headers });
        if (!res.ok)
            return null;
        const data = await res.json();
        return {
            full_name: data.full_name,
            html_url: data.html_url,
            description: data.description ?? null,
            language: data.language ?? null,
        };
    }
    catch {
        return null;
    }
}
/**
 * Scrape npm for packages tagged with "mcp" or "ai-agent-tool".
 *
 * Used by the admin /scrape endpoint only; the crawler does not ingest from
 * npm, since npm packages provide no genuine tool schema.
 */
export async function scrapeNpm(maxResults = 20) {
    const url = `https://registry.npmjs.org/-/v1/search?text=keywords:mcp+ai-agent-tool&size=${maxResults}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`[scrape] npm search failed (${res.status})`);
            return { objects: [] };
        }
        const data = await res.json();
        return data;
    }
    catch (err) {
        console.warn("[scrape] npm error:", err);
        return { objects: [] };
    }
}
//# sourceMappingURL=scraper.js.map