---
Platform: Reddit (r/ClaudeAI, r/Cursor, r/LangChain, r/LocalLLaMA)
Title: We eliminated 20k tokens of MCP prompt bloat in Claude & Cursor with an on-demand vector gateway (Open Source)
Flair: Project / Discussion / Tool
---

If you run Claude Desktop, Cursor, or autonomous agents with multiple Model Context Protocol (MCP) servers, you have likely encountered system prompt bloat.

### The Measured Overhead

Every time you register an MCP server (such as PostgreSQL, GitHub, filesystem, browser, or web search), its full JSON schema is injected into the system prompt on every single message.

With 15 to 20 servers loaded, your agent consumes 15,000 to 28,000 tokens before you submit your prompt. This slows down first-token latency, consumes rate-limited context windows, and increases attention dilution.

### Dynamic Gateway Architecture

We built **AIPages** (https://aipages.tech) and open-sourced an on-demand MCP gateway:
`npx -y aipages-mcp-gateway`

Instead of pre-loading dozens of tool schemas, the gateway exposes 3 lightweight meta-tools:
1. `search_tools`: Queries a 3072-dimensional Gemini vector index by natural language intent (for example: "sanitize untrusted user JSON and redact API keys").
2. `inspect_tool_schema`: Fetches the exact schema on-demand only when the agent decides to use it.
3. `execute_tool`: Dispatches the call with instant sandbox verification or HTTP 402 Base Mainnet settlement.

### Benchmark Numbers

- Static configuration (18 tools): ~19,400 tokens per message.
- AIPages gateway configuration (3 meta-tools): ~420 tokens per message.
- Context window reduction: 97.8%.
- First-token latency: ~820ms vs ~2.8s.

### Live Browser Playground

You can inspect and execute all 18 Agent Utility Services directly in your browser without wallet connection or installation:
https://aipages.tech/playground

### Code & Installation

- NPM Package: https://www.npmjs.com/package/aipages-mcp-gateway
- Live Bounties for Missing Capabilities: https://aipages.tech/bounties
- Python SDK: `packages/aipages-py`
- GitHub Repository: https://github.com/2xcel-dev/AIPages

How are other developers handling tool discovery and system prompt budgets in multi-server agent setups?
