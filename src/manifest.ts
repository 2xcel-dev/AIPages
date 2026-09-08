/**
 * Authoritative manifest ingestion — the crawler's ONLY source of tool schemas.
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

// ── candidate manifest filenames (repo root) ───────────────────────────────

const ROOT_CANDIDATES: Array<{ kind: ManifestKind; file: string }> = [
  { kind: "mcp", file: "mcp.json" },
  { kind: "openapi", file: "openapi.json" },
  { kind: "openapi", file: "swagger.json" },
];

const BRANCHES = ["main", "master"];

function kindFromFilename(path: string): ManifestKind | null {
  const base = path.split("/").pop()?.toLowerCase() ?? "";
  if (base === "mcp.json") return "mcp";
  if (base === "openapi.json" || base === "openapi.yaml" || base === "openapi.yml") return "openapi";
  if (base === "swagger.json" || base === "swagger.yaml" || base === "swagger.yml") return "openapi";
  return null;
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json, */*", "User-Agent": "AIPages-Crawler/0.1.0" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a genuine manifest for a GitHub repo (`owner/name`).
 * Tries, for `main` then `master`: a caller-known file path (from code search),
 * then the root `mcp.json` / `openapi.json` / `swagger.json`.
 *
 * Returns null when no candidate file exists (fetch 404 / network error) —
 * the caller rejects the repo in that case.
 */
export async function fetchManifest(
  repo: string,
  knownPath?: string,
  timeoutMs = 8000,
): Promise<ManifestResult | null> {
  const candidates: Array<{ kind: ManifestKind; path: string }> = [];
  if (knownPath) {
    const k = kindFromFilename(knownPath);
    if (k) candidates.push({ kind: k, path: knownPath });
  }
  for (const c of ROOT_CANDIDATES) {
    if (!candidates.some((x) => x.path === c.file)) {
      candidates.push({ kind: c.kind, path: c.file });
    }
  }

  for (const branch of BRANCHES) {
    for (const { kind, path } of candidates) {
      const url = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
      const raw = await fetchText(url, timeoutMs);
      if (raw !== null) return { kind, url, raw };
    }
  }
  return null;
}

/**
 * Parse a manifest and extract every schema-bearing tool it declares.
 * Returns an empty array when the manifest is invalid, unparseable, or
 * declares no tool with a genuine schema (the caller rejects the repo).
 */
export function extractTools(repo: string, manifest: ManifestResult): ExtractedTool[] {
  const parsed =
    manifest.kind === "mcp"
      ? parseMcpManifest(manifest.raw)
      : parseOpenApiManifest(manifest.raw);
  if (!parsed) return [];

  const repoSlug = repo.toLowerCase().replace(/[^a-z0-9.-]/g, ".");
  return parsed.map((p) => ({
    ...p,
    schemaSource: manifest.url,
    namespace: `github.${repoSlug}.${slugify(p.name)}`,
  }));
}

// ── MCP manifest parser ────────────────────────────────────────────────────

export function parseMcpManifest(raw: string): ParsedTool[] | null {
  let doc: any;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!doc || typeof doc !== "object") return null;

  // Reject client-config shapes (`mcpServers`) — launch configs carry no schemas.
  const tools = Array.isArray(doc.tools) ? doc.tools : null;
  if (!tools) return null;

  const serverDescription = typeof doc.description === "string" ? doc.description.trim() : "";
  const transport = mcpTransport(doc);

  const out: ParsedTool[] = [];
  for (const t of tools) {
    if (!t || typeof t !== "object") continue;
    const name = typeof t.name === "string" ? t.name.trim() : "";
    if (!name) continue;
    const schema = normalizeSchema(t.inputSchema ?? t.parameters ?? null);
    if (!schema) continue; // no genuine schema → reject this tool
    const toolDesc = typeof t.description === "string" ? t.description.trim() : "";
    out.push({
      name,
      description: toolDesc || serverDescription || name,
      schema,
      connectionType: mcpToolConnectionType(t, transport),
      endpointUrl:
        typeof t.endpointUrl === "string"
          ? t.endpointUrl
          : typeof doc.url === "string"
            ? doc.url
            : undefined,
    });
  }
  return out.length > 0 ? out : null;
}

function mcpTransport(doc: any): string {
  const raw = doc.transport ?? doc.transportType ?? doc.type ?? "";
  return String(raw).toLowerCase();
}

function mcpToolConnectionType(t: any, transport: string): ConnectionType {
  const raw = String(t.transport ?? transport).toLowerCase();
  if (raw.includes("sse")) return "sse";
  if (raw.includes("http") || raw.includes("streamable")) return "http";
  if (raw.includes("ws") || raw.includes("websocket")) return "websocket";
  return "stdio";
}

// ── OpenAPI / Swagger parser ───────────────────────────────────────────────

