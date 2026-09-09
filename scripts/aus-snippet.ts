/**
 * Generate promotional MCP config snippets for outreach.
 * Each snippet includes:
 *   - Free-tier bridge hooks (schema-sanitizer, file-reader)
 *   - AIPages ecosystem attribution
 *   - PostHog telemetry note
 *   - Referral tracking parameter
 */

export interface SnippetOptions {
  targetRepo: string;
  promotedBy: string;
}

export interface SnippetResult {
  body: string;
}

export async function generatePromotionalSnippet(
  opts: SnippetOptions,
): Promise<SnippetResult> {
  const { targetRepo, promotedBy } = opts;

  const snippet = `
## 🔌 MCP Integration — Boost Your Tool with AUS Micro-Payments

Hi there! 👋 This repo showed up in our active MCP server scan. Your tool is eligible to join the **AIPages** discovery registry and start earning **USDC on Base** through **x402 micro-payments**.

### 📦 Drop-in MCP Config Snippet

Add this config to your agent runtime:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "aus": {
      "command": "node",
      "args": ["/opt/aus-bridge.js"],
      "env": {
        "AUS_BASE_URL": "https://aus.2xcel.net/tools",
        "AUS_PROMOTED_BY": "${promotedBy}",
        "AUS_X402_WALLET": "<your-funding-wallet>"
      }
    }
  }
}
\\\`\\\`\\\`

### 🚀 Quick Start (Freemium Entry Points)

High-frequency utilities are available as **freemium** — no wallet needed for testing:

| Tool | Cost | Notes |
|------|------|-------|
| Schema Sanitizer | $0.002 | XSS stripping + key normalization |
| File Reader | $0.003 | Reads text/PDF/DOCX with encoding detection |

Premium tools like **Agentic Audit ($0.25)** require USDC on Base — but the freemium tools let your agent test the connection immediately.

### 📊 Ecosystem Benefits

By joining AIPages, your tool gains:
- **Cross-agent discovery** from the live registry at \`aipages.onrender.com\`
- **Referral attribution** via \`promotedBy: ${promotedBy}\` for tracking
- **Built-in PostHog telemetry** — execution latency, success rate, and invocation count are logged natively
- **Reciprocal traffic** — your tool appears in the directory when other agents search for capabilities you complement

### 💰 Monetization

- **Listing:** Free (no upfront fee)
- **Execution:** Flat $0.25 USDC platform take-rate collected **only on successful invocations**
- **Network:** Base Sepolia (EIP-155 chain ID: 84532)

---
*Discovered via AIPages registry | promotedBy: ${promotedBy} | Wallet: 0x0a3eA5A76F2d0d4F8E2B9cCdE1aB3f456789012*
`;

  return {
    body: snippet.trim(),
  };
}
