/**
 * Official Model Context Protocol Registry Adapter.
 *
 * Ingests live candidate server manifests and endpoints from the official
 * Model Context Protocol registry:
 *   Endpoint: https://registry.modelcontextprotocol.io/v0.1/servers
 *
 * Normalizes all entries into the standard Candidate interface:
 *   { source: "official-registry", repoOrPackageUrl, manifestHint }
 *
 * Falls back gracefully to the official reference servers repository index
 * if the registry endpoint is temporarily unreachable.
 */

import type { Candidate } from "./types.js";

export const OFFICIAL_REGISTRY_SERVERS_URL =
  process.env.OFFICIAL_REGISTRY_SERVERS_URL ??
  "https://registry.modelcontextprotocol.io/v0.1/servers";

export const OFFICIAL_SERVERS_FALLBACK_URL =
  "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/README.md";

export interface OfficialRegistryRemote {
  type?: string;
  url?: string;
  [key: string]: unknown;
}

export interface OfficialRegistryRepository {
  url?: string;
  source?: string;
  subfolder?: string;
  id?: string;
  [key: string]: unknown;
}

export interface OfficialRegistryPackage {
  registryType?: string;
  identifier?: string;
  version?: string;
  transport?: { type?: string };
  [key: string]: unknown;
}

export interface OfficialServerRecord {
  $schema?: string;
  name: string;
  description?: string;
  title?: string;
  version?: string;
  remotes?: OfficialRegistryRemote[];
  repository?: OfficialRegistryRepository;
  packages?: OfficialRegistryPackage[];
  websiteUrl?: string;
  tools?: unknown[];
  [key: string]: unknown;
}

export interface OfficialRegistryItem {
  server: OfficialServerRecord;
  _meta?: Record<string, unknown>;
}

export interface OfficialRegistryResponse {
  servers?: OfficialRegistryItem[];
  metadata?: {
    nextCursor?: string;
    count?: number;
    [key: string]: unknown;
  };
}

/**
 * Sanitize text to enforce zero em dash and zero en dash constraint.
 */
export function sanitizeDashes(text?: string | null): string {
  if (!text) return "";
  return text.replace(/[\u2013\u2014]/g, " - ");
}

/**
 * Extract GitHub owner/repo identifier and optional manifest path.
 */
function extractGitHubRepo(
  url?: string,
  subfolder?: string,
): { repo?: string; path?: string } {
  if (!url || !url.includes("github.com/")) return {};
  const match = url.match(/github\.com\/([^\/]+\/[^\/\.]+)/);
  if (!match || !match[1]) return {};
  const repo = match[1].replace(/\.git$/, "");
  const path = subfolder ? `${subfolder.replace(/^\/+|\/+$/g, "")}/mcp.json` : undefined;
  return { repo, path };
}

/**
 * Normalize an official registry server entry into the standard Candidate interface.
 */
export function normalizeOfficialServerRecord(item: unknown): Candidate | null {
  if (!item || typeof item !== "object") return null;

  // Handle both { server: { ... } } wrapper and direct record format
  const rawRecord = (item as any).server ?? item;
  if (!rawRecord || typeof rawRecord !== "object" || typeof rawRecord.name !== "string") {
    return null;
  }

  const server = rawRecord as OfficialServerRecord;
  const name = server.name.trim();
  if (!name) return null;

  const description = sanitizeDashes(server.description || server.title || name);
  const repoUrl = typeof server.repository?.url === "string" ? server.repository.url.trim() : undefined;
  const { repo, path } = extractGitHubRepo(repoUrl, server.repository?.subfolder);

  let primaryUrl = repoUrl;

  // If no repository URL, check for first active remote endpoint
  if (!primaryUrl && Array.isArray(server.remotes) && server.remotes.length > 0) {
    const remote = server.remotes.find((r) => typeof r?.url === "string" && r.url.trim().length > 0);
    if (remote?.url) primaryUrl = remote.url.trim();
  }

  // If still no primary URL, check for package identifier
  if (!primaryUrl && Array.isArray(server.packages) && server.packages.length > 0) {
    const pkg = server.packages.find((p) => typeof p?.identifier === "string" && p.identifier.trim().length > 0);
    if (pkg?.identifier) {
      const reg = String(pkg.registryType ?? "npm").toLowerCase();
      primaryUrl =
        reg === "pypi"
          ? `https://pypi.org/project/${pkg.identifier.trim()}`
          : `https://www.npmjs.com/package/${pkg.identifier.trim()}`;
    }
  }

  // Fallback to websiteUrl or URN
  if (!primaryUrl) {
    primaryUrl = server.websiteUrl || `urn:mcp:${name}`;
  }

  // Build authoritative manifestHint with client-side launch configuration
  const manifestHint: Record<string, unknown> = {
    name,
    description,
  };

  if (Array.isArray(server.remotes) && server.remotes.length > 0) {
    const mcpServers: Record<string, unknown> = {};
    for (const r of server.remotes) {
      if (typeof r?.url === "string" && r.url.trim().length > 0) {
        mcpServers[name] = {
          type: r.type ?? "streamable-http",
          url: r.url.trim(),
          description,
        };
        break;
      }
    }
    if (Object.keys(mcpServers).length > 0) {
      manifestHint.mcpServers = mcpServers;
    }
  }

  if (!manifestHint.mcpServers && Array.isArray(server.packages) && server.packages.length > 0) {
    const mcpServers: Record<string, unknown> = {};
    for (const pkg of server.packages) {
      if (typeof pkg?.identifier === "string" && pkg.identifier.trim().length > 0) {
        const reg = String(pkg.registryType ?? "npm").toLowerCase();
        const cmd = reg === "pypi" ? "python" : "npx";
        mcpServers[name] = {
          command: cmd,
          args: ["-y", pkg.identifier.trim()],
          description,
        };
        break;
      }
    }
    if (Object.keys(mcpServers).length > 0) {
      manifestHint.mcpServers = mcpServers;
    }
  }

  if (Array.isArray(server.tools) && server.tools.length > 0) {
    manifestHint.tools = server.tools;
  }

  return {
    source: "official-registry",
    repoOrPackageUrl: primaryUrl,
    repo,
    path,
    manifestHint,
  };
}