export function parseOpenApiManifest(raw: string): ParsedTool[] | null {
  let doc: any;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!doc || typeof doc !== "object" || !doc.paths || typeof doc.paths !== "object") {
    return null;
  }

  const isSwagger2 = doc.swagger === "2.0";
  const isOpenApi3 = typeof doc.openapi === "string" && doc.openapi.startsWith("3.");
  if (!isSwagger2 && !isOpenApi3) return null;

  const infoDesc = typeof doc.info?.description === "string" ? doc.info.description.trim() : "";
  const serverUrl = deriveServerUrl(doc);
  const out: ParsedTool[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const op = (pathItem as any)[method];
      if (!op || typeof op !== "object") continue;
      const schema = isSwagger2 ? schemaFromSwagger2(op, doc) : schemaFromOpenApi3(op, doc);
      if (!schema) continue;
      const operationId =
        typeof op.operationId === "string" && op.operationId.trim() ? op.operationId.trim() : null;
      const summary = typeof op.summary === "string" && op.summary.trim() ? op.summary.trim() : null;
      const opDesc = typeof op.description === "string" ? op.description.trim() : "";
      out.push({
        name: operationId || `${method.toUpperCase()} ${path}`,
        description: opDesc || summary || infoDesc || `${method.toUpperCase()} ${path}`,
        schema,
        connectionType: "http",
        endpointUrl: serverUrl ?? undefined,
      });
    }
  }
  return out.length > 0 ? out : null;
}

function schemaFromOpenApi3(op: any, doc: any): ToolSchema | null {
  const content = op.requestBody?.content;
  if (content && typeof content === "object") {
    for (const [mt, media] of Object.entries(content)) {
      if (!String(mt).toLowerCase().startsWith("application/json")) continue;
      const norm = normalizeSchema(resolveLocalRef((media as any)?.schema, doc));
      if (norm) return norm;
    }
  }
  return schemaFromParameters(op.parameters, doc);
}

function schemaFromSwagger2(op: any, doc: any): ToolSchema | null {
  const params = Array.isArray(op.parameters) ? op.parameters : [];
  for (const p of params) {
    if (p?.in === "body") {
      const norm = normalizeSchema(resolveLocalRef(p.schema, doc));
      if (norm) return norm;
    }
  }
  return schemaFromParameters(params, doc);
}

function schemaFromParameters(params: unknown, doc: any): ToolSchema | null {
  if (!Array.isArray(params)) return null;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const p of params) {
    if (!p || typeof p !== "object") continue;
    const name = (p as any).name;
    if (typeof name !== "string" || !name) continue;
    if ((p as any).in !== "query" && (p as any).in !== "path") continue;
    properties[name] = paramToProperty(p, doc);
    if ((p as any).required === true) required.push(name);
  }
  if (Object.keys(properties).length === 0) return null;
  const schema: ToolSchema = { type: "object", properties };
  if (required.length > 0) schema.required = required;
  return schema;
}

function paramToProperty(p: any, doc: any): Record<string, unknown> {
  if (p.schema && typeof p.schema === "object") {
    const resolved = resolveLocalRef(p.schema, doc);
    if (resolved && typeof resolved === "object" && !Array.isArray(resolved)) {
      const prop = { ...(resolved as Record<string, unknown>) };
      if (typeof p.description === "string" && !prop.description) prop.description = p.description;
      return prop;
    }
  }
  const prop: Record<string, unknown> = {};
  if (typeof p.type === "string") prop.type = p.type;
  if (typeof p.description === "string") prop.description = p.description;
  if (Array.isArray(p.enum)) prop.enum = p.enum;
  if (p.default !== undefined) prop.default = p.default;
  return prop;
}

// ── shared helpers ─────────────────────────────────────────────────────────

/**
 * Resolve a local `#/...` JSON Pointer reference against the document root.
 * Returns the original schema when it isn't a local ref, and null when the
 * reference target is missing (never fabricated).
 */
function resolveLocalRef(schema: unknown, doc: any): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return schema;
  const ref = (schema as any).$ref;
  if (typeof ref !== "string" || !ref.startsWith("#/")) return schema;
  let node: any = doc;
  for (const part of ref.slice(2).split("/")) {
    if (node == null) return null;
    node = node[decodeURIComponent(part)];
  }
  return node;
}

/**
 * Validate that a value is a real JSON Schema and return it verbatim.
 * Rejects null/primitives/arrays and objects carrying no schema keyword at all
 * (the tell-tale of an empty or bogus schema — never ingested).
 */
export function normalizeSchema(schemaRaw: unknown): ToolSchema | null {
  if (!schemaRaw || typeof schemaRaw !== "object" || Array.isArray(schemaRaw)) return null;
  const s = schemaRaw as Record<string, unknown>;
  const hasType = typeof s.type === "string";
  const hasProperties = s.properties && typeof s.properties === "object";
  const hasRef = typeof s.$ref === "string";
  const hasItems = s.items && typeof s.items === "object";
  if (!hasType && !hasProperties && !hasRef && !hasItems) return null;
  // Preserve the full schema faithfully — no projection, no invention.
  return { ...s } as ToolSchema;
}

function deriveServerUrl(doc: any): string | null {
  // OpenAPI 3: servers[0].url
  if (Array.isArray(doc.servers) && doc.servers[0]?.url) {
    const u = String(doc.servers[0].url);
    if (u.includes("{")) return null; // templated — cannot health-check
    return u.replace(/\/+$/, "");
  }
  // Swagger 2: schemes[0] + host + basePath
  const scheme = Array.isArray(doc.schemes) && doc.schemes[0] ? doc.schemes[0] : "https";
  if (typeof doc.host === "string" && doc.host) {
    const basePath = typeof doc.basePath === "string" ? doc.basePath : "";
    return `${scheme}://${doc.host}${basePath}`.replace(/\/+$/, "");
  }
  return null;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "unnamed";
}
