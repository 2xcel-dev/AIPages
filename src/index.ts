/**
 * AIPages Backend: main application entry point.
 *
 * Hono API with route groups:
 *   - Public:  GET /              health + pricing manifest
 *   - Public:  GET /health        store connectivity
 *   - Admin:   POST /ingest       bulk ingest (admin key)
 *   - Admin:   POST /scrape       trigger GitHub+npm scrape (admin key)
 *   - Public:  GET /search        semantic vector search (free, ungated)
 *   - Public:  POST /api/tools/submit  self-serve tool submission (free)
 *   - Public:  GET /api/tools/:namespace  full tool detail (schema + pricing)
 *   - Public:  GET /api/openapi.json  OpenAPI 3.1 spec
 *   - Paid:    POST /api/invoke/:namespace  tool invocation proxy (flat $0.25 platform take-rate, collected on success only)
 *
 * Run:  npm run dev   (tsx watch)
 *       npm run start (compiled)
 */
import { MongoClient } from "mongodb";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { createStore, type ToolStore, type RawToolManifest } from "./db.js";
import { embed } from "./embedding.js";
import { ingestManifests, scrapeGitHub, scrapeNpm, type GitHubSearchItem, type NpmSearchObject } from "./scraper.js";
import { openapi } from "./openapi.js";
import { setStore, default as ingestionRouter } from "./invocation.js";
import { setRateLimitStore, MongoRateStore, startRateLimitCleanup } from "./rate-limit.js";
import { trackSubmission, trackSearch, shutdownAnalytics } from "./analytics.js";
import { deriveReliability, type Tool, type ToolSchema, type ConnectionType, type HealthStatus } from "./types.js";
import { x402PaymentMiddleware, MongoReplayStore, setReplayStore } from "./middleware/x402.js";
import { default as agentScraperRouter } from "./routes/agentScraper.js";
import { findToolBySlug, renderToolPage, renderNotFoundPage, findRelatedTools } from "./views/toolPage.js";
import { renderDirectoryPage } from "./views/directoryPage.js";
import { generateSitemapXml } from "./views/sitemap.js";
import { getCapabilityIndex, renderCapabilitiesPage } from "./views/capabilitiesPage.js";
import { CANONICAL_AUS_TOOLS } from "./data/ausTools.js";
import { assertValidFirstPartyTools, validateToolRecord } from "./validation/toolValidator.js";
const app = new Hono();

// ── Globals ─────────────────────────────────────────────────
let store: ToolStore;

// ── Middleware ──────────────────────────────────────────────
app.use("*", cors());

// ── Public routes ───────────────────────────────────────────

export const DISCOVERY_MANIFEST = {
  name: "AIPages",
  version: "0.1.0",
  status: "running",
  description:
    "Machine-native discovery registry and vector search index for autonomous AI agent tools.",
  x402: true,
  pricing: {
    "/search": "free",
    "/api/tools/submit": "free",
    "/api/invoke/{namespace}": "$0.25 USDC platform take-rate (premium tools, collected on success only)",
  },
  endpoints: {
    search: "GET /search?q=<natural-language-query>&limit=<n> (free)",
    directory: "GET /tool?reliability=<r>&connectionType=<c>",
    tools: "GET /api/tools?capability=<cap>&limit=<n>&offset=<n>&status=<s>&healthStatus=<h>",
    submit: "POST /api/tools/submit (free)",
    toolDetail: "GET /api/tools/:namespace",
    toolPage: "GET /tool/:slug",
    capabilities: "GET /capabilities (functional capability index)",
    sitemap: "GET /sitemap.xml (XML sitemap)",
    openapi: "GET /api/openapi.json",
    ingest: "POST /ingest (admin key required)",
    scrape: "POST /scrape (admin key required)",
    scrapeAgents: "POST /api/scrape-agents",
  },
  payment: {
    network: config.x402Network,
    currency: "USDC",
    model: "execution-only",
    platformFee: `$${config.x402PriceUsdc} USDC per premium invocation`,
    note: "Discovery and listing are free. The platform earns a flat take-rate only when a premium tool invocation succeeds.",
  },
  openapi: "/api/openapi.json",
};

