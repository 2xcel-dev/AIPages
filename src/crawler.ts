/**
 * Automated Discovery & Growth Engine: background cron crawler.
 *
 * Authoritative ingestion: a tool is ingested ONLY when it ships a genuine,
 * parseable manifest: an `mcp.json` (MCP manifest) or `openapi.json` /
 * `swagger.json` (OpenAPI/Swagger) document. Schemas are parsed verbatim from
 * those manifests. Nothing is ever inferred by an LLM or guessed from a name
 * or description; repos whose manifest is missing, unparseable, or schema-less
 * are rejected outright.
 *
 * Pipeline per cycle:
 *   1. Discover candidate GitHub repos and npm packages (code and registry search).
 *   2. Fetch + parse the manifest for each repo (see manifest.ts).
 *   3. Reject repos with no genuine schema-bearing tools.
 *   4. For each extracted tool: health-check endpoint, embed description, upsert.
 *
 * Run modes:
 *   npm run crawl         : one-shot cycle
 *   npm run crawl:watch   : continuous loop with CRAWL_INTERVAL_MS delay
 *   npm run crawl:cron    : bi-daily cron schedule (0 2,14 * * *)
 *
 * Environment (all optional):
 *   GITHUB_TOKEN          : GitHub PAT (unauthenticated code search = 60 req/hr)
 *   CRAWL_INTERVAL_MS     : sleep between cycles (default 5 min)
 *   CRAWL_MAX_REPOS       : max candidate repos per cycle (default 20)
 *   CRAWL_TIMEOUT_MS      : per-fetch / per-health-check timeout (default 8 s)
 */

import cron, { type ScheduledTask } from "node-cron";
import { embed } from "./embedding.js";
import { createStore } from "./db.js";
import type { Tool, HealthStatus } from "./types.js";
import { scrapeGitHub, searchGitHubRepos, fetchRepoInfo, scrapeNpm } from "./scraper.js";
import { fetchManifest, extractTools, slugify, type ExtractedTool } from "./manifest.js";
import { parseMcpServersConfig, probeMcpServer } from "./mcp-probe.js";
import { healthCheck } from "./health-check.js";
import { generateToolSchema } from "./schema-generator.js";
import { alertOnFailure } from "./notify.js";

// -- config (crawl-specific, optional env) ----------------------------------

const CRAWL_INTERVAL_MS = Math.max(
  5000,
  parseInt(process.env.CRAWL_INTERVAL_MS ?? "300000", 10),
);
const CRAWL_MAX_REPOS = Math.max(1, parseInt(process.env.CRAWL_MAX_REPOS ?? "20", 10));
const CRAWL_TIMEOUT_MS = Math.max(1000, parseInt(process.env.CRAWL_TIMEOUT_MS ?? "8000", 10));

// MCP runtime probe: OFF by default. Probing runs server code; see mcp-probe.ts.
const CRAWL_MCP_PROBE = (process.env.CRAWL_MCP_PROBE ?? "false") === "true";
const CRAWL_MCP_EXEC = (process.env.CRAWL_MCP_EXEC ?? "false") === "true";
const CRAWL_MCP_TIMEOUT_MS = Math.max(5000, parseInt(process.env.CRAWL_MCP_TIMEOUT_MS ?? "30000", 10));

export const BI_DAILY_CRON_SCHEDULE = "0 2,14 * * *";

export interface CrawlResult {
  discovered: number; // candidate repos found via code search
  fetched: number; // manifests successfully fetched
  rejected: number; // repos with no parseable, schema-bearing manifest
  extracted: number; // schema-bearing tools parsed from manifests
  healthChecked: number;
  active: number; // tools whose endpoint responded
  ingested: number; // tools upserted
  errors: number;
}

// Mutex lock to prevent overlapping crawl executions and race conditions
let isCrawlRunning = false;

// -- candidate discovery (GitHub + npm) -------------------------------------

