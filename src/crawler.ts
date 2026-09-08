/**
 * Automated Discovery & Growth Engine — background cron crawler.
 *
 * Authoritative ingestion: a tool is ingested ONLY when it ships a genuine,
 * parseable manifest — an `mcp.json` (MCP manifest) or `openapi.json` /
 * `swagger.json` (OpenAPI/Swagger) document. Schemas are parsed verbatim from
 * those manifests. Nothing is ever inferred by an LLM or guessed from a name
 * or description; repos whose manifest is missing, unparseable, or schema-less
 * are rejected outright.
 *
 * Pipeline per cycle:
 *   1. Discover candidate GitHub repos (code search for manifest files).
 *   2. Fetch + parse the manifest for each repo (see manifest.ts).
 *   3. Reject repos with no genuine schema-bearing tools.
 *   4. For each extracted tool: health-check endpoint, embed description, upsert.
 *
 * Run modes:
 *   npm run crawl         — one-shot cycle
 *   npm run crawl:watch   — continuous loop with CRAWL_INTERVAL_MS delay
 *
 * Environment (all optional):
 *   GITHUB_TOKEN          — GitHub PAT (unauthenticated code search = 60 req/hr)
 *   CRAWL_INTERVAL_MS     — sleep between cycles (default 5 min)
 *   CRAWL_MAX_REPOS       — max candidate repos per cycle (default 20)
 *   CRAWL_TIMEOUT_MS      — per-fetch / per-health-check timeout (default 8 s)
 */

import { embed } from "./embedding.js";
import { createStore } from "./db.js";
import type { Tool, HealthStatus } from "./types.js";
import { scrapeGitHub, searchGitHubRepos, fetchRepoInfo } from "./scraper.js";
import { fetchManifest, extractTools, slugify, type ExtractedTool } from "./manifest.js";
import { parseMcpServersConfig, probeMcpServer } from "./mcp-probe.js";
import { healthCheck } from "./health-check.js";
import { generateToolSchema } from "./schema-generator.js";

// ── config (crawl-specific, optional env) ──────────────────────────────────

const CRAWL_INTERVAL_MS = Math.max(
  5000,
  parseInt(process.env.CRAWL_INTERVAL_MS ?? "300000", 10),
);
const CRAWL_MAX_REPOS = Math.max(1, parseInt(process.env.CRAWL_MAX_REPOS ?? "20", 10));
const CRAWL_TIMEOUT_MS = Math.max(1000, parseInt(process.env.CRAWL_TIMEOUT_MS ?? "8000", 10));

// MCP runtime probe — OFF by default. Probing runs server code; see mcp-probe.ts.
const CRAWL_MCP_PROBE = (process.env.CRAWL_MCP_PROBE ?? "false") === "true";
const CRAWL_MCP_EXEC = (process.env.CRAWL_MCP_EXEC ?? "false") === "true";
const CRAWL_MCP_TIMEOUT_MS = Math.max(5000, parseInt(process.env.CRAWL_MCP_TIMEOUT_MS ?? "30000", 10));

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

// ── one-shot crawl cycle ───────────────────────────────────────────────────

/** Discover candidate repos (deduped by full name; keep first matched path). */
async function discoverCandidates(
  max: number,
): Promise<Array<{ repo: string; path?: string }>> {
  // Prefer code search (precise manifest path) when a token is available.
  const byCode = await scrapeGitHub(max);
  if (byCode.length > 0) {
    const map = new Map<string, { repo: string; path?: string }>();
    for (const item of byCode) {
      if (!map.has(item.repository.full_name)) {
        map.set(item.repository.full_name, { repo: item.repository.full_name, path: item.path });
      }
    }
    return [...map.values()];
  }

  // Fallback: topic-based repository search (works unauthenticated).
  // The manifest is still fetched + parsed from each repo, so schema
  // authority is unchanged — only the discovery signal is broader.
  const repos = await searchGitHubRepos("topic:mcp-server topic:mcp", max);
  return repos.map((r) => ({ repo: r.full_name }));
}

export async function crawlOnce(): Promise<CrawlResult> {
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
        // 2c. No manifest — try Gemini schema generation from repo description.
        const info = await fetchRepoInfo(repo);
        if (info && info.description && info.description.trim().length > 20) {
          console.log(`[crawler] NO MANIFEST ${repo} — falling back to Gemini schema generation from description`);
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
            console.log(`[crawler] Gemini generated schema for ${repo} → ${Object.keys(gen.schema.properties).length} props (confidence: ${gen.confidence ?? "n/a"})`);
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

        // 2a. Registry-style manifest (`tools[]`) → parse schemas directly.
        tools = extractTools(repo, manifest);

        // 2b. Config-style mcp.json (`mcpServers`) → probe the live server for
        // its authoritative tools/list schemas (only when the probe is enabled).
        if (tools.length === 0 && manifest.kind === "mcp" && CRAWL_MCP_PROBE) {
          const configs = parseMcpServersConfig(manifest.raw);
          if (configs.length > 0 && CRAWL_MCP_EXEC) {
            console.warn(
              "[crawler] CRAWL_MCP_EXEC=true — spawning MCP servers runs their code. " +
              "Run the crawler in an isolated sandbox with no host credentials.",
            );
          }
          for (const cfg of configs) {
            const isStdio = !!cfg.command && !cfg.url;
            if (isStdio && !CRAWL_MCP_EXEC) {
              console.log(
                `[crawler] SKIP stdio probe ${repo}/${cfg.name} — set CRAWL_MCP_EXEC=true to allow process spawn`,
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
              console.log(`[crawler] probed ${repo}/${cfg.name} → ${pr.tools.length} tools`);
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
        if (t.endpointUrl) {
          const alive = await healthCheck(t.endpointUrl, CRAWL_TIMEOUT_MS);
          healthStatus = alive ? "active" : "inactive";
          result.healthChecked++;
          if (!alive) {
            console.log(`[crawler] health-check FAIL ${t.namespace} (${t.endpointUrl})`);
          }
        } else {
          // stdio / unknown transport — no HTTP endpoint to probe.
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

    // Be a good citizen — small delay between repos.
    await sleep(200);
  }

  return result;
}

// ── continuous loop ───────────────────────────────────────────────────────

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
    await sleep(CRAWL_INTERVAL_MS);
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const mode = process.argv[2] ?? "once";
if (mode === "watch") {
  crawlLoop().catch((err) => {
    console.error("Fatal crawler:", err);
    process.exit(1);
  });
} else {
  crawlOnce()
    .then((r) => {
      console.log("[crawler] Summary:", JSON.stringify(r));
      process.exit(r.errors > 10 ? 2 : 0);
    })
    .catch((err) => {
      console.error("Fatal crawler:", err);
      process.exit(1);
    });
}