app.get("/", async (c) => {
  const accept = c.req.header("Accept") ?? "";
  const format = c.req.query("format");
  const searchQuery = c.req.query("q") ?? c.req.query("search");
  const reliability = c.req.query("reliability");
  const connectionType = c.req.query("connectionType");
  const pricingModel = c.req.query("pricingModel");
  const capability = c.req.query("capability") ?? c.req.query("cap");

  const hasSearchParams = Boolean(
    searchQuery || reliability || connectionType || pricingModel || capability,
  );

  // Preserve JSON discovery manifest for API/curl clients when no search parameters are supplied
  if (!hasSearchParams) {
    if (
      format === "json" ||
      (!accept.includes("text/html") && (accept.includes("application/json") || accept === "*/*" || !accept))
    ) {
      return c.json(DISCOVERY_MANIFEST);
    }
  }

  return handleDirectoryRequest(c, "/");
});

app.get("/health", async (c) => {
  const ok = await store.ping();
  return c.json({
    status: ok ? "healthy" : "degraded",
    store: ok ? "connected" : "disconnected",
  });
});

app.get("/api/openapi.json", (c) => c.json(openapi));

// ── Admin routes (key-gated) ────────────────────────────────

function requireAdminKey(c: any): boolean {
  const key = c.req.header("X-ADMIN-KEY");
  const expected = process.env.ADMIN_KEY;
  if (!expected) return true; // dev: no key configured = open
  return key === expected;
}

app.post("/ingest", async (c) => {
  if (!requireAdminKey(c)) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json();
  if (!Array.isArray(body?.tools)) {
    return c.json({ error: "Expected { tools: [...] }" }, 400);
  }
  const count = await ingestManifests(store, body.tools);
  return c.json({ ingested: count });
});


app.post("/scrape", async (c) => {
  if (!requireAdminKey(c)) return c.json({ error: "unauthorized" }, 401);
  const maxResults = Number(c.req.query("max") ?? 20);
  const [gh, npm] = await Promise.all([
    scrapeGitHub(maxResults),
    scrapeNpm(maxResults),
  ]);
  const manifests: RawToolManifest[] = [
    ...gh.map((item) => ({
      namespace: `github.${item.repository.full_name.toLowerCase().replace(/[^a-z0-9.-]/g, ".")}`,
      name: item.repository.full_name.split("/")[1] ?? item.repository.full_name,
      description: `GitHub repository: ${item.repository.full_name}`,
      connectionType: "http" as ConnectionType,
      endpointUrl: item.repository.html_url,
    })),
    ...npm.objects.map((obj) => ({
      namespace: `npm.${obj.package.name}`,
      name: obj.package.name,
      description: obj.package.description ?? `npm package: ${obj.package.name}`,
      connectionType: "http" as ConnectionType,
      endpointUrl: obj.package.links?.repository,
    })),
  ];
  const count = await ingestManifests(store, manifests);
  return c.json({ scraped: manifests.length, ingested: count });
});

// ── Public route: semantic search (free, ungated) ──────────

app.get("/search", async (c) => {
  const query = c.req.query("q");
  if (!query) return c.json({ error: "Missing query parameter: q" }, 400);
  const limit = Math.min(Number(c.req.query("limit") ?? 10), 50);

  const queryEmbedding = await embed(query);
  const results = await store.search(queryEmbedding, limit);

  trackSearch({ query, resultCount: results.length });

  return c.json({
    query,
    count: results.length,
    results,
  });
});

// ── Public route: self-serve tool submission (free) ─────────

