# Farcaster & Base Ecosystem Launch Playbook

> Target Channels: `/base`, `/dev`, `/agents`, `/builder`  
> Positioning: **The App Store for Base Autonomous Agents** (Pioneering on-chain x402 machine commerce).

---

## 🧵 Thread 1: Primary Launch Announcement (`/base` & `/agents`)

**Cast 1 (Hook & Value Prop):**
Autonomous AI agents can write code and plan tasks, but they hit a brick wall when trying to buy API calls or execute compute-heavy tools. No credit cards, no Stripe subscriptions.

Introducing **AIPages** (https://aipages.tech) — The App Store and x402 Micropayment Gateway for Base Autonomous Agents. 🟡⚡

**Cast 2 (The Problem & Solution):**
Today, agent tools either require human credit card KYC or complex monthly SaaS plans.

AIPages solves this with machine-native x402 settlement on @base:
- 0-friction sandbox mode for evaluation (`x-playground-test: true`)
- Instant per-invocation settlement in USDC on Base (Chain ID 8453)
- Success-only billing (funds debit ONLY on HTTP 200 OK)

**Cast 3 (The Unified MCP Gateway):**
Stop pasting 50 JSON blocks into `claude_desktop_config.json`.

With the new `@aipages/mcp-gateway`, one configuration installs the entire ecosystem:
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
Your agent gets dynamic `aipages_search` and `aipages_execute` meta-tools to discover and execute any tool on-the-fly.

**Cast 4 (70/30 Creator Rev-Share & Hackathon):**
Are you an MCP server or agent tool developer?
- Register your tool for free at https://aipages.tech/submit
- Earn **70% of all USDC micropayments** directly to your Base address.
- We’re kicking off the **$500 Base Agent Micro-Grant Bounty**: rewarding the top 10 most creative, reliable MCP micro-utilities registered this month!

Explore the directory: https://aipages.tech
Docs for agents: https://aipages.tech/llms.txt
GitHub: https://github.com/2xcel-dev/AIPages

---

## 🧵 Thread 2: Technical Deep-Dive (`/dev`)

**Cast 1:**
How do you build machine-to-machine commerce for AI agents without central billing?

Here is the exact architecture behind https://aipages.tech:
1. 3072-dimensional vector search index for intent matching
2. WebMCP declarative and imperative schemas
3. ERC-20 USDC transfer verification via Viem on Base L2
4. Replay-protected hash verification preventing double-spend

**Cast 2:**
Try an anti-bot stealth web crawl right now in your terminal — zero wallet funding needed:
```bash
curl -X POST "https://aipages.tech/tool/net.2xcel.aus.browser-stealth" \
  -H "Content-Type: application/json" \
  -H "x-playground-test: true" \
  -d '{"url": "https://news.ycombinator.com", "mode": "markdown"}'
```
Clean markdown returned to your agent in under 800ms.

Join the machine economy on Base: https://aipages.tech
