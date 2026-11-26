# aipages-sdk

Official TypeScript SDK for [AIPages](https://aipages.tech) — Machine-Native Discovery Registry & x402 Base Mainnet Settlement Gateway for Autonomous AI Agents.

---

## Installation

```bash
npm install aipages-sdk viem
```

## Quick Start

```typescript
import { AIPagesClient } from "aipages-sdk";

// 1. Initialize client
const aipages = new AIPagesClient({
  // Optional: provide a Base wallet private key to automatically satisfy x402 USDC micro-payments
  walletPrivateKey: process.env.BASE_WALLET_PRIVATE_KEY as `0x${string}`,
  budgetCapUsdc: 5.00, // Hard session budget cap
  maxCostPerCallUsdc: 0.10, // Max per-invocation limit
});

// 2. Discover tools semantically via 3072-dim Gemini vector index
const tools = await aipages.search("sanitize user JSON and strip HTML");
console.log("Discovered tools:", tools);

// 3. Free Sandbox Testing
const testResult = await aipages.invoke("net.2xcel.aus.schema-sanitizer", {
  data: { raw: "<b>Clean Me</b>", email: "alice@example.com" }
}, { playgroundTest: true });
console.log("Sandbox Output:", testResult.data);

// 4. Live Production Execution with Base USDC settlement
const prodResult = await aipages.invoke("net.2xcel.aus.schema-sanitizer", {
  data: { raw: "<b>Production Safe</b>" }
});
console.log("Production Output:", prodResult.data);
```

---

## Coinbase AgentKit Integration

Equip any Coinbase AgentKit / CDP agent with dynamic tool discovery and autonomous Base USDC settlement:

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { createAIPagesActionProvider } from "aipages-sdk/agentkit";

const aipagesProvider = createAIPagesActionProvider({
  walletPrivateKey: process.env.AGENT_WALLET_KEY as `0x${string}`,
  budgetCapUsdc: 10.00,
});

const agentkit = await AgentKit.from({
  actionProviders: [aipagesProvider],
});
```

The agent now has 3 autonomous capabilities:
1. `search_aipages_tools`: Semantically find tools by intent.
2. `invoke_aipages_tool`: Execute tools with automated x402 settlement.
3. `list_aipages_canonical_fleet`: Access first-party AUS micro-utilities.

---

## Security & Guardrails

- **Zero-Friction Sandbox:** Test any tool with `playgroundTest: true` without an on-chain transaction.
- **Budget Caps:** Hard limits prevent infinite loops from draining agent wallets.
- **Ajv Validation:** Tool payloads are verified against registered schemas before payment.

## License

MIT