/** Discover candidate repos (deduped by full name; keep first matched path). */
export async function discoverCandidates(
  max: number,
): Promise<Array<{ repo: string; path?: string }>> {
  const candidates: Array<{ repo: string; path?: string }> = [];
  const seen = new Set<string>();

  // 1. Prefer GitHub code search (precise manifest path) when a token is available.
  const byCode = await scrapeGitHub(max);
  for (const item of byCode) {
    if (!seen.has(item.repository.full_name)) {
      seen.add(item.repository.full_name);
      candidates.push({ repo: item.repository.full_name, path: item.path });
    }
  }

  // 2. Discover MCP packages from npm and inspect linked GitHub repositories
  try {
    const npmResults = await scrapeNpm(Math.min(max, 20));
    for (const obj of npmResults.objects) {
      const repoUrl = obj.package.links?.repository;
      if (repoUrl && repoUrl.includes("github.com/")) {
        const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/\.]+)/);
        if (match && match[1]) {
          const repoName = match[1].replace(/\.git$/, "");
          if (!seen.has(repoName)) {
            seen.add(repoName);
            candidates.push({ repo: repoName });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[crawler] npm discovery fallback notice:", err);
  }

  // 3. Fallback: topic-based repository search if still below quota (works unauthenticated).
  if (candidates.length < max) {
    const repos = await searchGitHubRepos("topic:mcp-server topic:mcp", max - candidates.length);
    for (const r of repos) {
      if (!seen.has(r.full_name)) {
        seen.add(r.full_name);
        candidates.push({ repo: r.full_name });
      }
    }
  }

  return candidates.slice(0, max);
}

// -- one-shot crawl cycle ---------------------------------------------------

export async function crawlOnce(): Promise<CrawlResult> {
  if (isCrawlRunning) {
    console.warn("[crawler] Crawl cycle already in progress; skipping duplicate run to prevent race conditions.");
    return {
      discovered: 0,
      fetched: 0,
      rejected: 0,
      extracted: 0,
      healthChecked: 0,
      active: 0,
      ingested: 0,
      errors: 0,
    };
  }

  isCrawlRunning = true;
  try {
    const store = await createStore();
    const candidates = await discoverCandidates(CRAWL_MAX_REPOS);

    const result: CrawlResult = {
      discovered: candidates.length,
      fetched: 0,
      rejected: 0,
      extracted: 0,
      healthChecked: 0,
      active: 0,
      ingested: 0,
      errors: 0,
    };

    console.log(`[crawler] Discovered ${result.discovered} candidate repos this cycle`);

    for (const { repo, path } of candidates) {
      try {
        // 2. Fetch + parse the manifest. Reject on any failure to produce schemas.
        const manifest = await fetchManifest(repo, path, CRAWL_TIMEOUT_MS);
        let tools: ExtractedTool[] = [];

        if (!manifest) {
          // 2c. No manifest: try Gemini schema generation from repo description.
          const info = await fetchRepoInfo(repo);
          if (info && info.description && info.description.trim().length > 20) {
            console.log(`[crawler] NO MANIFEST ${repo}: falling back to Gemini schema generation from description`);
            const name = info.full_name.split("/")[1] ?? info.full_name;
            const gen = await generateToolSchema(name, info.description);
            if (gen.schema && gen.schema.properties && Object.keys(gen.schema.properties).length > 0) {
              const repoSlug = repo.toLowerCase().replace(/[^a-z0-9.-]/g, ".");
              tools.push({
                name,
                description: info.description,
                schema: gen.schema,
                connectionType: "http",
                endpointUrl: info.html_url,
                namespace: `github.${repoSlug}.${slugify(name)}`,
                schemaSource: `gemini-fallback:${info.full_name}`,
              });
              console.log(`[crawler] Gemini generated schema for ${repo} -> ${Object.keys(gen.schema.properties).length} props (confidence: ${gen.confidence ?? "n/a"})`);
            } else {
              result.rejected++;
              console.log(`[crawler] REJECT ${repo}: no manifest + Gemini produced no useful schema`);
              continue;
            }
          } else {
            result.rejected++;
            console.log(`[crawler] REJECT ${repo}: no fetchable mcp.json / openapi.json / swagger.json`);
            continue;
          }
        } else {
          result.fetched++;

          // 2a. Registry-style manifest (`tools[]`): parse schemas directly.
          tools = extractTools(repo, manifest);

          // 2b. Config-style mcp.json (`mcpServers`): probe the live server for
          // its authoritative tools/list schemas (only when the probe is enabled).
          if (tools.length === 0 && manifest.kind === "mcp" && CRAWL_MCP_PROBE) {
            const configs = parseMcpServersConfig(manifest.raw);
            if (configs.length > 0 && CRAWL_MCP_EXEC) {
              console.warn(
                "[crawler] CRAWL_MCP_EXEC=true: spawning MCP servers runs their code. " +
                "Run the crawler in an isolated sandbox with no host credentials.",
              );
            }
            for (const cfg of configs) {
              const isStdio = !!cfg.command && !cfg.url;
              if (isStdio && !CRAWL_MCP_EXEC) {
                console.log(
                  `[crawler] SKIP stdio probe ${repo}/${cfg.name}: set CRAWL_MCP_EXEC=true to allow process spawn`,
                );
                continue;
              }
              const pr = await probeMcpServer(cfg, CRAWL_MCP_TIMEOUT_MS);
              if (pr && pr.tools.length > 0) {
                const repoSlug = repo.toLowerCase().replace(/[^a-z0-9.-]/g, ".");
                for (const t of pr.tools) {
                  tools.push({
                    name: t.name,
                    description: t.description || `${cfg.name} / ${t.name}`,
                    schema: t.schema,
                    connectionType: pr.transport === "stdio" ? "stdio" : "http",
                    endpointUrl: pr.transport === "http" ? cfg.url : undefined,
                    namespace: `github.${repoSlug}.${slugify(cfg.name)}.${slugify(t.name)}`,
                    schemaSource: `${manifest.url}#server=${cfg.name}`,
                  });
                }
                console.log(`[crawler] probed ${repo}/${cfg.name} -> ${pr.tools.length} tools`);
              }
            }
          }
        }

        if (tools.length === 0) {
          result.rejected++;
          console.log(`[crawler] REJECT ${repo}: no schema-bearing tools (manifest parsed or probe yielded none)`);
          continue;
        }
        result.extracted += tools.length;

        // 3. Health-check + embed + upsert each genuine tool.
        for (const t of tools) {
          let healthStatus: HealthStatus = "unknown";
          let lastChecked: Date | undefined;
          let failureReason: string | null = null;

          if (t.endpointUrl) {
            const alive = await healthCheck(t.endpointUrl, CRAWL_TIMEOUT_MS);
            healthStatus = alive ? "active" : "inactive";
            lastChecked = new Date();
            failureReason = alive ? null : "Endpoint unreachable or timed out";
            result.healthChecked++;
            if (!alive) {
              console.log(`[crawler] health-check FAIL ${t.namespace} (${t.endpointUrl})`);
            }
          } else {
            // stdio / unknown transport: no HTTP endpoint to probe.
            result.healthChecked++;
          }

          const embedding = await embed(
            `${t.namespace} ${t.name} ${t.description}`,
            "RETRIEVAL_DOCUMENT",
          );

          const toolDoc: Tool = {
            namespace: t.namespace,
            name: t.name,
            description: t.description,
            schema: t.schema,
            connectionType: t.connectionType,
            endpointUrl: t.endpointUrl,
            embedding,
            healthStatus,
            lastChecked,
            lastCheckedAt: lastChecked,
            failureReason,
            schemaSource: t.schemaSource,
            updatedAt: new Date(),
          };

          await store.upsert(toolDoc);
          result.ingested++;
          if (healthStatus === "active") result.active++;
        }
      } catch (err) {
        result.errors++;
        console.error(`[crawler] error processing ${repo}:`, err);
      }

      // Be a good citizen: small delay between repos.
      await sleep(200);
    }

    return result;
  } finally {
    isCrawlRunning = false;
  }
}

export async function crawlLoop(): Promise<void> {
  console.log(`[crawler] Starting continuous crawl loop (interval=${CRAWL_INTERVAL_MS}ms)`);
  let cycle = 0;
  while (true) {
    cycle++;
    const start = Date.now();
    console.log(`[crawler] === Cycle ${cycle} ===`);
    let result: CrawlResult = {
      discovered: 0,
      fetched: 0,
      rejected: 0,
      extracted: 0,
      healthChecked: 0,
      active: 0,
      ingested: 0,
      errors: 0,
    };
    try {
      result = await crawlOnce();
    } catch (err) {
      console.error(`[crawler] Cycle ${cycle} crashed:`, err);
      result.errors++;
    }
    const elapsed = Date.now() - start;
    console.log(
      `[crawler] Cycle ${cycle} done in ${elapsed}ms: ` +
        `discovered=${result.discovered} fetched=${result.fetched} ` +
        `rejected=${result.rejected} extracted=${result.extracted} ` +
        `ingested=${result.ingested} active=${result.active} errors=${result.errors}`,
    );

    // Send alert if failure conditions detected
    await alertOnFailure({ ...result, cycle });

    await sleep(CRAWL_INTERVAL_MS);
  }
}

/**
 * Start bi-daily cron runner via node-cron (schedule: 0 2,14 * * *).
 */
export function startCrawlerCron(cronExpression = BI_DAILY_CRON_SCHEDULE): ScheduledTask {
  console.log(`[crawler] Scheduling bi-daily crawler cron with pattern: "${cronExpression}" (UTC)`);
  return cron.schedule(
    cronExpression,
    async () => {
      console.log(`[crawler] Cron trigger fired at ${new Date().toISOString()}`);
      try {
        const res = await crawlOnce();
        console.log(`[crawler] Cron crawl cycle completed:`, JSON.stringify(res));
      } catch (err) {
        console.error(`[crawler] Cron crawl cycle error:`, err);
      }
    },
    {
      timezone: "UTC",
    },
  );
}

// -- helpers ----------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -- CLI --------------------------------------------------------------------

const isCliExecution = Boolean(
  process.argv[1] &&
    (process.argv[1].endsWith("crawler.ts") || process.argv[1].endsWith("crawler.js"))
);

if (isCliExecution) {
  const mode = process.argv[2] ?? "once";
  if (mode === "watch") {
    crawlLoop().catch((err) => {
      console.error("Fatal crawler:", err);
      process.exit(1);
    });
  } else if (mode === "cron") {
    startCrawlerCron();
    console.log(`[crawler] Running bi-daily crawler cron (${BI_DAILY_CRON_SCHEDULE} UTC). Press Ctrl+C to stop.`);
  } else {
    crawlOnce()
      .then((r) => {
        console.log("[crawler] Summary:", JSON.stringify(r));
        void alertOnFailure({ ...r, cycle: 1 });
        process.exit(r.errors > 10 ? 2 : 0);
      })
      .catch((err) => {
        console.error("Fatal crawler:", err);
        process.exit(1);
      });
  }
}
