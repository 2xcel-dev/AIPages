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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { createStore } from "./db.js";
import { embed } from "./embedding.js";
import { ingestManifests, scrapeGitHub, scrapeNpm } from "./scraper.js";
import { openapi } from "./openapi.js";
import { setStore, default as ingestionRouter } from "./invocation.js";
import { setRateLimitStore, MongoRateStore, startRateLimitCleanup, tokenBucket } from "./rate-limit.js";
import { metrics } from "./metrics.js";
import { trackSubmission, trackSearch, shutdownAnalytics } from "./analytics.js";
import { deriveReliability } from "./types.js";
import { x402PaymentMiddleware, MongoReplayStore, setReplayStore } from "./middleware/x402.js";
import { default as agentScraperRouter } from "./routes/agentScraper.js";
import { findToolBySlug, renderToolPage, renderNotFoundPage, findRelatedTools } from "./views/toolPage.js";
import { renderDirectoryPage } from "./views/directoryPage.js";
import { generateSitemapXml } from "./views/sitemap.js";
import { generateLlmsTxt, generateLlmsFullTxt, generateToolMarkdown } from "./views/llmsTxt.js";
import { getCapabilityIndex, renderCapabilitiesPage, generateCapabilitiesMarkdown } from "./views/capabilitiesPage.js";
import { renderPrivacyPolicyPage, renderRefundPolicyPage, renderTermsPage, renderSubmitToolPage } from "./views/legalPages.js";
import { generateMcpManifest, generateAiPluginManifest } from "./views/agentDiscovery.js";
import { generateBadgeSvg } from "./views/badge.js";
import { CANONICAL_AUS_TOOLS } from "./data/ausTools.js";
import { DISCOVERED_GEMINI_TOOLS } from "./data/discoveredTools.js";
import { assertValidFirstPartyTools } from "./validation/toolValidator.js";
import { handleGetTools, formatToolRecord } from "./api/tools.js";
import { handleSyndicationFeed } from "./api/syndication.js";
export { formatToolRecord };
export const app = new Hono();
// ── Globals ─────────────────────────────────────────────────
let store;
let invokeRoutesMounted = false;
function ensureInvokeRoutesMounted() {
    if (invokeRoutesMounted)
        return;
    invokeRoutesMounted = true;
    app.use("/api/invoke/:namespace", async (c, next) => {
        await getActiveStore();
        if (c.req.method === "POST") {
            const paymentHeader = c.req.header("x-payment") || c.req.header("X-Payment");
            if (paymentHeader) {
                return x402PaymentMiddleware(c, next);
            }
        }
        await next();
    });
    app.use("/api/invoke/:namespace/*", async (c, next) => {
        await getActiveStore();
        if (c.req.method === "POST") {
            const paymentHeader = c.req.header("x-payment") || c.req.header("X-Payment");
            if (paymentHeader) {
                return x402PaymentMiddleware(c, next);
            }
        }
        await next();
    });
    app.route("/api/invoke", ingestionRouter);
}
async function getActiveStore() {
    if (!store) {
        store = await createStore();
        const count = await store.count();
        if (count === 0) {
            for (const raw of CANONICAL_AUS_TOOLS) {
                await store.upsert({ ...raw, updatedAt: new Date() });
            }
        }
        setStore(store);
    }
    return store;
}
export function isAiOrSearchCrawler(userAgent) {
    if (!userAgent)
        return false;
    return /(OAI-SearchBot|ChatGPT-User|GPTBot|ClaudeBot|Claude-Web|PerplexityBot|Google-Extended|Applebot-Extended|CCBot|Googlebot|Bingbot|DuckDuckBot|YandexBot)/i.test(userAgent);
}
// ── Middleware ──────────────────────────────────────────────
app.use("*", cors());
app.use("*", async (c, next) => {
    await next();
    metrics.recordHttpRequest(c.req.method, c.req.path, c.res.status, c.req.header("user-agent"));
});
// ── Public routes ───────────────────────────────────────────
export const DISCOVERY_MANIFEST = {
    name: "AIPages",
    version: "0.1.0",
    status: "running",
    description: "Machine-native discovery registry and vector search index for autonomous AI agent tools.",
    x402: true,
    pricing: {
        "/search": "free",
        "/api/tools/submit": "free",
        "/api/invoke/{namespace}": "$0.25 USDC platform take-rate (premium tools, collected on success only)",
    },
    endpoints: {
        search: "GET /search?q=<natural-language-query>&limit=<n> (free)",
        directory: "GET /tool?reliability=<r>&connectionType=<c>",
        tools: "GET /api/tools?source=<s>&search=<q>&active=<b>&limit=<n>&page=<p>",
        syndication: "GET /api/feed.json (JSON Feed v1.1 syndication)",
        submit: "POST /api/tools/submit (free)",
        toolDetail: "GET /api/tools/:namespace",
        toolPage: "GET /tool/:slug",
        capabilities: "GET /capabilities (functional capability index)",
        sitemap: "GET /sitemap.xml (XML sitemap)",
        llms: "GET /llms.txt (Standard Markdown manifest for LLM crawlers)",
        llmsFull: "GET /llms-full.txt (Full Markdown reference with JSON Schemas and invocation payloads)",
        mcpManifest: "GET /mcp.json (Authoritative MCP discovery manifest)",
        mcpActions: "GET /mcp-actions.json (WebMCP structured action declarations)",
        agentPermissions: "GET /agent-permissions.json (Autonomous crawler and agent permissions policy)",
        agentsMd: "GET /AGENTS.md (Repository and API guide for autonomous coding agents)",
        openapi: "GET /api/openapi.json",
        metrics: "GET /metrics (Prometheus line metrics)",
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
    const userAgent = c.req.header("user-agent") ?? "";
    const format = c.req.query("format");
    const searchQuery = c.req.query("q") ?? c.req.query("search");
    const reliability = c.req.query("reliability");
    const connectionType = c.req.query("connectionType");
    const pricingModel = c.req.query("pricingModel");
    const capability = c.req.query("capability") ?? c.req.query("cap");
    const hasSearchParams = Boolean(searchQuery || reliability || connectionType || pricingModel || capability);
    if (format === "md" || format === "markdown" || accept.includes("text/markdown")) {
        const activeStore = await getActiveStore();
        const allTools = await activeStore.list();
        c.header("Content-Type", "text/markdown; charset=utf-8");
        return c.body(generateLlmsTxt(allTools));
    }
    // Preserve JSON discovery manifest for API/curl clients when no search parameters are supplied,
    // while serving full SSR HTML directory to AI and search crawlers that send Accept: */*
    if (!hasSearchParams) {
        const isCrawler = isAiOrSearchCrawler(userAgent);
        if (format === "json" ||
            (!accept.includes("text/html") &&
                (accept.includes("application/json") || (!isCrawler && (accept === "*/*" || !accept))))) {
            return c.json(DISCOVERY_MANIFEST);
        }
    }
    return handleDirectoryRequest(c, "/");
});
app.get("/health", async (c) => {
    const activeStore = await getActiveStore();
    const ok = await activeStore.ping();
    const total = await activeStore.count().catch(() => 0);
    const mem = process.memoryUsage();
    return c.json({
        status: ok ? "healthy" : "degraded",
        store: ok ? "connected" : "disconnected",
        uptimeSeconds: Math.floor(process.uptime()),
        toolsTotal: total,
        firstPartyEnginesOnline: 15,
        timestamp: new Date().toISOString(),
        memory: {
            heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
            heapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
            rssMb: Number((mem.rss / 1024 / 1024).toFixed(2)),
        },
    });
});
app.get("/metrics", async (c) => {
    const activeStore = await getActiveStore();
    const total = await activeStore.count().catch(() => 0);
    const body = metrics.formatPrometheus(total);
    c.header("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return c.text(body);
});
app.get("/api/openapi.json", (c) => c.json(openapi));
app.get("/openapi.json", (c) => c.json(openapi));
app.get("/.well-known/openapi.json", (c) => c.json(openapi));
app.get("/.well-known/ai-plugin.json", (c) => c.json(generateAiPluginManifest()));
// ── Admin routes (key-gated) ────────────────────────────────
function requireAdminKey(c) {
    const key = c.req.header("X-ADMIN-KEY");
    const expected = process.env.ADMIN_KEY;
    if (!expected)
        return true; // dev: no key configured = open
    return key === expected;
}
app.post("/ingest", async (c) => {
    if (!requireAdminKey(c))
        return c.json({ error: "unauthorized" }, 401);
    const body = await c.req.json();
    if (!Array.isArray(body?.tools)) {
        return c.json({ error: "Expected { tools: [...] }" }, 400);
    }
    const count = await ingestManifests(store, body.tools);
    return c.json({ ingested: count });
});
app.post("/scrape", async (c) => {
    if (!requireAdminKey(c))
        return c.json({ error: "unauthorized" }, 401);
    const maxResults = Number(c.req.query("max") ?? 20);
    const [gh, npm] = await Promise.all([
        scrapeGitHub(maxResults),
        scrapeNpm(maxResults),
    ]);
    const manifests = [
        ...gh.map((item) => ({
            namespace: `github.${item.repository.full_name.toLowerCase().replace(/[^a-z0-9.-]/g, ".")}`,
            name: item.repository.full_name.split("/")[1] ?? item.repository.full_name,
            description: `GitHub repository: ${item.repository.full_name}`,
            connectionType: "http",
            endpointUrl: item.repository.html_url,
        })),
        ...npm.objects.map((obj) => ({
            namespace: `npm.${obj.package.name}`,
            name: obj.package.name,
            description: obj.package.description ?? `npm package: ${obj.package.name}`,
            connectionType: "http",
            endpointUrl: obj.package.links?.repository,
        })),
    ];
    const count = await ingestManifests(store, manifests);
    return c.json({ scraped: manifests.length, ingested: count });
});
// ── Public route: semantic search (free, ungated) ──────────
app.get("/search", async (c) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const limitRes = tokenBucket(`search:${ip}`, 60, 60_000);
    c.header("RateLimit-Limit", "60");
    c.header("RateLimit-Remaining", String(limitRes.remaining));
    c.header("RateLimit-Reset", String(Math.ceil(limitRes.resetAt / 1000)));
    if (!limitRes.allowed) {
        c.header("Retry-After", String(limitRes.retryAfterSec || 1));
        return c.json({ error: "Rate limit exceeded. Search is limited to 60 queries per minute per IP." }, 429);
    }
    const query = c.req.query("q");
    if (!query)
        return c.json({ error: "Missing query parameter: q" }, 400);
    const limit = Math.min(Number(c.req.query("limit") ?? 10), 50);
    const activeStore = await getActiveStore();
    let results = [];
    try {
        const queryEmbedding = await embed(query);
        results = await activeStore.search(queryEmbedding, limit);
    }
    catch (err) {
        console.warn("[search] Vector search failed or hit rate limit, falling back to keyword search:", err);
    }
    // Fallback: If vector search returns 0 results (e.g. Gemini embedding quota/rate limit or index drift),
    // perform resilient keyword & capability matching so developers/agents never receive false empty responses.
    if (results.length === 0) {
        const allTools = await activeStore.list();
        const qLower = query.toLowerCase().trim();
        const terms = qLower.split(/\s+/).filter((t) => t.length > 1);
        const matched = allTools.filter((t) => {
            const corpus = `${t.name} ${t.description ?? ""} ${t.namespace} ${(t.capabilities || []).join(" ")}`.toLowerCase();
            if (corpus.includes(qLower))
                return true;
            if (terms.length > 0 && terms.some((term) => corpus.includes(term)))
                return true;
            if (t.schema?.properties) {
                for (const [propName, propDef] of Object.entries(t.schema.properties)) {
                    if (propName.toLowerCase().includes(qLower))
                        return true;
                    if (terms.some((term) => propName.toLowerCase().includes(term)))
                        return true;
                    if (typeof propDef === "object" &&
                        propDef !== null &&
                        propDef.description?.toLowerCase().includes(qLower)) {
                        return true;
                    }
                }
            }
            return false;
        });
        matched.sort((a, b) => {
            const corpusA = `${a.name} ${a.description ?? ""} ${a.namespace} ${(a.capabilities || []).join(" ")}`.toLowerCase();
            const corpusB = `${b.name} ${b.description ?? ""} ${b.namespace} ${(b.capabilities || []).join(" ")}`.toLowerCase();
            const exactA = corpusA.includes(qLower) ? 10 : 0;
            const exactB = corpusB.includes(qLower) ? 10 : 0;
            const termsA = terms.filter((term) => corpusA.includes(term)).length;
            const termsB = terms.filter((term) => corpusB.includes(term)).length;
            return (exactB + termsB) - (exactA + termsA);
        });
        results = matched.slice(0, limit).map((t) => ({
            namespace: t.namespace,
            name: t.name,
            description: t.description,
            schema: t.schema,
            connectionType: t.connectionType,
            endpointUrl: t.endpointUrl,
            healthStatus: t.healthStatus,
            lastChecked: t.lastChecked,
            failureReason: t.failureReason,
            reliability: deriveReliability(t).reliability,
            score: 0.88,
        }));
    }
    trackSearch({ query, resultCount: results.length });
    return c.json({
        query,
        count: results.length,
        results,
    });
});
// ── Public route: self-serve tool submission (free) ─────────
app.post("/api/tools/submit", async (c) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const limitRes = tokenBucket(`submit:${ip}`, 15, 60_000);
    c.header("RateLimit-Limit", "15");
    c.header("RateLimit-Remaining", String(limitRes.remaining));
    c.header("RateLimit-Reset", String(Math.ceil(limitRes.resetAt / 1000)));
    if (!limitRes.allowed) {
        c.header("Retry-After", String(limitRes.retryAfterSec || 1));
        return c.json({ error: "Rate limit exceeded. Tool submission is limited to 15 requests per minute per IP." }, 429);
    }
    const contentType = (c.req.header("content-type") ?? "").toLowerCase();
    let body = null;
    if (contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")) {
        const formData = await c.req.parseBody().catch(() => null);
        if (formData) {
            let parsedSchema;
            if (typeof formData.schema === "string" && formData.schema.trim()) {
                try {
                    parsedSchema = JSON.parse(formData.schema);
                }
                catch {
                    return c.json({ error: "schema must be a JSON Schema object" }, 400);
                }
            }
            body = {
                name: typeof formData.name === "string" ? formData.name.trim() : undefined,
                description: typeof formData.description === "string" ? formData.description.trim() : undefined,
                connectionType: typeof formData.connectionType === "string" ? formData.connectionType.trim() : undefined,
                endpointUrl: typeof formData.endpointUrl === "string" && formData.endpointUrl.trim()
                    ? formData.endpointUrl.trim()
                    : undefined,
                pricingModel: typeof formData.pricingModel === "string"
                    ? formData.pricingModel.trim()
                    : undefined,
                costPerCall: formData.costPerCall !== undefined && formData.costPerCall !== ""
                    ? Number(formData.costPerCall)
                    : undefined,
                developerAddress: typeof formData.developerAddress === "string" ? formData.developerAddress.trim() : undefined,
                schema: parsedSchema,
            };
        }
    }
    else {
        body = await c.req.json().catch(() => null);
    }
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
    if (!name ||
        !description ||
        !connectionType ||
        !pricingModel ||
        costPerCall === undefined ||
        !developerAddress) {
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
        return c.json({ error: "Invalid connectionType. Must be one of: sse, stdio, http, websocket" }, 400);
    }
    if (!["free", "freemium", "paid"].includes(pricingModel)) {
        return c.json({ error: "Invalid pricingModel. Must be one of: free, freemium, paid" }, 400);
    }
    if (typeof costPerCall !== "number" || costPerCall < 0) {
        return c.json({ error: "costPerCall must be a non-negative number" }, 400);
    }
    if (schema && typeof schema !== "object") {
        return c.json({ error: "schema must be a JSON Schema object" }, 400);
    }
    // Build the tool document
    const namespace = `listing.${name.toLowerCase().replace(/[^a-z0-9.-]/g, "_")}`;
    const tool = {
        namespace,
        name,
        description,
        schema: schema ?? {
            type: "object",
            properties: {},
            required: [],
        },
        connectionType: connectionType,
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
    const activeStore = await getActiveStore();
    await activeStore.upsert(tool);
    // PostHog analytics
    trackSubmission({
        namespace: tool.namespace,
        pricingModel: pricingModel,
        connectionType: connectionType,
    });
    // Listing is free - no fee to verify. Monetization happens only on
    // successful invocation via the proxy's platform take-rate.
    return c.json({
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
    }, 201);
});
// ── Public route: list tools (with source, search, active, pagination, and health) ──
app.get("/api/tools", async (c) => {
    const activeStore = await getActiveStore();
    return handleGetTools(c, activeStore);
});
// ── Public route: standard JSON syndication feed (JSON Feed v1.1) ──
app.get("/api/feed.json", async (c) => handleSyndicationFeed(c, await getActiveStore()));
app.get("/api/syndication", async (c) => handleSyndicationFeed(c, await getActiveStore()));
app.get("/api/syndication/feed.json", async (c) => handleSyndicationFeed(c, await getActiveStore()));
app.get("/feed.json", async (c) => handleSyndicationFeed(c, await getActiveStore()));
// ── Public route: single-tool specification API endpoint ─────────
async function handleApiToolDetail(c) {
    const slug = c.req.param("slug") || c.req.param("namespace");
    if (!slug) {
        return c.json({ error: "Missing tool identifier" }, 400);
    }
    const activeStore = await getActiveStore();
    const tool = await findToolBySlug(activeStore, slug);
    if (!tool) {
        return c.json({ error: "Tool not found", slug }, 404);
    }
    return c.json(formatToolRecord(tool));
}
app.get("/api/tools/:slug", handleApiToolDetail);
app.get("/api/tool/:slug", handleApiToolDetail);
// ── Human-facing directory handler (responsive cards + reliability & freshness) ──
export async function handleDirectoryRequest(c, baseUrl = "/", targetStore) {
    const currentStore = targetStore ?? store ?? (await createStore());
    const searchQuery = c.req.query("q") ?? c.req.query("search");
    const reliability = c.req.query("reliability");
    const connectionType = c.req.query("connectionType");
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
        tools = tools.filter((t) => t.capabilities &&
            Array.isArray(t.capabilities) &&
            t.capabilities.some((c) => c.toLowerCase().trim() === targetCap || c.toLowerCase().includes(targetCap)));
    }
    // Ensure matching covers name, namespace, description, and capabilities
    if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const terms = q.split(/\s+/).filter((term) => term.length > 1);
        tools = tools.filter((t) => {
            const corpus = `${t.name} ${t.namespace} ${t.description ?? ""} ${(t.capabilities || []).join(" ")}`.toLowerCase();
            if (corpus.includes(q))
                return true;
            if (terms.length > 1 && terms.some((term) => corpus.includes(term)))
                return true;
            return false;
        });
    }
    const total = tools.length;
    const paginatedTools = tools.slice(offset, offset + limit);
    // Collect all unique capabilities across tools for the filter controls.
    // When a search query is active, facet capabilities reflect matching tools;
    // otherwise, all catalog capabilities are displayed for discovery.
    const allStoreTools = await currentStore.list();
    const facetTools = (searchQuery && searchQuery.trim()) ? tools : allStoreTools;
    const capabilitySet = new Set();
    for (const t of facetTools) {
        if (t.capabilities && Array.isArray(t.capabilities)) {
            for (const cap of t.capabilities) {
                const trimmed = cap.trim();
                if (trimmed)
                    capabilitySet.add(trimmed);
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
    return c.html(renderDirectoryPage(paginatedTools, total, {
        search: searchQuery,
        reliability,
        connectionType,
        pricingModel,
        capability: capabilityParam,
        availableCapabilities,
        baseUrl,
    }));
}
app.get("/tool", async (c) => {
    return handleDirectoryRequest(c, "/tool");
});
app.get("/tools", async (c) => {
    return handleDirectoryRequest(c, "/tool");
});
// ── Public route: human-facing tool page (responsive detail + reliability) ──
async function handleToolDetail(c) {
    const rawSlug = c.req.param("slug");
    if (!rawSlug) {
        return c.html(renderNotFoundPage(""), 404);
    }
    const isMdExtension = rawSlug.endsWith(".md");
    const slug = isMdExtension ? rawSlug.slice(0, -3) : rawSlug;
    const activeStore = await getActiveStore();
    const tool = await findToolBySlug(activeStore, slug);
    if (!tool) {
        const accept = c.req.header("Accept") ?? "";
        const format = c.req.query("format");
        if (format === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
            return c.json({ error: "Tool not found", slug }, 404);
        }
        return c.html(renderNotFoundPage(slug), 404);
    }
    // Content negotiation: return JSON or Markdown if requested explicitly, otherwise responsive HTML
    const accept = c.req.header("Accept") ?? "";
    const format = c.req.query("format");
    if (format === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
        return c.json(formatToolRecord(tool));
    }
    const relatedTools = await findRelatedTools(activeStore, tool, 3);
    if (isMdExtension || format === "md" || format === "markdown" || accept.includes("text/markdown")) {
        const markdown = generateToolMarkdown(tool, relatedTools);
        c.header("Content-Type", "text/markdown; charset=utf-8");
        c.header("Cache-Control", "public, max-age=3600");
        return c.body(markdown);
    }
    return c.html(renderToolPage(tool, relatedTools));
}
app.get("/tool/:slug", handleToolDetail);
app.get("/tools/:slug", handleToolDetail);
// ── Interactive GitHub Verification Badge Routes (/badge/:slug) ───────
async function handleBadge(c) {
    let slug = c.req.param("slug") || "";
    if (slug.endsWith(".svg")) {
        slug = slug.slice(0, -4);
    }
    const activeStore = await getActiveStore();
    const tool = await findToolBySlug(activeStore, slug);
    const label = c.req.query("label");
    const status = c.req.query("status");
    const color = c.req.query("color");
    const svg = generateBadgeSvg(tool || slug, { label, status, color });
    c.header("Content-Type", "image/svg+xml; charset=utf-8");
    c.header("Cache-Control", "public, max-age=300, s-maxage=600");
    return c.body(svg);
}
app.get("/badge/:slug", handleBadge);
app.get("/badge/:slug.svg", handleBadge);
app.get("/api/badge/:slug", handleBadge);
app.get("/api/badge/:slug.svg", handleBadge);
// ── Direct Tool Invocation Handlers (/tool/:slug & /tools/:slug) ───────
async function handleDirectToolInvoke(c) {
    const slug = c.req.param("slug");
    if (!slug) {
        return c.json({ error: "Missing tool identifier parameter" }, 400);
    }
    const activeStore = await getActiveStore();
    ensureInvokeRoutesMounted();
    const tool = await findToolBySlug(activeStore, slug);
    if (!tool) {
        return c.json({ error: `Tool with identifier '${slug}' not found.` }, 404);
    }
    // Internal route dispatch to /api/invoke/:namespace
    const invokeUrl = new URL(`/api/invoke/${tool.namespace}${c.req.url.includes("?") ? c.req.url.slice(c.req.url.indexOf("?")) : ""}`, c.req.url);
    const forwardHeaders = new Headers(c.req.raw.headers);
    if (!forwardHeaders.has("x-agent-id")) {
        forwardHeaders.set("x-agent-id", "browser-playground");
    }
    if (c.req.query("test") === "true" || c.req.query("sandbox") === "true") {
        forwardHeaders.set("x-playground-test", "true");
    }
    const reqContentType = (c.req.header("content-type") ?? "").toLowerCase();
    if (reqContentType.includes("application/x-www-form-urlencoded") ||
        reqContentType.includes("multipart/form-data")) {
        const formData = await c.req.parseBody().catch(() => ({}));
        const rawPayload = typeof formData.payload === "string" && formData.payload.trim()
            ? formData.payload.trim()
            : "{}";
        const receipt = (typeof formData["x-payment-receipt"] === "string" && formData["x-payment-receipt"].trim()) ||
            (typeof formData.paymentReceipt === "string" && formData.paymentReceipt.trim()) ||
            "";
        if (receipt) {
            forwardHeaders.set("x-payment-receipt", receipt);
            forwardHeaders.set("X-Payment", receipt);
        }
        forwardHeaders.set("content-type", "application/json");
        forwardHeaders.delete("content-length");
        const forwardReq = new Request(invokeUrl.toString(), {
            method: "POST",
            headers: forwardHeaders,
            body: rawPayload,
        });
        return app.fetch(forwardReq);
    }
    const forwardReq = new Request(invokeUrl.toString(), {
        method: "POST",
        headers: forwardHeaders,
        body: c.req.raw.body,
        duplex: "half",
    });
    return app.fetch(forwardReq);
}
app.post("/tool/:slug", handleDirectToolInvoke);
app.post("/tools/:slug", handleDirectToolInvoke);
// ── Public route: XML sitemap for search engines & crawler discovery ──
app.get("/sitemap.xml", async (c) => {
    const activeStore = await getActiveStore();
    const allTools = await activeStore.list();
    const xml = generateSitemapXml(allTools);
    c.header("Content-Type", "application/xml; charset=utf-8");
    c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return c.body(xml);
});
// ── Public route: robots.txt crawler directives ──
export const ROBOTS_TXT = [
    "# AI Crawler Access Policy - AIPages (https://aipages.tech)",
    "# Last updated: 2026-11-10",
    "",
    "# --- AI Search & Citation Crawlers (Allow - drives agent & developer citations) ---",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Claude-Web",
    "Allow: /",
    "",
    "# --- AI Foundation Model & Coding Assistant Crawlers (Allow - indexes tool schemas) ---",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    "User-agent: Applebot-Extended",
    "Allow: /",
    "",
    "User-agent: CCBot",
    "Allow: /",
    "",
    "# --- Aggressive Unwanted Scrapers (Block) ---",
    "User-agent: Bytespider",
    "Disallow: /",
    "",
    "# --- Default Rule ---",
    "User-agent: *",
    "Allow: /",
    "",
    "Sitemap: https://aipages.tech/sitemap.xml",
    "# LLM Discovery: https://aipages.tech/llms.txt",
    "# Full LLM Schema Dump: https://aipages.tech/llms-full.txt",
    "",
].join("\n");
app.get("/robots.txt", (c) => {
    c.header("Content-Type", "text/plain; charset=utf-8");
    c.header("Cache-Control", "public, max-age=86400");
    return c.text(ROBOTS_TXT);
});
// ── Public route: IndexNow & Search Engine Verification Key ──
app.get("/:filename", async (c, next) => {
    const filename = c.req.param("filename") || "";
    // 1. IndexNow verification key (.txt)
    if (filename.endsWith(".txt") && /^[a-z0-9_-]{8,64}\.txt$/i.test(filename)) {
        const key = filename.replace(/\.txt$/i, "");
        c.header("Content-Type", "text/plain; charset=utf-8");
        return c.text(key);
    }
    // 2. Google Search Console HTML verification file (e.g. google1234567890abcdef.html)
    if (/^google[a-z0-9]+\.html$/i.test(filename)) {
        c.header("Content-Type", "text/html; charset=utf-8");
        return c.text(`google-site-verification: ${filename}`);
    }
    // 3. Bing Webmaster verification file (e.g. BingSiteAuth.xml)
    if (/^BingSiteAuth\.xml$/i.test(filename)) {
        c.header("Content-Type", "application/xml; charset=utf-8");
        return c.text(`<?xml version="1.0"?><users><user>AIPAGES_BING_VERIFICATION</user></users>`);
    }
    return next();
});
// ── Public route: llms.txt & llms-full.txt standard manifests for AI crawlers & agents ──
app.get("/llms.txt", async (c) => {
    const activeStore = await getActiveStore();
    const allTools = await activeStore.list();
    const markdown = generateLlmsTxt(allTools);
    c.header("Content-Type", "text/markdown; charset=utf-8");
    c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return c.body(markdown);
});
app.get("/llms-full.txt", async (c) => {
    const activeStore = await getActiveStore();
    const allTools = await activeStore.list();
    const markdown = generateLlmsFullTxt(allTools);
    c.header("Content-Type", "text/markdown; charset=utf-8");
    c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return c.body(markdown);
});
app.get("/AGENTS.md", (c) => {
    let content = "# AGENTS.md\n\nSee https://aipages.tech/llms.txt and https://aipages.tech/llms-full.txt\n";
    try {
        const agentsPath = path.resolve(process.cwd(), "AGENTS.md");
        if (fs.existsSync(agentsPath)) {
            content = fs.readFileSync(agentsPath, "utf8");
        }
    }
    catch {
        // fallback
    }
    c.header("Content-Type", "text/markdown; charset=utf-8");
    c.header("Cache-Control", "public, max-age=3600");
    return c.body(content);
});
// ── Public route: Authoritative MCP Discovery Manifest (/mcp.json) ──
async function handleMcpManifest(c) {
    const activeStore = await getActiveStore();
    const allTools = await activeStore.list();
    const manifest = generateMcpManifest(allTools);
    return c.json({
        ...manifest,
        documentationUrl: "https://aipages.tech/llms-full.txt",
        openApiUrl: "https://aipages.tech/api/openapi.json",
        syndicationFeedUrl: "https://aipages.tech/api/feed.json",
    });
}
app.get("/mcp.json", handleMcpManifest);
app.get("/.well-known/mcp.json", handleMcpManifest);
// ── Public route: Agent Permissions & WebMCP Action Declarations ──
export const AGENT_PERMISSIONS_MANIFEST = {
    schemaVersion: "0.1.0",
    site: "https://aipages.tech",
    name: "AIPages Autonomous Agent Tool Registry",
    defaultPolicy: "allow",
    crawlers: {
        allow: [
            "OAI-SearchBot",
            "ChatGPT-User",
            "GPTBot",
            "ClaudeBot",
            "Claude-Web",
            "PerplexityBot",
            "Google-Extended",
            "Applebot-Extended",
            "CCBot",
            "Googlebot",
            "Bingbot",
        ],
        disallow: ["Bytespider"],
    },
    discoveryFiles: {
        llmsTxt: "https://aipages.tech/llms.txt",
        llmsFullTxt: "https://aipages.tech/llms-full.txt",
        agentsMd: "https://aipages.tech/AGENTS.md",
        mcpManifest: "https://aipages.tech/mcp.json",
        mcpActions: "https://aipages.tech/mcp-actions.json",
        openApi: "https://aipages.tech/api/openapi.json",
        jsonFeed: "https://aipages.tech/api/feed.json",
        sitemap: "https://aipages.tech/sitemap.xml",
    },
    authentication: {
        discovery: "none (100% free and ungated)",
        sandboxTest: "Include header 'x-playground-test: true' and 'x-agent-id: browser-playground' for zero-cost test execution",
        productionInvoke: "HTTP 402 (x402 protocol) on Base Mainnet (Chain ID 8453, eip155:8453) in USDC via 'x-payment-receipt' or 'X-Payment' header",
    },
    rateLimits: {
        "/search": "60 requests per 60 seconds per IP",
        "/api/tools": "100 requests per 60 seconds per IP",
        "/api/tools/submit": "15 requests per 60 seconds per IP",
        "/api/invoke/:namespace": "100 requests per 60 seconds per IP",
    },
};
app.get("/agent-permissions.json", (c) => c.json(AGENT_PERMISSIONS_MANIFEST));
app.get("/.well-known/agent-permissions.json", (c) => c.json(AGENT_PERMISSIONS_MANIFEST));
export const MCP_ACTIONS_MANIFEST = {
    schemaVersion: "0.1.0",
    site: "https://aipages.tech",
    actions: [
        {
            id: "search-tools",
            name: "Search Autonomous Agent Tools",
            description: "Perform semantic vector search (3072-dim Gemini embeddings) across indexed agent tools.",
            method: "GET",
            endpoint: "https://aipages.tech/search",
            selector: 'form[data-mcp-action="search-tools"]',
            authentication: "none",
            parameters: {
                q: { type: "string", required: true, description: "Natural-language capability or intent query" },
                limit: { type: "integer", required: false, default: 10, maximum: 50 },
            },
        },
        {
            id: "list-tools",
            name: "List Tools Registry",
            description: "Retrieve paginated tool records with health, freshness, and reliability status.",
            method: "GET",
            endpoint: "https://aipages.tech/api/tools",
            authentication: "none",
            parameters: {
                search: { type: "string", required: false },
                capability: { type: "string", required: false },
                source: { type: "string", required: false },
                active: { type: "boolean", required: false },
                limit: { type: "integer", required: false, default: 20 },
                page: { type: "integer", required: false, default: 1 },
            },
        },
        {
            id: "get-tool-markdown",
            name: "Get Token-Budgeted Tool Markdown Specification",
            description: "Fetch clean Markdown documentation and JSON Schema for a specific tool.",
            method: "GET",
            endpoint: "https://aipages.tech/tool/{namespace}.md",
            authentication: "none",
            parameters: {
                namespace: { type: "string", required: true, description: "Tool namespace or slug" },
            },
        },
        {
            id: "submit-tool",
            name: "Submit Tool to AIPages Registry",
            description: "Self-serve registration of a new MCP server or HTTP tool schema (free).",
            method: "POST",
            endpoint: "https://aipages.tech/api/tools/submit",
            authentication: "none",
            bodySchema: {
                type: "object",
                required: ["name", "description", "connectionType", "pricingModel", "costPerCall", "developerAddress"],
                properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    connectionType: { type: "string", enum: ["sse", "stdio", "http", "websocket"] },
                    endpointUrl: { type: "string" },
                    pricingModel: { type: "string", enum: ["free", "freemium", "paid"] },
                    costPerCall: { type: "number" },
                    developerAddress: { type: "string" },
                    schema: { type: "object" },
                },
            },
        },
        {
            id: "invoke-tool",
            name: "Invoke Autonomous Agent Tool",
            description: "Execute a registered tool via the hardened AIPages gateway. Supports 0-friction sandbox testing ('x-playground-test: true') and Base Mainnet x402 USDC settlement ('x-payment-receipt').",
            method: "POST",
            endpoint: "https://aipages.tech/tool/{namespace}",
            selector: 'form[data-mcp-action="invoke-tool"]',
            authentication: "x402 or sandbox header",
            headers: {
                "Content-Type": "application/json",
                "x-playground-test": "Optional: set to 'true' for free 0-friction sandbox execution",
                "x-payment-receipt": "Required for production paid tools: settled Base USDC tx hash",
            },
        },
    ],
};
app.get("/mcp-actions.json", (c) => c.json(MCP_ACTIONS_MANIFEST));
app.get("/.well-known/mcp-actions.json", (c) => c.json(MCP_ACTIONS_MANIFEST));
// ── Public route: Capabilities index for directory discovery ──
app.get("/capabilities", async (c) => {
    const activeStore = await getActiveStore();
    const allTools = await activeStore.list();
    const publicTools = allTools.filter((t) => t.status !== "rejected" && t.status !== "pending");
    const capabilities = getCapabilityIndex(publicTools);
    const accept = c.req.header("Accept") ?? "";
    const format = c.req.query("format");
    if (format === "json" ||
        (accept.includes("application/json") && !accept.includes("text/html"))) {
        return c.json({
            totalCapabilities: capabilities.length,
            totalTools: publicTools.length,
            capabilities,
        });
    }
    if (format === "md" || format === "markdown" || accept.includes("text/markdown")) {
        const markdown = generateCapabilitiesMarkdown(capabilities, publicTools.length);
        c.header("Content-Type", "text/markdown; charset=utf-8");
        c.header("Cache-Control", "public, max-age=3600");
        return c.body(markdown);
    }
    return c.html(renderCapabilitiesPage(capabilities, publicTools.length));
});
// ── Public routes: Authorized Governance, Policies, Submit Portal & Google Flow Assets ──
app.get("/privacy", (c) => {
    const accept = c.req.header("Accept") ?? "";
    if (c.req.query("format") === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
        return c.json({
            policy: "Privacy Policy",
            effectiveDate: "2026-11-10",
            dataRetention: "ephemeral-zero-retention",
            payloadStorage: false,
            walletCustody: "non-custodial",
            url: "https://aipages.tech/privacy",
        });
    }
    return c.html(renderPrivacyPolicyPage());
});
app.get("/refund-policy", (c) => {
    const accept = c.req.header("Accept") ?? "";
    if (c.req.query("format") === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
        return c.json({
            policy: "24-Hour USDT Refund Policy",
            effectiveDate: "2026-11-10",
            settlementCurrency: "USDT",
            network: "Base Mainnet (Chain ID 8453)",
            chargeOnFailure: false,
            refundWindowHours: 24,
            url: "https://aipages.tech/refund-policy",
        });
    }
    return c.html(renderRefundPolicyPage());
});
app.get("/refunds", (c) => c.html(renderRefundPolicyPage()));
app.get("/terms", (c) => {
    const accept = c.req.header("Accept") ?? "";
    if (c.req.query("format") === "json" || (accept.includes("application/json") && !accept.includes("text/html"))) {
        return c.json({
            policy: "Terms of Service",
            effectiveDate: "2026-11-10",
            settlementProtocol: "HTTP 402 (x402) Base Mainnet USDT",
            listingFee: "0.00 USDT",
            url: "https://aipages.tech/terms",
        });
    }
    return c.html(renderTermsPage());
});
app.get("/submit", (c) => {
    return c.html(renderSubmitToolPage());
});
app.get("/assets/flow/:file", (c) => {
    const rawFile = c.req.param("file") || "";
    const safeFile = path.basename(rawFile);
    if (!safeFile.endsWith(".jpg") && !safeFile.endsWith(".jpeg") && !safeFile.endsWith(".png")) {
        return c.text("Not found", 404);
    }
    const candidate1 = path.resolve(process.cwd(), "assets", "flow", safeFile);
    const candidate2 = path.resolve(process.cwd(), "dist", "assets", "flow", safeFile);
    const filePath = fs.existsSync(candidate1) ? candidate1 : candidate2;
    try {
        if (!fs.existsSync(filePath)) {
            return c.text("Asset not found", 404);
        }
        const buf = fs.readFileSync(filePath);
        c.header("Content-Type", safeFile.endsWith(".png") ? "image/png" : "image/jpeg");
        c.header("Cache-Control", "public, max-age=86400");
        return c.body(buf);
    }
    catch {
        return c.text("Failed to read asset", 500);
    }
});
// ── x402 Base Payment Test Route ─────────────────────────────
app.get("/api/x402-test", x402PaymentMiddleware, (c) => {
    return c.json({
        success: true,
        message: "Access granted! Payment verified successfully via x402 protocol.",
        timestamp: new Date().toISOString(),
    });
});
// ── Agent Scraper & Invoke Routes ────────────────────────────
ensureInvokeRoutesMounted();
app.route("/", agentScraperRouter);
// ── App Initialization & Startup ──────────────────────────
export async function initApp() {
    if (!store) {
        store = await createStore();
        let total = await store.count();
        // Wire the invocation gateway (needs the store + MongoDB client for metering).
        const mongoClient = (store instanceof Object && "getClient" in store)
            ? store.getClient()
            : null;
        setStore(store, mongoClient);
        // Initialize persistent rate limiting when MongoDB is available.
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
            }
            catch (err) {
                console.warn("[replay-cache] Failed to init persistent stores, using fallback:", err?.message);
            }
        }
        startRateLimitCleanup();
        // Auto-seed in dev mode or fresh store if empty
        if (total === 0) {
            console.log("[db] Empty store - auto-seeding sample tools...");
            await seedDevTools(store);
            total = await store.count();
        }
        // Always ensure all canonical first-party AUS tools and discovered tools exist in store
        const ausSynced = await syncCanonicalAusTools(store);
        if (ausSynced > 0) {
            console.log(`[db] Synced ${ausSynced} first-party/discovered tools into store.`);
            total = await store.count();
        }
        console.log(`[db] Tools in store: ${total}`);
        ensureInvokeRoutesMounted();
    }
    return { store, app };
}
async function main() {
    await initApp();
    serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" }, (info) => {
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
const DEV_SEED_TOOLS = [
    ...CANONICAL_AUS_TOOLS,
    {
        namespace: "net.2xcel.agent-utility",
        name: "web_scraper",
        description: "Extracts clean Markdown and structured text from target URLs. Supports JavaScript-rendered pages and returns semantic HTML content.",
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
        description: "Reads files from the local filesystem. Supports text, PDF, and structured data extraction with encoding detection.",
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
        description: "Gemini-powered code generation and assistance. Generates code with inline comments, suggests completions, and explains code snippets across multiple programming languages.",
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
        description: "Classifies text into predefined categories using transformer models. Supports zero-shot classification and sentiment analysis.",
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
        description: "Model Context Protocol server for filesystem operations: read, write, list, and search files on the local machine.",
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
        description: "Processes payments via Stripe. Creates charges, manages subscriptions, and handles webhook events for billing automation.",
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
export async function syncCanonicalAusTools(store) {
    let synced = 0;
    // Pre-release guardrail: assert first-party AUS tools pass strict validation
    assertValidFirstPartyTools(CANONICAL_AUS_TOOLS);
    // Check which canonical AUS tools and discovered tools are missing from the store and upsert them
    const allFleetTools = [...CANONICAL_AUS_TOOLS, ...DISCOVERED_GEMINI_TOOLS];
    for (const raw of allFleetTools) {
        const existing = await store.getByNamespace(raw.namespace);
        if (!existing) {
            const text = `${raw.namespace} ${raw.name} ${raw.description} ${(raw.capabilities ?? []).join(" ")}`;
            const embedding = await embed(text);
            const tool = { ...raw, embedding, updatedAt: new Date() };
            await store.upsert(tool);
            synced++;
        }
    }
    return synced;
}
async function seedDevTools(store) {
    // Pre-release guardrail: assert first-party AUS tools pass strict validation
    assertValidFirstPartyTools(CANONICAL_AUS_TOOLS);
    for (const raw of DEV_SEED_TOOLS) {
        const text = `${raw.namespace} ${raw.name} ${raw.description} ${(raw.capabilities ?? []).join(" ")}`;
        const embedding = await embed(text);
        const tool = { ...raw, embedding, updatedAt: new Date() };
        await store.upsert(tool);
    }
}
const isMainModule = process.argv[1] &&
    fileURLToPath(import.meta.url).replace(/\.ts$/, ".js") ===
        path.resolve(process.argv[1]).replace(/\.ts$/, ".js");
if (isMainModule) {
    main().catch((err) => {
        console.error("Fatal:", err);
        shutdownAnalytics();
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map