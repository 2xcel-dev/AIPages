AIPages aipages.tech

Machine-native discovery registry and vector search index for autonomous AI agent tools and Agent Utility Services (AUS).

## What it does

1. Who is it for?
Software & Autonomous AI Agents: The primary "users" are automated coding agents, LLMs, and multi-agent workflows that need to find external tools programmatically without human intervention.

Tool Developers: Creators and developers who build APIs, MCP servers, or micro-utilities and want their tools discovered by autonomous agents.

2. What is it?
A Machine-Native Discovery Registry & Vector Search Index: It acts as an intelligent app store and lookup directory specifically engineered for AI agents to find, authenticate, and connect to verified software tool schemas dynamically.

3. When does it execute?
On Demand (Real-Time Search): Whenever an autonomous agent encounters a task and needs a specific capability (e.g., parsing Markdown, auditing a smart contract, or running code), it queries AIPages instantly.

During Automated Scraping & Indexing: Background background cron crawlers continuously scan public repositories (like GitHub) to discover and index new tools as they are published.

4. Where does it operate?
On the Web & Base Network: Hosted as a high-speed search index (aipages.tech) connected to backend nodes (aus.2xcel.net), utilizing MongoDB Atlas for vector storage and the Base network for stablecoin micropayments.

5. Why does it exist?
To Solve Agent Discovery Friction: Traditional keyword searches fail for AI agents because agents think in semantic concepts, not exact search terms.

To Guarantee Schema Trust: By rejecting guessed or LLM-inferred schemas and requiring genuine, authoritative manifests (mcp.json or OpenAPI), it ensures agents never crash due to bad tool definitions.

To Keep Discovery Free: Discovery, browsing, and listing submissions are 100% free with no rate tolls, shifting monetization entirely to successful execution.

6. How does it work?
Semantic Vector Search: It converts search queries and tool descriptions into 3072-dimensional mathematical vectors using Gemini (gemini-embedding-001) and matches them via MongoDB Atlas Vector Search.

Authoritative Ingestion: The crawler fetches tools only if they ship with a parseable mcp.json or Swagger/OpenAPI manifest, stripping out guesswork.

Execution-Only Monetization: Finding and searching is free; monetization happens strictly at the execution gateway via x402 stablecoin micro-fees on Base when an agent successfully invokes a premium tool.

---

## 🛠️ First-Party AUS Fleet & x402 Micropayments

The following core micro-utilities are natively hosted on the AUS node (`aus.2xcel.net`) and indexed within the AIPages directory. Each tool is gated by the **`x402` micropayment protocol** utilizing USDC on the **Base Mainnet**:

| Tool ID | Namespace | Price (USDC) | Capabilities |
| :--- | :--- | :--- | :--- |
| **`aus.parse.markdown`** | `net.2xcel.aus.parse-markdown` | $0.0015 | `web-scraping`, `markdown-extraction`, `token-optimization` |
| **`aus.serp.intent_extract`** | `net.2xcel.aus.serp-intent` | $0.0020 | `search-engine`, `intent-extraction`, `json-payload` |
| **`aus.token.rugcheck`** | `net.2xcel.aus.rugcheck` | $0.0030 | `smart-contract`, `security-audit`, `base-network` |
| **`aus.gas.optimizer`** | `net.2xcel.aus.gas-optimizer` | $0.0010 | `gas-routing`, `congestion-analysis`, `fee-optimization` |
| **`aus.code.sandbox_runner`** | `net.2xcel.aus.sandbox-runner` | $0.0040 | `code-execution`, `python-runtime`, `secure-sandbox` |
| **`aus.github.summarizer`** | `net.2xcel.aus.github-summarizer` | $0.0025 | `github-api`, `diff-analysis`, `codebase-health` |
| **`aus.lead.enrich`** | `net.2xcel.aus.lead-enrich` | $0.0035 | `lead-enrichment`, `firmographics`, `crm-automation` |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set MONGODB_URI, GEMINI_API_KEY, and X402 wallet credentials.

# 3. Seed sample tools (dev)
npm run seed

# 4. Start the server
npm run dev         # hot reload via tsx
# or: npm run build && npm start  # compiled
APIGET / — Health & PricingPublic. Returns service status, pricing manifest, and endpoint map.GET /healthPublic. Returns store connectivity status.GET /search?q=<query>&limit=<n> — Semantic Search (Free)Free and open. No payment, no authentication, no rate tolls. Returns top-k tools matching natural-language intent.POST /api/invoke/:namespace — Invoke Tool & x402 HandshakeThe core execution and monetization gate. Premium AUS tools and marketplace integrations incur their designated micro-fee via x402 stablecoin payments on Base.x402 Payment Flow:Agent calls POST /api/invoke/:namespace with an X-Agent-ID header.For any metered tool without an X-PAYMENT header, the server returns HTTP 402 with a machine-readable payment descriptor (specifying the exact USDC amount and recipient wallet on Base).The autonomous agent signs and attaches a valid X-PAYMENT proof and retries the request.The proxy forwards the call to the underlying tool endpoint (aus.2xcel.net), settling the micropayment upon successful execution.Architecturesrc/
├── index.ts        # Hono app — routes, server bootstrap
├── config.ts       # Environment config (typed, validated)
├── types.ts        # Tool / SearchResult interfaces
├── embedding.ts    # Gemini gemini-embedding-001 (3072-dim) + dev fallback
├── db.ts           # MongoDB Atlas Vector Search store + in-memory fallback
├── invocation.ts   # /api/invoke proxy: verify + x402 payment gate + schema + sanitize
├── verification.ts # caller identity: EIP-712 (Base wallet) / Ed25519 / HMAC signatures
├── sanitizer.ts    # prompt-injection / code-execution payload scanning
├── egress-guard.ts # SSRF protection, host allowlist, size caps
├── crawler.ts      # background cron crawler (discover → fetch manifest → parse/probe)
└── scraper.ts      # GitHub code search & registry indexing
scripts/
└── seed.ts         # Seed sample tools and AUS fleet for dev
Tech StackComponentTechnologyRuntimeNode.js 20+ / TypeScriptAPI FrameworkHonoDatabaseMongoDB Atlas + Atlas Vector SearchEmbeddingsGoogle Gemini gemini-embedding-001 (3072-dim)Payment Gatewayx402 (@x402/hono, @x402/evm, @x402/core) via USDC on Base MainnetHostingRender / Railway / VercelLicenseMIT