app.post("/api/tools/submit", async (c) => {
  const body = await c.req.json().catch(() => null) as {
      name?: string;
      description?: string;
      schema?: ToolSchema;
      connectionType?: string;
      endpointUrl?: string;
      pricingModel?: "free" | "freemium" | "paid";
      costPerCall?: number;
      developerAddress?: string;
    } | null;

    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    // Validate required fields and narrow types
    const name = body.name;
    const description = body.description;
    const connectionType = body.connectionType;
    const pricingModel = body.pricingModel;
    const costPerCall = body.costPerCall;
    const developerAddress = body.developerAddress;
    const schema = body.schema;

    if (
      !name ||
      !description ||
      !connectionType ||
      !pricingModel ||
      costPerCall === undefined ||
      !developerAddress
    ) {
      const missing = [
        !name && "name",
        !description && "description",
        !connectionType && "connectionType",
        !pricingModel && "pricingModel",
        costPerCall === undefined && "costPerCall",
        !developerAddress && "developerAddress",
      ]
        .filter(Boolean)
        .join(", ");
      return c.json({ error: `Missing required field(s): ${missing}` }, 400);
    }

    if (!["sse", "stdio", "http", "websocket"].includes(connectionType)) {
      return c.json(
        { error: "Invalid connectionType. Must be one of: sse, stdio, http, websocket" },
        400,
      );
    }
    if (!["free", "freemium", "paid"].includes(pricingModel)) {
      return c.json(
        { error: "Invalid pricingModel. Must be one of: free, freemium, paid" },
        400,
      );
    }
    if (typeof costPerCall !== "number" || costPerCall < 0) {
      return c.json({ error: "costPerCall must be a non-negative number" }, 400);
    }
    if (schema && typeof schema !== "object") {
      return c.json({ error: "schema must be a JSON Schema object" }, 400);
    }

    // Build the tool document
    const namespace = `listing.${name.toLowerCase().replace(/[^a-z0-9.-]/g, "_")}`;

    const tool: Tool = {
      namespace,
      name,
      description,
      schema: schema ?? {
        type: "object",
        properties: {},
        required: [],
      },
      connectionType: connectionType as Tool["connectionType"],
      endpointUrl: body.endpointUrl,
      healthStatus: "active",
      pricing: {
        model: pricingModel,
        costPerCall,
      },
      developer: {
        address: developerAddress,
        listingFeePaid: false,
        listingFeeAmount: 0,
      },
      status: "active",
      updatedAt: new Date(),
    };

    // Generate 3072-dim Gemini embedding from the tool description
    const embedding = await embed(description, "RETRIEVAL_DOCUMENT");
    tool.embedding = embedding;

    // Persist to Atlas (or in-memory dev store)
    await store.upsert(tool);

    // PostHog analytics
    trackSubmission({
      namespace: tool.namespace,
      pricingModel: pricingModel,
      connectionType: connectionType as string,
    });

    // Listing is free - no fee to verify. Monetization happens only on
    // successful invocation via the proxy's platform take-rate.
    return c.json(
      {
        namespace: tool.namespace,
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
        connectionType: tool.connectionType,
        endpointUrl: tool.endpointUrl,
        healthStatus: tool.healthStatus,
        pricing: tool.pricing,
        developer: tool.developer,
        status: tool.status,
        updatedAt: tool.updatedAt.toISOString(),
        embeddingDimensions: tool.embedding?.length ?? null,
        listingFee: 0,
      },
      201,
    );
  },
);

// ── Helper: Format tool record with health and reliability ──

