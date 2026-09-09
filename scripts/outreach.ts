import { crawlOnce } from "../src/crawler.js";
import { alertOnFailure } from "../src/notify.js";
import { searchForMcpRepos, sendOutreachIssue } from "./mcp-outreach.js";
import { generatePromotionalSnippet } from "./aus-snippet.js";
import { createStore } from "../src/db.js";

/**
 * 24/7 Acquisition Engine:
 *   1. Discover active MCP repo developers via GitHub search
 *   2. Send GitHub issue with embedded AUS MCP snippet
 *   3. Log referral metadata (promotedBy) for attribution
 */

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_REPOS_PER_CYCLE = 10;

async function runOutreachCycle(cycle: number): Promise<void> {
  const store = await createStore();
  console.log(`[outreach] === Cycle ${cycle} === ${new Date().toISOString()}`);

  try {
    // 1. Search for active MCP repos
    const repos = await searchForMcpRepos(MAX_REPOS_PER_CYCLE);
    console.log(`[outreach] Found ${repos.length} qualifying repos`);

    let sent = 0;
    for (const repo of repos) {
      try {
        // 2. Generate personalized snippet
        const snippet = await generatePromotionalSnippet({
          targetRepo: repo.name,
          promotedBy: "aus-agent-alpha",
        });

        // 3. Send GitHub issue with snippet
        await sendOutreachIssue({
          owner: repo.owner.login,
          repo: repo.name,
          title: "AI Agent Discovery: Boost your tool with AUS micro-payments",
          body: snippet.body,
          labels: ["mcp-integration", "agent-discovery"],
        });

        // 4. Log attribution
        await store.upsert({
          namespace: `outreach.${repo.name}.${repo.owner.login}`,
          name: `AUS Outreach: ${repo.name}`,
          description: `MCP config snippet pushed to ${repo.full_name} | promotedBy: aus-agent-alpha`,
          connectionType: "http",
          endpointUrl: repo.html_url,
          healthStatus: "active",
          embedding: Array(3072).fill(0), // placeholder
          schema: { type: "object", properties: { promotion: { type: "string" } } },
          schemaSource: repo.html_url,
          updatedAt: new Date(),
          developer: {
            address: "0x0a3eA5A76F2d0d4F8E2B9cCdE1aB3f456789012",
            listingFeePaid: false,
            listingFeeAmount: 0,
          },
          pricing: { model: "free", costPerCall: 0 },
          status: "active",
        } as any);

        sent++;
        console.log(`[outreach] ✅ ${repo.full_name} — snippet sent + logged`);
      } catch (err) {
        console.error(`[outreach] ❌ ${repo.full_name}: ${(err as Error).message}`);
      }

      await new Promise((r) => setTimeout(r, 1000)); // rate-limit safety
    }

    console.log(`[outreach] Cycle ${cycle} done: ${sent}/${repos.length} repos reached`);
    await alertOnFailure({
      discovered: repos.length,
      ingested: sent,
      errors: repos.length - sent,
      cycle,
    });
  } catch (err) {
    console.error(`[outreach] Cycle ${cycle} crashed:`, (err as Error).message);
    await alertOnFailure({
      discovered: 0,
      ingested: 0,
      errors: 50,
      cycle,
    });
  }
}

// CLI entry point
const mode = process.argv[2] ?? "once";

if (mode === "watch") {
  console.log(`[outreach] Starting 24/7 loop (interval: ${INTERVAL_MS / 3600000}h)`);
  let cycle = 0;
  runOutreachCycle(++cycle).catch(() => {}); // initial run
  setInterval(() => runOutreachCycle(++cycle).catch(() => {}), INTERVAL_MS);
} else {
  runOutreachCycle(1).then(() => process.exit(0));
}
