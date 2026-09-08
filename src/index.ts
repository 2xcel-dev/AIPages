/**
 * AIPages Backend — main application entry point.
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
import type { Tool, ToolSchema, ConnectionType, HealthStatus } from "./types.js";
const app = new Hono();

// ── Globals ─────────────────────────────────────────────────
let store: ToolStore;

// ── Middleware ──────────────────────────────────────────────
app.use("*", cors());

// ── Public routes ───────────────────────────────────────────

app.get("/", (c) =>
  c.json({
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
      submit: "POST /api/tools/submit (free)",
      toolDetail: "GET /api/tools/:namespace",
      openapi: "GET /api/openapi.json",
      ingest: "POST /ingest (admin key required)",
      scrape: "POST /scrape (admin key required)",
    },
    payment: {
      network: config.x402Network,
      currency: "USDC",
      model: "execution-only",
      platformFee: `$${config.x402PriceUsdc} USDC per premium invocation`,
      note: "Discovery and listing are free. The platform earns a flat take-rate only when a premium tool invocation succeeds.",
    },
    openapi: "/api/openapi.json",
  }),
);

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

    // Listing is free — no fee to verify. Monetization happens only on
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

// ── Public route: tool detail by namespace ──────────────────

app.get("/api/tools/:namespace", async (c) => {
  const namespace = c.req.param("namespace");
  if (!namespace) {
    return c.json({ error: "Missing namespace" }, 400);
  }

  const tool = await store.getByNamespace(namespace);
  if (!tool) {
    return c.json({ error: "Tool not found" }, 404);
  }

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
    schemaSource: tool.schemaSource ?? null,
  });
});

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
    } catch (err: any) {
      console.warn("[rate-limit] Failed to init MongoRateStore, using in-memory:", err?.message);
    }
  }
  startRateLimitCleanup();

  // Auto-seed in dev mode (in-memory store with no Mongo URI)
  if (total === 0 && !config.MONGODB_URI) {
    console.log("[db] Empty store — auto-seeding sample tools (dev mode)…");
    await seedDevTools(store);
    total = await store.count();
  }

  console.log(`[db] Tools in store: ${total}`);

  app.route("/api/invoke", ingestionRouter);

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`\n  AIPages backend running on http://localhost:${info.port}`);
    console.log(`  OpenAPI:  GET /api/openapi.json`);
    console.log(`  Health:   GET /health`);
    console.log(`  Search:   GET /search?q=<query>&limit=<n>  (free)`);
    console.log(`  Submit:   POST /api/tools/submit  (free)`);
    console.log(`  Detail:   GET /api/tools/:namespace`);
    console.log(`  Invoke:   POST /api/invoke/:namespace  ($0.25 platform take-rate, premium tools, success-only)`);
    console.log(`  Ingest:   POST /ingest  (admin key)`);
    console.log(`  Scrape:   POST /scrape   (admin key)\n`);
  });
}

const DEV_SEED_TOOLS: Omit<Tool, "embedding" | "updatedAt">[] = [
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
  },
];

async function seedDevTools(store: ToolStore): Promise<void> {
  for (const raw of DEV_SEED_TOOLS) {
    const text = `${raw.namespace} ${raw.name} ${raw.description}`;
    const embedding = await embed(text);
    const tool: Tool = { ...raw, embedding, updatedAt: new Date() };
    await store.upsert(tool);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