function formatToolRecord(tool: Tool) {
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

// ── Public route: list tools (with filters, pagination, and health/reliability) ──

app.get("/api/tools", async (c) => {
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset") ?? c.req.query("skip");
  const pageParam = c.req.query("page");

  const status = c.req.query("status");
  const connectionType = c.req.query("connectionType") as ConnectionType | undefined;
  const healthStatus = c.req.query("healthStatus") as HealthStatus | undefined;
  const pricingModel = c.req.query("pricingModel");
  const capability = c.req.query("capability") ?? c.req.query("q") ?? c.req.query("keyword");
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
          message: "Allowed values for 'reliability' are: 'high', 'degraded', 'failing', 'unchecked', or 'all'.",
          provided: reliabilityParam,
        },
        400,
      );
    }
  }

  const limit = Math.min(Math.max(1, Number(limitParam ?? 20)), 100);
  let offset = Math.max(0, Number(offsetParam ?? 0));
  if (pageParam && !offsetParam) {
    const page = Math.max(1, Number(pageParam));
    offset = (page - 1) * limit;
  }

  const filter = {
    hasEndpoint,
    status,
    connectionType,
    healthStatus,
    pricingModel,
    capability,
  };

  let tools = await store.list(filter);

  // Apply reliability filter based on derived health
  if (reliabilityParam) {
    const targetReliability = reliabilityParam.toLowerCase().trim();
    if (targetReliability !== "all") {
      tools = tools.filter((t) => deriveReliability(t).reliability === targetReliability);
    }
  }

  const total = tools.length;
  const paginatedTools = tools.slice(offset, offset + limit);
  const formattedTools = paginatedTools.map(formatToolRecord);

  return c.json({
    total,
    count: formattedTools.length,
    limit,
    offset,
    tools: formattedTools,
  });
});

// ── Public route: single-tool specification API endpoint ─────────

async function handleApiToolDetail(c: any) {
  const slug = c.req.param("slug") || c.req.param("namespace");
  if (!slug) {
    return c.json({ error: "Missing tool identifier" }, 400);
  }

  const tool = await findToolBySlug(store, slug);
  if (!tool) {
    return c.json({ error: "Tool not found", slug }, 404);
  }

  return c.json(formatToolRecord(tool));
}

app.get("/api/tools/:slug", handleApiToolDetail);
app.get("/api/tool/:slug", handleApiToolDetail);

// ── Human-facing directory handler (responsive cards + reliability & freshness) ──

export async function handleDirectoryRequest(
  c: any,
  baseUrl: string = "/",
  targetStore?: ToolStore,
) {
  const currentStore = targetStore ?? store ?? (await createStore());
  const searchQuery = c.req.query("q") ?? c.req.query("search");
  const reliability = c.req.query("reliability");
  const connectionType = c.req.query("connectionType") as ConnectionType | undefined;
  const pricingModel = c.req.query("pricingModel");
  const capabilityParam = c.req.query("capability") ?? c.req.query("cap");
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset") ?? c.req.query("skip");

  const limit = Math.min(Math.max(1, Number(limitParam ?? 50)), 100);
  const offset = Math.max(0, Number(offsetParam ?? 0));

  let tools = await currentStore.list({
    connectionType,
    pricingModel,
    capability: capabilityParam,
    q: searchQuery,
  });

  // Filter by reliability if specified (high, degraded, failing, unchecked)
  if (reliability && reliability !== "all") {
    tools = tools.filter((t) => {
      const h = deriveReliability(t);
      return h.reliability === reliability;
    });
  }

  // Filter by capability if specified
  if (capabilityParam && capabilityParam !== "all") {
    const targetCap = capabilityParam.toLowerCase().trim();
    tools = tools.filter(
      (t) =>
        t.capabilities &&
        Array.isArray(t.capabilities) &&
        t.capabilities.some((c) => c.toLowerCase().trim() === targetCap || c.toLowerCase().includes(targetCap)),
    );
  }

  // Ensure matching covers name, namespace, description, and capabilities
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    tools = tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.namespace.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.capabilities && Array.isArray(t.capabilities) && t.capabilities.some((c) => c.toLowerCase().includes(q))),
    );
  }

  const total = tools.length;
  const paginatedTools = tools.slice(offset, offset + limit);

  // Collect all unique capabilities across tools for the filter controls.
  // When a search query is active, facet capabilities reflect matching tools;
  // otherwise, all catalog capabilities are displayed for discovery.
  const allStoreTools = await currentStore.list();
  const facetTools = (searchQuery && searchQuery.trim()) ? tools : allStoreTools;
  const capabilitySet = new Set<string>();
  for (const t of facetTools) {
    if (t.capabilities && Array.isArray(t.capabilities)) {
      for (const cap of t.capabilities) {
        const trimmed = cap.trim();
        if (trimmed) capabilitySet.add(trimmed);
      }
    }
  }
  const availableCapabilities = Array.from(capabilitySet).sort();

  const accept = c.req.header("Accept") ?? "";
  const format = c.req.query("format");
  if (format === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
    return c.json({
      total,
      count: paginatedTools.length,
      limit,
      offset,
      capability: capabilityParam && capabilityParam !== "all" ? capabilityParam : undefined,
      availableCapabilities,
      tools: paginatedTools.map(formatToolRecord),
    });
  }

  return c.html(
    renderDirectoryPage(paginatedTools, total, {
      search: searchQuery,
      reliability,
      connectionType,
      pricingModel,
      capability: capabilityParam,
      availableCapabilities,
      baseUrl,
    }),
  );
}

