# AIPages Roadmap & Status Tracker

**Repository**: `2xcel-dev/AIPages`  
**Purpose**: Machine-native discovery registry and vector search index for autonomous AI agent tools.

---

## 1. Milestone Status Overview

| Phase / Feature | Status | Description |
|---|---|---|
| **Authoritative Manifest Crawler** | ✅ Completed | GitHub & npm crawler ingesting schemas only from verified `mcp.json` and OpenAPI manifests. |
| **Vector Search Indexing** | ✅ Completed | 3072-dimensional Gemini embeddings (`gemini-embedding-001`) with MongoDB Atlas vector search. |
| **Strict x402 Base Payment Gate** | ✅ Completed | On-chain ERC-20 USDC verification on Base Mainnet ($0.10/$0.25) with persistent MongoDB replay protection. |
| **Focused Health-Check Worker** | ✅ Completed | Background worker in `aipages-outreach` probing endpoints with bounded timeouts, sanitized error logging, and deterministic persistence. |
| **Reliability & Health API** | ✅ Completed | `/api/tools` and `/api/tools/:namespace` returning health diagnostics and strict `ReliabilityIndicator` enum (`high`, `degraded`, `failing`, `unchecked`). |
| **Tool Detail Page & Scope Disclaimer** | ✅ Completed | Responsive `/tools/:slug` page with prominent reliability card, last-checked time, human-readable failure state, and probe scope disclaimer. |
| **Directory Cards (Reliability & Freshness)** | ✅ Completed | Rendering health status, reliability badges (`Operational`, `Degraded`, `Failing`, `Unchecked`), and freshness relative timestamps directly on directory cards (`GET /tools`). |
| **Keyword & Capability Search** | 🟡 Next Up | Adding keyword query filtering (`q`) and capability-based schema filtering to `/` and `/api/tools`. |
| **Production Smoke Testing** | ⚪ Planned | End-to-end verification against live public service (`https://aipages.tech`) validating the complete response contract. |

---

## 2. Immediate Roadmap Order

### Slice 1: Reliability & Freshness on Directory Cards (Completed)
- [x] Extend `SearchResult` and directory listings with explicit `reliability` enum and `lastChecked` timestamp.
- [x] Implement responsive directory view (`GET /tools`) displaying interactive tool cards.
- [x] Prominently display reliability indicators (`Operational`, `Degraded`, `Failing`, `Unchecked`) on each card.
- [x] Render relative freshness timestamps (`just now`, `5m ago`, `2h ago`, `never checked`) on every card.
- [x] Add visual badges and failure reason callouts for degraded/failing endpoints.
- [x] Add directory filtering controls (by reliability state, connection protocol, pricing model).

### Slice 2: Keyword & Capability Search on `/` and `/api/tools` (Next Up)
- [ ] Support keyword search parameter `keyword` / `name` / `q` on `GET /api/tools`.
- [ ] Support capability tags / tools-list filtering on `GET /api/tools`.
- [ ] Add capability search indexing or regex/text filtering across namespace, name, description, and schema properties.
- [ ] Update root endpoint (`GET /`) manifest to advertise keyword and capability search capabilities.

### Slice 3: Production Smoke Testing & Contract Verification
- [ ] Test live endpoints on `https://aipages.tech`:
  - `GET /` health + pricing manifest.
  - `GET /api/tools` contract and reliability status.
  - `GET /tools/:slug` responsive detail rendering.
  - `POST /api/invoke/:namespace` with x402 payment and replay test.
- [ ] Validate response schema contracts against OpenAPI 3.1 specifications.
- [ ] Verify persistence across service restarts in production environment.
