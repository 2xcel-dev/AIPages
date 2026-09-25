/**
 * Authoritative manifest ingestion: the crawler's authoritative source of tool schemas.
 *
 * The AIPages crawler never invents schemas. A tool is ingested only when it
 * ships a genuine, parseable manifest, either:
 *   - an MCP manifest (`mcp.json`) whose `tools[].inputSchema` (or `parameters`)
 *     is a real JSON Schema, or
 *   - an OpenAPI 3 / Swagger 2.0 document (`openapi.json` / `swagger.json`)
 *     whose operations carry JSON request-body or parameter schemas.
 *
 * Anything without a real, parseable schema is rejected. LLM inference and
 * name-based schema heuristics are deliberately absent from this module.
 */
import type { ToolSchema, ConnectionType } from "./types.js";
export type ManifestKind = "mcp" | "openapi";
export interface ManifestResult {
    kind: ManifestKind;
    /** URL the manifest was fetched from (provenance). */
    url: string;
    raw: string;
}
/** A schema-bearing tool extracted from a manifest (before namespacing). */
export interface ParsedTool {
    name: string;
    description: string;
    schema: ToolSchema;
    connectionType: ConnectionType;
    endpointUrl?: string;
}
/** A fully-formed tool record, ready for health-check + embed + upsert. */
export interface ExtractedTool extends ParsedTool {
    namespace: string;
    schemaSource: string;
}
/**
 * Fetch a genuine manifest for a GitHub repo (`owner/name`).
 * Tries, for `main` then `master`: a caller-known file path (from code search),
 * then the root `mcp.json` / `openapi.json` / `swagger.json`.
 *
 * Returns null when no candidate file exists (fetch 404 / network error);
 * the caller rejects the repo in that case.
 */
export declare function fetchManifest(repo: string, knownPath?: string, timeoutMs?: number): Promise<ManifestResult | null>;
/**
 * Parse a manifest and extract every schema-bearing tool it declares.
 * Returns an empty array when the manifest is invalid, unparseable, or
 * declares no tool with a genuine schema (the caller rejects the repo).
 */
export declare function extractTools(repo: string, manifest: ManifestResult, namespacePrefix?: string): ExtractedTool[];
export declare function parseMcpManifest(raw: string): ParsedTool[] | null;
export declare function parseOpenApiManifest(raw: string): ParsedTool[] | null;
/**
 * Validate that a value is a real JSON Schema and return it verbatim.
 * Rejects null/primitives/arrays and objects carrying no schema keyword at all
 * (the indicator of an empty or bogus schema; never ingested).
 */
export declare function normalizeSchema(schemaRaw: unknown): ToolSchema | null;
export declare function slugify(name: string): string;
//# sourceMappingURL=manifest.d.ts.map