app.get("/tool", async (c) => {
  return handleDirectoryRequest(c, "/tool");
});

app.get("/tools", async (c) => {
  return handleDirectoryRequest(c, "/tool");
});

// ── Public route: human-facing tool page (responsive detail + reliability) ──

async function handleToolDetail(c: any) {
  const slug = c.req.param("slug");
  if (!slug) {
    return c.html(renderNotFoundPage(""), 404);
  }

  const tool = await findToolBySlug(store, slug);
  if (!tool) {
    const accept = c.req.header("Accept") ?? "";
    const format = c.req.query("format");
    if (format === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
      return c.json({ error: "Tool not found", slug }, 404);
    }
    return c.html(renderNotFoundPage(slug), 404);
  }

  // Content negotiation: return JSON if requested explicitly, otherwise responsive HTML
  const accept = c.req.header("Accept") ?? "";
  const format = c.req.query("format");
  if (format === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
    return c.json(formatToolRecord(tool));
  }

  const relatedTools = await findRelatedTools(store, tool, 3);
  return c.html(renderToolPage(tool, relatedTools));
}

app.get("/tool/:slug", handleToolDetail);
app.get("/tools/:slug", handleToolDetail);

// ── Public route: XML sitemap for search engines & crawler discovery ──

app.get("/sitemap.xml", async (c) => {
  const allTools = await store.list();
  const xml = generateSitemapXml(allTools);
  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return c.body(xml);
});

// ── Public route: robots.txt crawler directives ──

app.get("/robots.txt", (c) => {
  const robots = "User-agent: *\nAllow: /\n\nSitemap: https://aipages.tech/sitemap.xml\n";
  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "public, max-age=86400");
  return c.text(robots);
});

// ── Public route: Capabilities index for directory discovery ──

app.get("/capabilities", async (c) => {
  const allTools = await store.list();
  const publicTools = allTools.filter(
    (t) => t.status !== "rejected" && t.status !== "pending",
  );
  const capabilities = getCapabilityIndex(publicTools);

  const accept = c.req.header("Accept") ?? "";
  const format = c.req.query("format");
  if (
    format === "json" ||
    (accept.includes("application/json") && !accept.includes("text/html"))
  ) {
    return c.json({
      totalCapabilities: capabilities.length,
      totalTools: publicTools.length,
      capabilities,
    });
  }

  return c.html(renderCapabilitiesPage(capabilities, publicTools.length));
});

// ── x402 Base Payment Test Route ─────────────────────────────

app.get("/api/x402-test", x402PaymentMiddleware, (c) => {
  return c.json({
    success: true,
    message: "Access granted! Payment verified successfully via x402 protocol.",
    timestamp: new Date().toISOString(),
  });
});

// ── Agent Scraper Route ──────────────────────────────────────
app.route("/", agentScraperRouter);

