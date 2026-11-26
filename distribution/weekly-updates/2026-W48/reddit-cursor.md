---
Platform: Reddit (r/Cursor)
Title: Benchmarking MCP schema injection in Cursor: 19k tokens saved per turn using dynamic tool indexing
Flair: Discussion / Tips & Tricks
---

For anyone running multiple Model Context Protocol (MCP) servers inside Cursor, context window allocation is a primary concern.

### The Measured Overhead in Cursor Composer

When you configure multiple servers inside `.cursor/mcp.json`, Cursor includes their full tool signatures inside the agent system context on every turn.

In testing with a typical developer stack (PostgreSQL, Git/GitHub, Puppeteer, file tools, and custom utilities), we measured:
- Total tool schemas registered: 18
- Baseline context consumed per turn: ~19,400 tokens
- Direct consequence: 10% of Claude 3.5 Sonnet's 200k context window is consumed before adding any project files, codebase index chunks, or active git diffs.

When working on large refactors across 10+ files, that static overhead forces Cursor to truncate earlier conversational turns or file context much sooner.

### The Solution: Dynamic Indexing Gateway

To keep the full toolset available without paying the token cost upfront, we built an on-demand MCP gateway: **AIPages** (https://aipages.tech).

Instead of mounting 18 schemas statically, you register 1 gateway server that exposes 3 lightweight meta-tools:
1. `search_tools`: Semantic search across tool capabilities using a 3072-dimensional vector index.
2. `inspect_tool_schema`: Fetches parameter schema only when the model decides to invoke a tool.
3. `execute_tool`: Proxies the execution (with sandbox mode for zero-cost local testing).

### Token & Latency Impact

- Static MCP setup: ~19,400 tokens per message.
- AIPages gateway: ~420 tokens per message.
- Saved context per turn: ~19,000 tokens available for repository code and terminal logs.
- Generation start latency dropped from 2.7s down to ~850ms.

### Cursor Configuration (`.cursor/mcp.json`)

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

### Verification & Playground

You can test the 18 core Agent Utility Services directly in the browser playground without installing anything:
https://aipages.tech/playground

- Gateway on NPM: https://www.npmjs.com/package/aipages-mcp-gateway
- Live Bounties for Missing Tools: https://aipages.tech/bounties
- Source code: https://github.com/2xcel-dev/AIPages

Curious what other Cursor users are doing to monitor token consumption when running custom MCP tools alongside codebase indexing.
