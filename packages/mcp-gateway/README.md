# aipages-mcp-gateway

> **Unified Model Context Protocol (MCP) Trojan-Horse Gateway for [AIPages.tech](https://aipages.tech)**  
> *Dynamic 3072-dimensional vector tool discovery and Base Mainnet x402 upstream execution for autonomous AI agents.*

[![NPM Version](https://img.shields.io/npm/v/aipages-mcp-gateway?color=FFD000&style=flat-square)](https://www.npmjs.com/package/aipages-mcp-gateway)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Base Mainnet](https://img.shields.io/badge/Settlement-Base_Mainnet_(USDC)-0052FF?style=flat-square)](https://base.org)

---

## ⚡ The Problem: Context Window Bloat

Installing 20+ standalone MCP servers in Claude Desktop or Cursor wastes **15,000 to 30,000 tokens** of system prompt before the agent even answers your prompt. 

`aipages-mcp-gateway` replaces that bloat with **one single gateway configuration**. It exposes 3 on-demand meta-tools that let your agent search, inspect, and execute any of the 51+ registered tools in the AIPages fleet dynamically:

1. `aipages_search` — Query the 3072-dim Gemini semantic vector index by natural language intent.
2. `aipages_execute` — Call any verified tool with zero-friction sandbox mode or Base Mainnet USDC settlement.
3. `aipages_list` — Instant catalog inspection of high-performance canonical AUS microservices.

---

## 🚀 Quickstart (1-Click Setup)

### Claude Desktop (`claude_desktop_config.json`)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

### Cursor (`.cursor/mcp.json`)

Add to your project's `.cursor/mcp.json` or Global Settings > MCP:

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

### Cline / Windsurf

Add via standard stdio command:
- **Command**: `npx`
- **Args**: `["-y", "aipages-mcp-gateway"]`

---

## 🛠️ Included Canonical Fleet (Instant Offline Fallback)

Even without internet access, `aipages-mcp-gateway` includes local fallback metadata for high-priority microservices:

- `net.2xcel.aus.schema-sanitizer` — XSS, AST injection, and prototype pollution neutralization
- `net.2xcel.aus.context-compressor` — Token budget compressor (60–80% reduction preserving code & URLs)
- `net.2xcel.aus.financial-audit` — Cryptographic ledger validation & risk scoring on Base
- `net.2xcel.aus.media-transcoder` — Multimodal audio/image compression & base64 ops
- `net.2xcel.aus.browser-stealth` — Headless anti-bot extraction & clean markdown rendering

---

## 💳 Settlement & Free Sandbox Mode

- **Free Testing**: Any agent can test tools instantly for free by passing `x-playground-test: true`.
- **Production Settlement**: Paid executions use HTTP 402 with success-only Base Mainnet (`8453`) USDC settlement.

---

## 📄 License

MIT © [AIPages Core Team](https://aipages.tech)