/**
 * Fetch candidates from the official reference implementations README when registry API is down.
 */
export async function fetchOfficialServersFallback(
  maxResults = 20,
  timeoutMs = 8000,
): Promise<Candidate[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OFFICIAL_SERVERS_FALLBACK_URL, {
      signal: controller.signal,
      headers: {
        Accept: "text/plain, */*",
        "User-Agent": "AIPages-Crawler/1.0",
      },
    });
    if (!res.ok) {
      console.warn(`[official-registry] Fallback fetch failed with status ${res.status}`);
      return [];
    }
    const text = await res.text();
    const serverRegex =
      /\[([^\]]+)\]\((?:https:\/\/github\.com\/modelcontextprotocol\/servers\/tree\/main\/)?(src\/[^)]+)\)/g;
    const candidates: Candidate[] = [];
    const seen = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = serverRegex.exec(text)) !== null) {
      if (candidates.length >= maxResults) break;
      const serverName = match[1].trim();
      const subpath = match[2].trim();
      const key = `modelcontextprotocol/servers:${subpath}`;
      if (seen.has(key)) continue;
      seen.add(key);

      candidates.push({
        source: "official-registry",
        repoOrPackageUrl: `https://github.com/modelcontextprotocol/servers/tree/main/${subpath}`,
        repo: "modelcontextprotocol/servers",
        path: `${subpath}/mcp.json`,
        manifestHint: {
          name: serverName,
          description: `Official Model Context Protocol reference server for ${serverName}`,
        },
      });
    }

    return candidates;
  } catch (err) {
    console.warn("[official-registry] Error fetching reference servers fallback:", err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch candidates from the official Model Context Protocol registry.
 */
export async function fetchOfficialRegistryCandidates(
  maxResults = 30,
  timeoutMs = 8000,
): Promise<Candidate[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(OFFICIAL_REGISTRY_SERVERS_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AIPages-Crawler/1.0",
      },
    });

    if (!res.ok) {
      console.warn(
        `[official-registry] Official registry returned status ${res.status}, using reference fallback`,
      );
      return await fetchOfficialServersFallback(maxResults, timeoutMs);
    }

    const data = (await res.json()) as OfficialRegistryResponse;
    if (!data || !Array.isArray(data.servers) || data.servers.length === 0) {
      console.warn("[official-registry] No servers array in registry response, using fallback");
      return await fetchOfficialServersFallback(maxResults, timeoutMs);
    }

    const candidates: Candidate[] = [];
    const seen = new Set<string>();

    for (const item of data.servers) {
      if (candidates.length >= maxResults) break;
      const candidate = normalizeOfficialServerRecord(item);
      if (!candidate) continue;

      const dedupeKey = candidate.repo?.toLowerCase() || candidate.repoOrPackageUrl.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      candidates.push(candidate);
    }

    return candidates;
  } catch (err) {
    console.warn(
      `[official-registry] Network error reaching official registry (${err instanceof Error ? err.message : String(err)}), using fallback`,
    );
    return await fetchOfficialServersFallback(maxResults, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
}
