# AGENTS.md - Autonomous Agent Discovery & Integration Guide for AIPages

> Machine-native discovery registry, 3072-dim vector search index, and Base Mainnet x402 execution gateway for autonomous AI agent tools (`https://aipages.tech`).

## 1. Machine-Readable Discovery Endpoints

Autonomous coding assistants, browsing agents, and multi-agent orchestrators should consume the following endpoints directly:

- **LLM Summary Index**: `GET https://aipages.tech/llms.txt` (`text/markdown`)
- **Full LLM Schema & Payload Dump**: `GET https://aipages.tech/llms-full.txt` (`text/markdown`)
- **MCP Server Discovery Manifest**: `GET https://aipages.tech/mcp.json` (`application/json`)
- **WebMCP Action Declarations**: `GET https://aipages.tech/mcp-actions.json` (`application/json`)
- **Agent Permissions & Rate Policy**: `GET https://aipages.tech/agent-permissions.json` (`application/json`)
- **OpenAPI 3.1 Specification**: `GET https://aipages.tech/api/openapi.json` (or `GET https://aipages.tech/openapi.json`)
- **JSON Feed v1.1 Syndication**: `GET https://aipages.tech/api/feed.json` (`application/feed+json`)
- **Per-Tool Markdown Sheet**: `GET https://aipages.tech/tool/:namespace.md` (or send `Accept: text/markdown`)

## 2. Core Task Flows for Autonomous Agents

### A. Semantic Tool Search (Free)
Query the 3072-dim Gemini embedding index using natural-language intent:
```bash
curl -s "https://aipages.tech/search?q=sanitize+untrusted+json+and+strip+xss&limit=5"
```

### B. Zero-Friction Sandbox Tool Execution (Free Test Mode)
Every first-party Agent Utility Service (`net.2xcel.aus.*`) supports instant sandbox testing without requiring an on-chain transaction when `x-playground-test: true` is supplied:
```bash
curl -X POST "https://aipages.tech/tool/net.2xcel.aus.schema-sanitizer" \
  -H "Content-Type: application/json" \
  -H "x-playground-test: true" \
  -H "x-agent-id: autonomous-agent" \
  -d '{"data":{"raw":"<b>Hello Agent</b>"}}'
```

### C. Production Execution with x402 Base Mainnet Settlement
For production runs on paid tools, attach a verified Base Mainnet (`eip155:8453`) USDC payment receipt in the `x-payment-receipt` (or `X-Payment`) header:
- **Network**: Base Mainnet (Chain ID `8453`)
- **Currency**: `USDC` (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **Settlement Model**: Success-only (HTTP 402 returned with payment descriptor if header is omitted).

### D. Self-Serve Tool Registration (Free)
Register a new MCP server or HTTP tool schema into the vector index:
```bash
curl -X POST "https://aipages.tech/api/tools/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_agent_tool",
    "description": "Concise semantic description of capabilities",
    "connectionType": "http",
    "endpointUrl": "https://example.com/api/tool",
    "pricingModel": "free",
    "costPerCall": 0,
    "developerAddress": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
    "schema": { "type": "object", "properties": { "input": { "type": "string" } }, "required": ["input"] }
  }'
```

## 3. Repository Development Commands (For Coding Agents)

- **Verify Catalog & Capabilities**: `npm run loop:verify`
- **Run Full Test Suite**: `npm test`
- **Build TypeScript**: `npm run build`
- **Start Dev Server**: `npm run dev`
