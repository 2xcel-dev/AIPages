---
Platform: Reddit (r/ClaudeAI)
Title: Measuring the token cost of 15+ MCP servers in Claude Desktop (and how to drop it from 20k to 400 tokens)
Flair: Project / Discussion
---

If you use Claude Desktop with multiple Model Context Protocol (MCP) servers, you have likely run into system prompt bloat.

### The Measured Problem

Every MCP server added to `claude_desktop_config.json` injects its full JSON schema into the system prompt on every single message.

When running 15 to 20 servers (PostgreSQL, GitHub, local filesystem, browser, memory, search), the baseline system prompt consumes between 15,000 and 28,000 tokens before you type a single prompt.

This creates three measurable issues:
1. Increased latency: Claude must process 20k+ tokens on every turn before emitting the first completion token.
2. Context window consumption: On long multi-turn sessions, the 200k window fills up significantly faster.
3. Attention dilution: Models occasionally hallucinate parameter requirements when choosing between 40+ simultaneous tool schemas.

### The Architecture: On-Demand Dynamic Retrieval

Rather than mounting every tool schema upfront, we built and open-sourced an on-demand gateway: **AIPages** (https://aipages.tech).

Instead of loading dozens of individual servers, you mount a single gateway that exposes 3 lightweight meta-tools:
1. `search_tools`: Queries a 3072-dimensional Gemini vector index by intent (e.g., "sanitize untrusted JSON payload" or "extract tables from PDF").
2. `inspect_tool_schema`: Retrieves the exact JSON Schema on the fly only when the model selects the tool.
3. `execute_tool`: Proxies execution with local sandbox verification or Base Mainnet x402 settlement.

### Benchmark Comparison

- Static configuration (18 tools): ~19,400 tokens per message.
- AIPages gateway configuration (3 meta-tools): ~420 tokens per message.
- System prompt token reduction: 97.8%.
- First-token latency: ~820ms vs ~2.8s on complex multi-turn chats.

### Claude Desktop Configuration

Add the gateway to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aipages": {
      "command": "npx",
      "args": ["-y", "aipages-mcp-gateway"]
    }
  }
}
```

### Zero-Friction Browser Test

If you want to inspect how the underlying utility services respond before adding them to your config, there is a web playground with full schema inspection:
https://aipages.tech/playground

### Code & Repository

- NPM Gateway: https://www.npmjs.com/package/aipages-mcp-gateway
- Live Bounties & Catalog: https://aipages.tech/bounties
- GitHub: https://github.com/2xcel-dev/AIPages

How are others here managing prompt budgets when stacking 10+ MCP servers in daily workflows?