// ── Start ──────────────────────────────────────────────────

async function main() {
  store = await createStore();
  let total = await store.count();

  // Wire the invocation gateway (needs the store + MongoDB client for metering).
  const mongoClient = (store instanceof Object && "getClient" in store)
    ? (store as any).getClient()
    : null;
  setStore(store, mongoClient);

  // Initialize persistent rate limiting when MongoDB is available.
  // In dev mode (in-memory store), falls back to in-memory token bucket
  // which is sufficient for single-instance development.
  if (mongoClient) {
    try {
      const db = mongoClient.db("aipages");
      const rateColl = db.collection("rate_limits");
      const mongoStore = new MongoRateStore(rateColl);
      await mongoStore.ensureTtlIndex(3600); // 1-hour TTL
      setRateLimitStore(mongoStore);
      console.log("[rate-limit] MongoDB-backed rate limiting enabled");

      const replayColl = db.collection("consumed_tx_hashes");
      const mongoReplay = new MongoReplayStore(replayColl);
      await mongoReplay.ensureIndexes();
      setReplayStore(mongoReplay);
      console.log("[replay-cache] MongoDB-backed persistent replay protection enabled");
    } catch (err: any) {
      console.warn("[replay-cache] Failed to init persistent stores, using fallback:", err?.message);
    }
  }
  startRateLimitCleanup();

  // Auto-seed in dev mode (in-memory store with no Mongo URI)
  if (total === 0 && !config.MONGODB_URI) {
    console.log("[db] Empty store - auto-seeding sample tools (dev mode)...");
    await seedDevTools(store);
    total = await store.count();
  }

  console.log(`[db] Tools in store: ${total}`);

  // Protect POST /api/invoke/:namespace with strict x402 Base ERC-20 payment middleware
  app.use("/api/invoke/:namespace", async (c, next) => {
    if (c.req.method === "POST") {
      return x402PaymentMiddleware(c, next);
    }
    await next();
  });
  app.use("/api/invoke/:namespace/*", async (c, next) => {
    if (c.req.method === "POST") {
      return x402PaymentMiddleware(c, next);
    }
    await next();
  });
  app.route("/api/invoke", ingestionRouter);

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`\n  AIPages backend running on http://localhost:${info.port}`);
    console.log(`  OpenAPI:  GET /api/openapi.json`);
    console.log(`  Health:   GET /health`);
    console.log(`  Search:   GET /search?q=<query>&limit=<n>  (free)`);
    console.log(`  Tools:    GET /api/tools?limit=<n>&offset=<n>  (free)`);
    console.log(`  Dir Cards:GET /tools  (responsive cards + reliability & freshness)`);
    console.log(`  Submit:   POST /api/tools/submit  (free)`);
    console.log(`  Detail:   GET /api/tools/:namespace`);
    console.log(`  Page:     GET /tools/:slug  (responsive HTML)`);
    console.log(`  Invoke:   POST /api/invoke/:namespace  ($0.25 platform take-rate, premium tools, success-only)`);
    console.log(`  x402:     GET /api/x402-test`);
    console.log(`  Ingest:   POST /ingest  (admin key)`);
    console.log(`  Scrape:   POST /scrape   (admin key)`);
    console.log(`  Agents:   POST /api/scrape-agents\n`);
  });
}

