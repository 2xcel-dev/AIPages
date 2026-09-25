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
export declare const OFFICIAL_REGISTRY_SERVERS_URL: string;
export declare const OFFICIAL_SERVERS_FALLBACK_URL = "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/README.md";
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
    transport?: {
        type?: string;
    };
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
export declare function sanitizeDashes(text?: string | null): string;
/**
 * Normalize an official registry server entry into the standard Candidate interface.
 */
export declare function normalizeOfficialServerRecord(item: unknown): Candidate | null;
/**
 * Fetch candidates from the official reference implementations README when registry API is down.
 */
export declare function fetchOfficialServersFallback(maxResults?: number, timeoutMs?: number): Promise<Candidate[]>;
/**
 * Fetch candidates from the official Model Context Protocol registry.
 */
export declare function fetchOfficialRegistryCandidates(maxResults?: number, timeoutMs?: number): Promise<Candidate[]>;
//# sourceMappingURL=official-registry.d.ts.map