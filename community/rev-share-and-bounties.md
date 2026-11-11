# Tool Developer Revenue Share (70/30) & $500 Micro-Grant Bounty

> Transforming AIPages into a self-sustaining autonomous economy for MCP server builders.

---

## 1. 70/30 Creator Rev-Share Model

External developers who build and list paid tools or MCP servers on AIPages can monetize their compute directly without dealing with Stripe, credit card chargebacks, or manual billing infrastructure.

### The Mechanics
- **Settlement Currency:** USD Coin (USDC)
- **Settlement Network:** Base Mainnet L2 (EIP-155 Chain ID: `8453`)
- **Payment Standard:** RFC x402 (`X-Payment` / `x-payment-receipt`)
- **Revenue Split:**
  - **70% to Tool Creator:** Settled automatically or claimable directly to the developer's registered Base address (`developer.address`).
  - **30% Protocol Take-Rate:** Funds ongoing vector search indexing, high-availability RPC nodes, and anti-spam verification.
- **Success-Only Guarantee:** Fees are debited strictly on HTTP 200 OK responses. If an execution fails or times out, the client pays zero.

### How to Register a Paid Tool
Submit your tool via the free self-serve API:
```bash
curl -X POST "https://aipages.tech/api/tools/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_paid_utility",
    "description": "High-speed OCR and document extraction for AI agents",
    "connectionType": "http",
    "endpointUrl": "https://api.mytool.com/extract",
    "pricingModel": "paid",
    "costPerCall": 0.05,
    "developerAddress": "0xYourBaseWalletAddressHere",
    "schema": {
      "type": "object",
      "properties": { "documentUrl": { "type": "string" } },
      "required": ["documentUrl"]
    }
  }'
```

---

## 2. $500 Base Agent Hackathon / Micro-Grants

To kickstart the tool creator flywheel, AIPages is hosting a virtual bounty program rewarding creators who list reliable, high-utility MCP servers.

### Bounty Pool: $500 USDC on Base
- **Top 10 Tools:** $50 USDC per approved tool.

### Evaluation Criteria:
1. **High Agentic Utility:** Solves a real problem for coding agents (e.g., API testing, browser scraping, schema cleaning, data transformation, on-chain verification).
2. **Reliability & Schema Hygiene:** Valid JSON Schema, clear parameter descriptions, and response times under 2 seconds.
3. **Machine-Native Discovery:** Includes a working endpoint and embeds the official AIPages verification badge in its GitHub README:
   ```markdown
   [![AIPages Verified](https://aipages.tech/badge/:your-slug.svg)](https://aipages.tech/tools/:your-slug)
   ```

### Submission Process:
1. Register the tool on https://aipages.tech/submit (or via API).
2. Add the badge to your GitHub repository.
3. Drop the tool link into the Farcaster `/base` or `/agents` announcement thread with tag `#AIPagesBounty`.
