import { crawlOnce } from "../src/crawler.js";
import { searchForMcpRepos, sendOutreachIssue } from "./mcp-outreach.js";
import { generatePromotionalSnippet } from "./aus-snippet.js";
import { createStore } from "../src/db.js";
import { runHealthCheckJob, type HealthCheckJobSummary } from "./health-check-job.js";

// notify.ts lives in dist/ (same level as scripts/ when compiled), so we load
// it dynamically at runtime to avoid TypeScript path resolution errors.
async function loadNotify(): Promise<{ alertOnFailure: (result: {
  discovered: number;
  ingested: number;
  errors: number;
  cycle?: number;
}) => Promise<void> }> {
  try {
    const mod = await import("../src/notify.js");
    return { alertOnFailure: mod.alertOnFailure };
  } catch {
    try {
      const mod = await import("../notify.js");
      return { alertOnFailure: mod.alertOnFailure };
    } catch {
      return { alertOnFailure: async () => {} };
    }
  }
}

/**
 * 24/7 Acquisition & Health Monitoring Engine:
 *   1. Health-check all eligible tool endpoints with bounded timeout & failure logging
 *   2. Discover active MCP repo developers via GitHub search
 *   3. Send GitHub issue with embedded AUS MCP snippet
 *   4. Log referral metadata (promotedBy) for attribution
 */

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_REPOS_PER_CYCLE = 10;

export async function runOutreachCycle(cycle: number): Promise<{ healthSummary?: HealthCheckJobSummary; sent: number }> {
  const store = await createStore();
  console.log(`[outreach] === Cycle ${cycle} === ${new Date().toISOString()}`);

  let healthSummary: HealthCheckJobSummary | undefined;
  try {
    // 1. Focused Health-Check Job
    console.log(`[outreach] [health-check] Probing eligible tool endpoints...`);
    healthSummary = await runHealthCheckJob({ store });
    console.log(
      `[outreach] [health-check] Completed: ${healthSummary.active} active, ${healthSummary.inactive} inactive out of ${healthSummary.totalEligible} eligible endpoints (${healthSummary.durationMs}ms)`
    );
  } catch (err: any) {
    console.error(`[outreach] [health-check] Health check job error:`, err?.message);
  }

  try {
    // 2. Search for active MCP repos
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

        // 3. Send GitHub issue with snippet (or write proposal if dry-run)
        const dispatchResult = await sendOutreachIssue({
          owner: repo.owner.login,
          repo: repo.name,
          title: "AIPages Discovery: Boost your tool with AUS micro-payments on Base",
          body: snippet.body,
          labels: ["mcp-integration", "agent-discovery"],
        });

        // 4. Log attribution
        await store.upsert({
          namespace: `outreach.${repo.name}.${repo.owner.login}`,
          name: `AIPages Outreach: ${repo.name}`,
          description: `MCP config snippet staged for ${repo.full_name} | promotedBy: aus-agent-alpha`,
          connectionType: "http",
          endpointUrl: repo.html_url,
          healthStatus: "active",
          embedding: Array(3072).fill(0), // placeholder
          schema: { type: "object", properties: { promotion: { type: "string" } } },
          schemaSource: repo.html_url,
          updatedAt: new Date(),
          developer: {
            address: process.env.X402_WALLET_ADDRESS || "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            listingFeePaid: false,
            listingFeeAmount: 0,
          },
          pricing: { model: "free", costPerCall: 0 },
          status: "active",
        } as any);

        sent++;
        console.log(`[outreach] [PROPOSAL] ${repo.full_name} - snippet processed (${dispatchResult.live ? "live" : "dry-run"})`);
      } catch (err) {
        console.error(`[outreach] ❌ ${repo.full_name}: ${(err as Error).message}`);
      }

      await new Promise((r) => setTimeout(r, 1000)); // rate-limit safety
    }

    console.log(`Cycle ${cycle} done: ${sent}/${repos.length} repos reached`);
    const { alertOnFailure } = await loadNotify();
    await alertOnFailure({
      discovered: repos.length,
      ingested: sent,
      errors: repos.length - sent,
      cycle,
    });
    return { healthSummary, sent };
  } catch (err) {
    console.error(`[outreach] Cycle ${cycle} crashed:`, (err as Error).message);
    const { alertOnFailure } = await loadNotify();
    await alertOnFailure({
      discovered: 0,
      ingested: 0,
      errors: 50,
      cycle,
    });
    return { healthSummary, sent: 0 };
  }
}

// CLI entry point
import { fileURLToPath } from "node:url";
import path from "node:path";

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  const mode = process.argv[2] ?? "once";

  if (mode === "health" || mode === "health-check") {
    console.log(`[outreach] Running focused health-check job...`);
    runHealthCheckJob()
      .then((summary) => {
        console.log(`\n=== Health-Check Job Summary ===`);
        console.log(`Total eligible endpoints: ${summary.totalEligible}`);
        console.log(`Active (healthy):         ${summary.active}`);
        console.log(`Inactive (unhealthy):     ${summary.inactive}`);
        console.log(`Duration:                 ${summary.durationMs}ms`);
        for (const r of summary.results) {
          const flag = r.healthStatus === "active" ? "✅ ACTIVE" : "❌ INACTIVE";
          const reason = r.failureReason ? ` (Reason: ${r.failureReason})` : "";
          console.log(`  - [${flag}] ${r.namespace} -> ${r.endpointUrl} [${r.latencyMs}ms]${reason}`);
        }
        process.exit(0);
      })
      .catch((err) => {
        console.error("[outreach] Health-check job failed:", err);
        process.exit(1);
      });
  } else if (mode === "watch") {
    console.log(`[outreach] Starting 24/7 loop (interval: ${INTERVAL_MS / 3600000}h)`);
    let cycle = 0;
    runOutreachCycle(++cycle).catch(() => {}); // initial run
    setInterval(() => runOutreachCycle(++cycle).catch(() => {}), INTERVAL_MS);
  } else {
    runOutreachCycle(1).then(() => process.exit(0));
  }
}
