# AIPages Backend

Machine-native discovery registry and vector search index for autonomous AI agent tools.

## What it does

AIPages exposes a high-speed **vector search API** that lets software agents discover, authenticate, and connect to tool schemas dynamically — by natural-language semantic intent, not by keyword.

- **Scrape & Ingest (authoritative):** The crawler discovers GitHub repos shipping `mcp.json` or OpenAPI/Swagger manifests, and ingests **only** tools whose schema is parsed verbatim from a genuine manifest. No LLM-inferred or guessed schemas — repos without a parseable manifest are rejected.
- **Vector Indexing:** Embeds tool definitions via Gemini `gemini-embedding-001` (3072-dim) and stores them in MongoDB Atlas Vector Search.
- **Free Discovery & Listing:** The `/search`, directory browsing, and listing-submission endpoints are 100% free and open — no payment, no authentication, no rate tolls. Monetization is execution-only (see below).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set MONGODB_URI and GEMINI_API_KEY for production,
# or leave them empty to run in dev mode (in-memory store + pseudo-embeddings).

# 3. Seed sample tools (dev)
npm run seed

# 4. Start the server
npm run dev          # hot reload via tsx
# or: npm run build && npm start  # compiled
```

## API

### `GET /` — Health & Pricing
Public. Returns service status, pricing manifest, and endpoint map.

### `GET /health`
Public. Returns store connectivity status.

### `GET /search?q=<query>&limit=<n>` — Semantic Search (Free)
**Free and open.** No payment, no authentication, no rate tolls. Returns top-k tools matching natural-language intent.

```bash
curl 'http://localhost:3000/search?q=scrape+web+pages+into+markdown&limit=5'
```

### `GET /api/tools/:namespace` — Tool Detail (Free)
Public. Returns full execution metadata (schema, pricing, connection type, endpoint URL) for a single tool.

### `POST /ingest` — Bulk Ingest (Admin)
Admin-key-gated. Body: `{ "tools": [{ "namespace": "...", "name": "...", "description": "...", "schema": {...}, "connectionType": "sse", "endpointUrl": "..." }] }`

### `POST /scrape` — Trigger Scrape (Admin)
Admin-key-gated. Scrapes GitHub + npm for tool manifests and ingests them.

### `POST /api/tools/submit` — Submit Listing (Free)
**Free and open.** No listing fee. Registers a tool with a generated Gemini embedding.

### `POST /api/invoke/:namespace` — Invoke Tool (Execution-Only Monetization)
The sole monetization surface, fronted by a hardened verification gate. Premium tools (`pricing.model: "paid" | "freemium"`) incur a **flat $0.25 USDC platform take-rate on Base**, collected **only when the invocation succeeds** (2xx). Failed invocations are never charged. Free tools execute without any fee. Metered per agent (`X-Agent-ID`).

Every invocation passes, in order:

1. **Verification** — caller identity + request signature. Three schemes: EIP-712 wallet auth (recovered to the agent's registered Base address), Ed25519, or HMAC-SHA256. All bound to the body hash, freshness-checked, replay/tamper-resistant. Dev passthrough when `AGENT_KEYS` is empty.
2. **Behavioral quarantine + rate limit** — burst/error-storm anomaly detection quarantines abusive callers (escalating), then a sliding window rate-limits per agent.
3. **Schema validation** — the JSON payload must satisfy the tool's registered schema (Ajv) before any bytes leave the proxy.
4. **Prompt-injection sanitization** — payloads are scanned for code-execution and jailbreak patterns before proxying (block with 422 or log).
5. **Payment** — flat take-rate for premium tools.
6. **Egress guard** — SSRF protection (no private/reserved IPs), optional host allowlist (`PROXY_ALLOWED_HOSTS`), strict request (`MAX_REQUEST_BYTES`) / response (`MAX_RESPONSE_BYTES`) size caps, and **DNS-rebinding-resistant connection pinning** (the socket dials the validated IP while the original hostname is preserved for TLS SNI + cert verification).

See `.env.example` for `AGENT_KEYS`, `VERIFY_REQUIRE_SIGNATURE`, `SIGNING_CHAIN_ID`, `SANITIZER_*`, `ANOMALY_*`, `PROXY_ALLOWED_HOSTS`, `PROXY_ALLOW_PRIVATE`, and the size-limit knobs.

## Architecture

```
src/
├── index.ts        # Hono app — routes, server bootstrap
├── config.ts       # Environment config (typed, validated)
├── types.ts        # Tool / SearchResult interfaces
├── embedding.ts    # Gemini gemini-embedding-001 (3072-dim) + dev fallback
├── db.ts           # MongoDB Atlas Vector Search store + in-memory fallback
├── invocation.ts   # /api/invoke proxy: verify + quarantine + schema + sanitize + egress + metering
├── verification.ts # caller identity: EIP-712 (Base wallet) / Ed25519 / HMAC signatures
├── eip712.ts       # EIP-712 typed-data domain + signer address recovery (viem)
├── sanitizer.ts    # prompt-injection / code-execution payload scanning
├── anomaly.ts      # behavioral burst + error-storm detection & quarantine
├── schema-validate.ts # Ajv JSON-Schema validation of invocation payloads
├── egress-guard.ts # SSRF protection, host allowlist, size caps, DNS-rebinding-resistant connection pinning
├── rate-limit.ts   # token-bucket + sliding-window rate limiting (invocations)
├── crawler.ts      # background cron crawler (discover → fetch manifest → parse/probe → reject-or-ingest)
├── manifest.ts     # fetch + parse mcp.json / OpenAPI manifests (authoritative schemas)
├── mcp-probe.ts    # live MCP runtime probe (stdio + streamable-HTTP tools/list) — OFF by default
├── health-check.ts # endpoint liveness probes
└── scraper.ts      # GitHub code search (mcp.json/openapi.json/swagger.json) + topic/npm search
scripts/
└── seed.ts         # Seed sample tools for local dev
```

## Authoritative Schema Ingestion

The crawler never invents schemas. It ingests a tool only when its schema comes from one of two authoritative sources:

1. **Manifest parsing** (`manifest.ts`) — a repo's `mcp.json` (registry-style, with `tools[].inputSchema`) or `openapi.json` / `swagger.json`. Repos whose manifest is missing, unparseable, or schema-less are rejected.
2. **Live MCP runtime probe** (`mcp-probe.ts`) — for config-style `mcp.json` files (`mcpServers: { command: "npx", … }`), which declare how to *launch* a server but carry no schemas. The probe spawns the server (stdio) or calls its streamable-HTTP endpoint, performs the MCP handshake (`initialize` → `notifications/initialized` → `tools/list`), and captures each tool's authoritative `inputSchema`.

### Enabling the probe

The probe **executes third-party server code**, so it is OFF by default and must only run inside an isolated sandbox with no host credentials:

```bash
CRAWL_MCP_PROBE=true    # probe config-style mcpServers (HTTP + stdio)
CRAWL_MCP_EXEC=true     # also permit spawning stdio processes (npx/uvx/node)
npm run crawl
```

`CRAWL_MCP_PROBE=true` alone probes streamable-HTTP servers; stdio probing additionally requires `CRAWL_MCP_EXEC=true`.

## MongoDB Atlas Vector Search Index

Create this index in the Atlas UI (or via `mongosh`) on the `tools` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    }
  ]
}
```

