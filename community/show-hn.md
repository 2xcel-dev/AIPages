# Show HN Launch Strategy & Submission Copy

**Submission Title:**  
`Show HN: AIPages – Yellow Pages and x402 Micropayment Gateway for AI Agents`

**URL:**  
`https://aipages.tech`

---

## 📝 Founder Submission Text / First Comment

Hey HN! We built **AIPages** (https://aipages.tech) to solve a fundamental bottleneck in the AI agent ecosystem: **machine-native tool discovery and autonomous micropayments**.

### The Problem
Agents (Claude Desktop, Cursor, Cline, AutoGPT, custom swarms) are becoming capable autonomous executors. But when an agent needs an external utility—such as a stealth headless browser to read an anti-bot protected page, a schema sanitizer to protect against prototype injection, or a financial ledger auditor—it faces two major roadblocks:
1. **Configuration Sprawl**: Developers have to copy and paste dozens of disjointed MCP configuration blocks into `claude_desktop_config.json` or `.cursor/mcp.json`, and restart their environment every time.
2. **The Payment Wall**: Autonomous agents don't have credit cards, and human developers don't want to sign up for 15 different $20/month SaaS subscriptions for tools their agents might only call twice a week.

### How AIPages Works
AIPages provides a dual-layer solution:
1. **Machine-Native Discovery**:
   - High-dimensional vector search index (`GET https://aipages.tech/search?q=...`)
   - Standardized `llms.txt` and `mcp.json` endpoints designed specifically for AI crawlers and agent discovery engines.
   - Live in-browser interactive testing playground on every tool page (`#test-console`).
2. **The Unified MCP Proxy Gateway (`@aipages/mcp-gateway`)**:
   Instead of configuring 50 tools, agents install one gateway:
   ```json
   {
     "mcpServers": {
       "aipages": {
         "command": "npx",
         "args": ["-y", "@aipages/mcp-gateway"]
       }
     }
   }
   ```
   This gives the agent two meta-tools: `aipages_search` (discovers tools dynamically from our catalog) and `aipages_execute` (calls them on-the-fly without restarting the agent).
3. **Base L2 USDC x402 Micropayments**:
   - Zero-friction sandbox testing mode: pass `x-playground-test: true` to test any tool immediately for free.
   - For production runs, we implement the RFC-compliant **HTTP 402 Payment Required** pattern using USDC on Base Mainnet (Chain ID 8453).
   - **Success-only settlement**: Fees are only collected when the tool execution returns an HTTP 200 OK.
   - **70/30 Creator Rev-Share**: External developers who list paid MCP utilities receive 70% of the USDC settlement sent directly to their Base address.

### Instant Test in Terminal (No Key or Wallet Needed)
```bash
curl -X POST "https://aipages.tech/tool/net.2xcel.aus.browser-stealth" \
  -H "Content-Type: application/json" \
  -H "x-playground-test: true" \
  -d '{"url": "https://news.ycombinator.com", "mode": "markdown"}'
```

### Links & Open Source
- Live Directory: https://aipages.tech
- Agent Discovery Manifest: https://aipages.tech/llms.txt
- GitHub: https://github.com/2xcel-dev/AIPages

We’d love feedback on the x402 challenge flow, latency on Base RPC verification, and what tools you'd like to see in the canonical fleet!
