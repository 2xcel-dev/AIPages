# Ecosystem Infiltration: MCP Directory Submissions

This playbook tracks submission templates and status across major Model Context Protocol hubs and directories.

---

## 1. `punkpeye/awesome-mcp-servers`

- **Target Category:** `Aggregators` / `Cloud Gateways`
- **Branch:** `add-aipages-gateway`
- **Automated Script:** `npx tsx scripts/submit-awesome-mcp-pr.ts`
- **PR Status:** Ready / PR #19156
- **Entry Markdown:**
  ```markdown
  - [AIPages](https://github.com/2xcel-dev/AIPages) ☁️ - Machine-native discovery registry, vector search, and upstream execution gateway for autonomous MCP servers with Base USDC micro-settlement. Platform directory at [aipages.tech](https://aipages.tech).
  ```

---

## 2. `modelcontextprotocol/servers` (Official Anthropic Reference Implementations)

- **Target Location:** Discussion Forum & Community Showcase
- **Title:** AIPages: Machine-Native Registry and Unified Gateway for MCP Servers
- **Body:**
  ```markdown
  Hello MCP Community!

  We built [AIPages](https://aipages.tech) ([GitHub](https://github.com/2xcel-dev/AIPages)) as an open-source registry and unified upstream execution gateway for Model Context Protocol servers.

  ### Key Capabilities
  1. **Unified Gateway (`@aipages/mcp-gateway`)**: Instead of manually registering dozens of servers, agents install one server that provides `aipages_search` and `aipages_execute` meta-tools to discover and execute tools on-the-fly.
  2. **Micro-Settlement on Base L2**: Built-in RFC x402 payment support allowing agents to pay for API compute per-invocation in USDC on Base.
  3. **Zero-Friction Sandbox**: All first-party tools support free testing with `x-playground-test: true`.
  4. **OpenAPI 3.1 & llms.txt Discovery**: Fully machine-readable for autonomous agents.
  ```

---

## 3. `wong2/mcp-cli`

- **Integration Mode:** Issue / Feature Proposal for Remote Tool Resolution
- **Title:** Support AIPages registry search and dispatch in `mcp-cli`
- **Body:**
  ```markdown
  `mcp-cli` is great for inspecting local servers. AIPages (https://aipages.tech) hosts a free vector search API of active MCP tools:
  `GET https://aipages.tech/search?q=<intent>`

  We would love to submit a PR or plugin allowing `mcp-cli` users to run:
  `mcp-cli search <query>`
  fetching live tools directly from the AIPages registry.
  ```

---

## 4. `appcypher/awesome-mcp-servers`

- **Target Section:** `Aggregators & Catalogs`
- **Entry:**
  ```markdown
  - [AIPages](https://aipages.tech) - Autonomous agent tool directory, vector search index, and x402 Base micro-settlement gateway.
  ```

---

## 5. Cursor Directory Hubs (`cursor.directory` / `open-ctx`)

- **Title:** AIPages Unified MCP Proxy for Cursor
- **Snippet:**
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
- **Description:** Instantly gives Cursor agents access to headless anti-bot web scraping, AST schema sanitization, and cryptographic financial audit oracles with zero local dependencies.