Name it `vector_index` (or set `VECTOR_INDEX_NAME` env var).

## Monetization (Execution-Only)

Discovery, search, and listing submission are all **free**. The platform monetizes at a single point: the invocation proxy.

- **Premium tools** (`pricing.model: "paid"` or `"freemium"`) carry a **flat $0.25 USDC platform take-rate** on Base.
- The take-rate is **collected only when the invocation succeeds** (downstream 2xx). A failed invocation (4xx/5xx/502) is **never charged** — the fee is recorded as `not_collected`.
- **Free tools** (`pricing.model: "free"`) invoke with no fee.

Flow:

1. Agent calls `POST /api/invoke/:namespace` with an `X-Agent-ID` header.
2. For a premium tool without an `X-PAYMENT` header, the server returns HTTP 402 with a machine-readable payment descriptor (flat $0.25 USDC, Base).
3. Agent attaches a valid `X-PAYMENT` proof and retries.
4. The proxy forwards the call to the tool's `endpointUrl`.
5. Only a successful (2xx) response settles the $0.25 take-rate; failures refund/never settle.

**In dev** (no `X402_WALLET_ADDRESS` configured), the payment gate is bypassed but rate-limiting and metering still apply.

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 20+ / TypeScript |
| API Framework | Hono |
| Database | MongoDB Atlas (M0 Free Tier) + Atlas Vector Search |
| Embeddings | Google Gemini `gemini-embedding-001` (3072-dim) via `generativelanguage.googleapis.com` |
| Payment | x402 (`@x402/hono`, `@x402/evm`, `@x402/core`) — execution-only, $0.25/call success-only take-rate |
| Hosting | Render / Railway / Vercel |

## License

MIT
