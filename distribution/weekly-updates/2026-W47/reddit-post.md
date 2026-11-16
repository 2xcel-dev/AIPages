---
Platform: Reddit (r/ClaudeAI, r/Cursor, r/LangChain, r/LocalLLaMA)
Title: We eliminated 20k tokens of MCP prompt bloat in Claude & Cursor with an on-demand vector gateway (Open Source)
Flair: Project / Discussion / Tool
---

Hey everyone,

If you run Claude Desktop, Cursor, or autonomous agents with multiple Model Context Protocol (MCP) servers, you've probably noticed a glaring bottleneck: **Context Window Bloat**.

### The Problem:
Every time you register an MCP server (e.g., PostgreSQL, GitHub, File System, Browser, Web Search), its full JSON schema gets injected into your system prompt on **every single message**.

With 15–20 servers loaded, your agent burns **15,000 to 30,000 tokens** before you even submit your prompt. This slows down latency, spikes API costs, and dilutes the model's attention.

### How We Solved It:
We built **AIPages** (https://aipages.tech) and open-sourced a unified MCP gateway:
`npx -y aipages-mcp-gateway`

Instead of pre-loading dozens of tool schemas, the gateway only exposes 3 light meta-tools:
1. `search_tools`: Queries a 3072-dimensional Gemini vector index by natural language intent (e.g., "sanitize untrusted user JSON and redact API keys").
2. `inspect_tool_schema`: Fetches the exact schema on-demand only when the agent decides to use it.
3. `execute_tool`: Dispatches the call with instant sandbox verification or HTTP 402 Base Mainnet settlement.

### Live Browser Playground:
You can test the entire fleet of 18 Agent Utility Services directly in your browser with zero friction:
👉 https://aipages.tech/playground

### Code & Installation:
- **NPM Package**: https://www.npmjs.com/package/aipages-mcp-gateway
- **Python SDK**: `packages/aipages-py` (with native LangChain and CrewAI adapters)
- **GitHub**: https://github.com/2xcel-dev/AIPages

Would love to hear how other developers are handling tool discovery and system prompt budgets in their agent setups!
