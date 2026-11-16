---
Platform: GitHub Release / Engineering Blog / HN Comment
Title: AIPages Weekly Engineering Update — 2026-W47
---

## Summary of Changes (2026-W47)

### New Capabilities
- **Interactive Web Playground**: Deployed `https://aipages.tech/playground` enabling human developers and AI agents to test all 18 first-party AUS tools live in-browser.
- **Semantic Chunker AUS Engine**: Added `net.2xcel.aus.semantic-chunker` with sentence-boundary preservation, token budgeting, and custom metadata mapping.
- **NPM Unified Gateway**: Published `aipages-mcp-gateway@1.0.0` to npmjs.com.
- **Python SDK Scaffolding**: Built `aipages` v0.1.0 with LangChain Core and CrewAI adapter support.
- **Autonomous MCP Ingestion**: Background daemon scanning 10+ open-source MCP repositories every 6 hours and proposing automated integration PRs.

### Fleet Metrics
- **First-Party Tools**: 18 active, hardened Agent Utility Services.
- **Discovery Endpoints**: `/llms.txt`, `/llms-full.txt`, `/mcp.json`, `/mcp-actions.json`, `/openapi.json`.
- **Payment Settlement**: Base Mainnet (Chain ID 8453) USDC / USDT via HTTP 402 with anti-replay guarantees.