const DEV_SEED_TOOLS: Omit<Tool, "embedding" | "updatedAt">[] = [
  ...CANONICAL_AUS_TOOLS,
  {
    namespace: "net.2xcel.agent-utility",
    name: "web_scraper",
    description:
      "Extracts clean Markdown and structured text from target URLs. Supports JavaScript-rendered pages and returns semantic HTML content.",
    schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target website URL" },
      },
      required: ["url"],
    },
    connectionType: "sse",
    endpointUrl: "https://api.example.com/mcp",
    healthStatus: "active",
    lastChecked: new Date(),
    failureReason: null,
    pricing: { model: "free", costPerCall: 0 },
    capabilities: ["web-scraping", "markdown-extraction"],
  },
  {
    namespace: "io.github.crewai.file-reader",
    name: "file_reader",
    description:
      "Reads files from the local filesystem. Supports text, PDF, and structured data extraction with encoding detection.",
    schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute file path" },
      },
      required: ["path"],
    },
    connectionType: "stdio",
    healthStatus: "active",
    lastChecked: new Date(),
    failureReason: null,
    pricing: { model: "free", costPerCall: 0 },
    capabilities: ["file-reading", "pdf-parsing"],
  },
  {
    namespace: "com.google.gemini-code-assist",
    name: "gemini_code_assist",
    description:
      "Gemini-powered code generation and assistance. Generates code with inline comments, suggests completions, and explains code snippets across multiple programming languages.",
    schema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Code generation or assistance request",
        },
        language: {
          type: "string",
          description: "Target programming language",
        },
      },
      required: ["prompt"],
    },
    connectionType: "http",
    endpointUrl: "https://gemini.google.com/code-assist",
    healthStatus: "active",
    lastChecked: new Date(),
    failureReason: null,
    pricing: { model: "free", costPerCall: 0 },
    capabilities: ["code-generation", "inline-assistance"],
  },
  {
    namespace: "net.huggingface.inference",
    name: "text_classifier",
    description:
      "Classifies text into predefined categories using transformer models. Supports zero-shot classification and sentiment analysis.",
    schema: {
      type: "object",
      properties: {
        text: { type: "string" },
        model: { type: "string" },
      },
      required: ["text"],
    },
    connectionType: "http",
    endpointUrl: "https://api-inference.huggingface.co",
    healthStatus: "active",
    lastChecked: new Date(),
    failureReason: null,
    pricing: { model: "free", costPerCall: 0 },
    capabilities: ["text-classification", "sentiment-analysis"],
  },
  {
    namespace: "io.github.anthropic.mcp-filesystem",
    name: "filesystem",
    description:
      "Model Context Protocol server for filesystem operations: read, write, list, and search files on the local machine.",
    schema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["read", "write", "list", "search"],
        },
      },
      required: ["operation"],
    },
    connectionType: "stdio",
    healthStatus: "active",
    lastChecked: new Date(),
    failureReason: null,
    pricing: { model: "free", costPerCall: 0 },
    capabilities: ["filesystem", "local-io"],
  },
  {
    namespace: "com.stripe.payment-gateway",
    name: "payment_processor",
    description:
      "Processes payments via Stripe. Creates charges, manages subscriptions, and handles webhook events for billing automation.",
    schema: {
      type: "object",
      properties: {
        amount: { type: "number" },
        currency: { type: "string" },
      },
      required: ["amount", "currency"],
    },
    connectionType: "http",
    endpointUrl: "https://api.stripe.com/v1",
    healthStatus: "active",
    lastChecked: new Date(),
    failureReason: null,
    pricing: { model: "free", costPerCall: 0 },
    capabilities: ["payment-processing", "billing-automation"],
  },
];

async function seedDevTools(store: ToolStore): Promise<void> {
  // Pre-release guardrail: assert first-party AUS tools pass strict validation
  assertValidFirstPartyTools(CANONICAL_AUS_TOOLS as unknown as Tool[]);

  for (const raw of DEV_SEED_TOOLS) {
    const text = `${raw.namespace} ${raw.name} ${raw.description} ${(raw.capabilities ?? []).join(" ")}`;
    const embedding = await embed(text);
    const tool: Tool = { ...raw, embedding, updatedAt: new Date() };
    await store.upsert(tool);
  }
}

const isTestRun =
  process.env.NODE_ENV === "test" ||
  process.argv.some((arg) => arg.includes("test"));

if (!isTestRun) {
  main().catch((err) => {
    console.error("Fatal:", err);
    shutdownAnalytics();
    process.exit(1);
  });
}
