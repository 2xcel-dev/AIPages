/**
 * Autonomous Weekly Social & Content Distribution Engine
 *
 * Generates tailored weekly update packs and 7 daily micro-spotlights
 * for X (Twitter), Reddit, LinkedIn, Hacker News, and technical blogs.
 *
 * Output: distribution/weekly-updates/week-<YYYY-WW>/
 *
 * Usage:
 *   npx tsx scripts/weekly-content.ts
 *   npm run content:weekly
 */
import fs from "node:fs";
import path from "node:path";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";

function getWeekNumber(d: Date): { year: number; week: number; formatted: string } {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = d.getFullYear();
  const formatted = `${year}-W${week.toString().padStart(2, "0")}`;
  return { year, week, formatted };
}

function generateWeeklyPack() {
  const now = new Date();
  const { formatted, week, year } = getWeekNumber(now);
  const outDir = path.resolve(process.cwd(), "distribution/weekly-updates", formatted);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[weekly-content] Generating distribution pack for Week ${week}, ${year} in: ${outDir}`);

  // Select two rotating featured tools based on week index
  const toolIndex1 = (week * 2) % CANONICAL_AUS_TOOLS.length;
  const toolIndex2 = (week * 2 + 1) % CANONICAL_AUS_TOOLS.length;
  const tool1 = CANONICAL_AUS_TOOLS[toolIndex1];
  const tool2 = CANONICAL_AUS_TOOLS[toolIndex2];

  // ── 1. Twitter / X Thread ──────────────────────────────────────────────
  const twitterThread = `---
Platform: X (Twitter)
Timing: Post on Tuesday or Wednesday at 9:00 AM EST
Tone: Technical, punchy, high-signal
---

🧵 Tweet 1 (Hook):
Pre-loading 20+ standalone MCP servers into Claude Desktop or Cursor wastes 15,000–30,000 tokens before your AI agent even answers a question.

Here is how we solved prompt bloat with on-demand vector discovery and Base x402 settlement: 👇

---

🧵 Tweet 2 (The Solution):
Instead of registering every tool at startup, our gateway equips agents with 3 dynamic meta-tools:
• search_tools (3072-dim Gemini vector index)
• inspect_tool_schema (pulls down JSON Schema on the fly)
• execute_tool (instant sandbox or Base x402 settlement)

NPM: https://www.npmjs.com/package/aipages-mcp-gateway

---

🧵 Tweet 3 (Tool Spotlight: ${tool1.name}):
Featured AUS Tool this week: ${tool1.name} (${tool1.namespace})
${tool1.description}

Test it instantly with zero fees:
curl -X POST "https://aipages.tech/tool/${tool1.name.replace(/_/g, "-")}" \\
  -H "Content-Type: application/json" \\
  -H "x-playground-test: true" \\
  -d '{"data": {}}'

---

🧵 Tweet 4 (Tool Spotlight: ${tool2.name}):
Second spotlight: ${tool2.name} (${tool2.namespace})
${tool2.description}

Zero transaction fee in Sandbox Mode. Settle production calls on Base Mainnet USDC (${tool2.pricing?.costPerCall} USDC/call).

---

🧵 Tweet 5 (Call to Action):
Try all 18 first-party AUS tools live directly in your browser with our new interactive playground:
👉 https://aipages.tech/playground

Python SDK: \`pip install aipages\`
Open-source repo: https://github.com/2xcel-dev/AIPages
`;

  // ── 2. Reddit Post ──────────────────────────────────────────────────────
  const redditPost = `---
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
\`npx -y aipages-mcp-gateway\`

Instead of pre-loading dozens of tool schemas, the gateway only exposes 3 light meta-tools:
1. \`search_tools\`: Queries a 3072-dimensional Gemini vector index by natural language intent (e.g., "sanitize untrusted user JSON and redact API keys").
2. \`inspect_tool_schema\`: Fetches the exact schema on-demand only when the agent decides to use it.
3. \`execute_tool\`: Dispatches the call with instant sandbox verification or HTTP 402 Base Mainnet settlement.

### Live Browser Playground:
You can test the entire fleet of 18 Agent Utility Services directly in your browser with zero friction:
👉 https://aipages.tech/playground

### Code & Installation:
- **NPM Package**: https://www.npmjs.com/package/aipages-mcp-gateway
- **Python SDK**: \`packages/aipages-py\` (with native LangChain and CrewAI adapters)
- **GitHub**: https://github.com/2xcel-dev/AIPages

Would love to hear how other developers are handling tool discovery and system prompt budgets in their agent setups!
`;

  // ── 3. 7 Daily Micro-Spotlights (Monday - Sunday) ────────────────────────
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  let dailyContent = `---
Platform: X (Twitter) & LinkedIn Daily Micro-Posts
Schedule: 1 post per day (Morning 8:30 - 9:30 AM EST)
---

`;

  for (let i = 0; i < 7; i++) {
    const t = CANONICAL_AUS_TOOLS[(week * 7 + i) % CANONICAL_AUS_TOOLS.length];
    dailyContent += `### ${days[i]}: ${t.name}
**Hook**: Autonomous AI Agent Tool of the Day: ${t.name}
**Utility**: ${t.description}
**Free Sandbox Test**:
\`\`\`bash
curl -X POST "https://aipages.tech/tool/${t.name.replace(/_/g, "-")}" \\
  -H "x-playground-test: true" \\
  -H "Content-Type: application/json" \\
  -d '{"data": {}}'
\`\`\`
Try in browser: https://aipages.tech/playground?tool=${t.namespace}
NPM Gateway: https://www.npmjs.com/package/aipages-mcp-gateway

---

`;
  }

  // ── 4. Technical Changelog & Milestone Update ───────────────────────────
  const changelog = `---
Platform: GitHub Release / Engineering Blog / HN Comment
Title: AIPages Weekly Engineering Update — ${formatted}
---

## Summary of Changes (${formatted})

### New Capabilities
- **Interactive Web Playground**: Deployed \`https://aipages.tech/playground\` enabling human developers and AI agents to test all 18 first-party AUS tools live in-browser.
- **Semantic Chunker AUS Engine**: Added \`net.2xcel.aus.semantic-chunker\` with sentence-boundary preservation, token budgeting, and custom metadata mapping.
- **NPM Unified Gateway**: Published \`aipages-mcp-gateway@1.0.0\` to npmjs.com.
- **Python SDK Scaffolding**: Built \`aipages\` v0.1.0 with LangChain Core and CrewAI adapter support.
- **Autonomous MCP Ingestion**: Background daemon scanning 10+ open-source MCP repositories every 6 hours and proposing automated integration PRs.

### Fleet Metrics
- **First-Party Tools**: 18 active, hardened Agent Utility Services.
- **Discovery Endpoints**: \`/llms.txt\`, \`/llms-full.txt\`, \`/mcp.json\`, \`/mcp-actions.json\`, \`/openapi.json\`.
- **Payment Settlement**: Base Mainnet (Chain ID 8453) USDC / USDT via HTTP 402 with anti-replay guarantees.
`;

  // Write all artifacts
  fs.writeFileSync(path.join(outDir, "x-twitter-thread.md"), twitterThread, "utf8");
  fs.writeFileSync(path.join(outDir, "reddit-post.md"), redditPost, "utf8");
  fs.writeFileSync(path.join(outDir, "daily-spotlights.md"), dailyContent, "utf8");
  fs.writeFileSync(path.join(outDir, "weekly-changelog.md"), changelog, "utf8");

  console.log(`[weekly-content] Successfully created 4 publication files:`);
  console.log(`  1. ${path.join(outDir, "x-twitter-thread.md")}`);
  console.log(`  2. ${path.join(outDir, "reddit-post.md")}`);
  console.log(`  3. ${path.join(outDir, "daily-spotlights.md")}`);
  console.log(`  4. ${path.join(outDir, "weekly-changelog.md")}`);
}

generateWeeklyPack();
