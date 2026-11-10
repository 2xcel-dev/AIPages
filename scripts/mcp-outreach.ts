import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePromotionalSnippet, generateReadyToMergeConfig, type ReadyToMergeMcpConfig } from "./aus-snippet.js";

/**
 * Outbound Autonomous Prospecting Loop for MCP & Agent Tool Repositories
 *
 * Responsibilities:
 *   1. Runs on a 6-hour cycle (or manual trigger).
 *   2. Detects 5-10 new GitHub repositories publishing agent tools or MCP servers.
 *   3. Creates targeted proposal files in outreach-proposals/ showcasing how to integrate
 *      AIPages as an upstream execution engine.
 *   4. Each proposal includes ready-to-merge JSON configurations with referral tracking.
 */

export const PROSPECTING_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6-hour cycle

export interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string };
  description: string;
  stargazers_count: number;
  updated_at: string;
}

export interface IssuePayload {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels: string[];
}

export interface ProspectingStateRecord {
  prospectedAt: string;
  proposalMdPath: string;
  configJsonPath: string;
  referralCode: string;
  stargazersCount: number;
}

export interface ProspectingState {
  lastRunAt: string;
  cycleCount: number;
  prospects: Record<string, ProspectingStateRecord>;
}

export interface ProspectingResult {
  cycle: number;
  detectedCount: number;
  proposalsGenerated: number;
  newProspects: string[];
  generatedFiles: {
    repo: string;
    mdPath: string;
    jsonPath: string;
    referralCode: string;
  }[];
}

export interface McpProspectingOptions {
  cycle?: number;
  limit?: number;
  dryRun?: boolean;
  promotedBy?: string;
  outDir?: string;
  stateFile?: string;
  store?: any;
}

/**
 * Curated fleet of 10 active, high-priority MCP and agent-tool repositories.
 * Used when offline, rate-limited, or when GITHUB_TOKEN is not configured.
 */
export const CURATED_MCP_TARGETS: GitHubRepo[] = [
  {
    name: "servers",
    full_name: "modelcontextprotocol/servers",
    html_url: "https://github.com/modelcontextprotocol/servers",
    owner: { login: "modelcontextprotocol" },
    description: "Reference implementations for Model Context Protocol servers",
    stargazers_count: 5200,
    updated_at: new Date().toISOString(),
  },
  {
    name: "awesome-mcp-servers",
    full_name: "punkpeye/awesome-mcp-servers",
    html_url: "https://github.com/punkpeye/awesome-mcp-servers",
    owner: { login: "punkpeye" },
    description: "A curated list of Model Context Protocol (MCP) servers",
    stargazers_count: 3100,
    updated_at: new Date().toISOString(),
  },
  {
    name: "mcp-cli",
    full_name: "wong2/mcp-cli",
    html_url: "https://github.com/wong2/mcp-cli",
    owner: { login: "wong2" },
    description: "CLI inspection and dispatch tool for MCP servers",
    stargazers_count: 850,
    updated_at: new Date().toISOString(),
  },
  {
    name: "mcp-server-template",
    full_name: "isaacg/mcp-server-template",
    html_url: "https://github.com/isaacg/mcp-server-template",
    owner: { login: "isaacg" },
    description: "Starter template for building MCP servers in TypeScript",
    stargazers_count: 420,
    updated_at: new Date().toISOString(),
  },
  {
    name: "markdown-crawler-mcp",
    full_name: "zcaceres/markdown-crawler-mcp",
    html_url: "https://github.com/zcaceres/markdown-crawler-mcp",
    owner: { login: "zcaceres" },
    description: "MCP server for crawling web pages and returning markdown",
    stargazers_count: 360,
    updated_at: new Date().toISOString(),
  },
  {
    name: "hyperdx-mcp",
    full_name: "hyperdxio/hyperdx-mcp",
    html_url: "https://github.com/hyperdxio/hyperdx-mcp",
    owner: { login: "hyperdxio" },
    description: "Model Context Protocol server for querying telemetry and system logs",
    stargazers_count: 290,
    updated_at: new Date().toISOString(),
  },
  {
    name: "mcp-registry",
    full_name: "smithery-ai/mcp-registry",
    html_url: "https://github.com/smithery-ai/mcp-registry",
    owner: { login: "smithery-ai" },
    description: "Public registry and discovery index for community Model Context Protocol tools",
    stargazers_count: 670,
    updated_at: new Date().toISOString(),
  },
  {
    name: "mcp-hfspace",
    full_name: "evalstate/mcp-hfspace",
    html_url: "https://github.com/evalstate/mcp-hfspace",
    owner: { login: "evalstate" },
    description: "Hugging Face spaces execution bridge for Model Context Protocol agents",
    stargazers_count: 180,
    updated_at: new Date().toISOString(),
  },
  {
    name: "mcp-agent",
    full_name: "secretive-shell/mcp-agent",
    html_url: "https://github.com/secretive-shell/mcp-agent",
    owner: { login: "secretive-shell" },
    description: "Lightweight framework for building multi-agent MCP workflows and tools",
    stargazers_count: 410,
    updated_at: new Date().toISOString(),
  },
  {
    name: "mcp-dev-tools",
    full_name: "k-dense/mcp-dev-tools",
    html_url: "https://github.com/k-dense/mcp-dev-tools",
    owner: { login: "k-dense" },
    description: "Developer tooling and automated code analysis MCP servers",
    stargazers_count: 215,
    updated_at: new Date().toISOString(),
  },
];

/**
 * Load or initialize the prospecting state file.
 */
export function loadProspectingState(stateFilePath?: string): ProspectingState {
  const defaultPath = path.resolve(process.cwd(), ".data/mcp-prospecting-state.json");
  const targetPath = stateFilePath || defaultPath;

  try {
    if (fs.existsSync(targetPath)) {
      const raw = fs.readFileSync(targetPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err: any) {
    console.warn(`[outreach] Could not read prospecting state (${err.message}). Starting fresh.`);
  }

  return {
    lastRunAt: "",
    cycleCount: 0,
    prospects: {},
  };
}

/**
 * Save prospecting state to disk.
 */
export function saveProspectingState(state: ProspectingState, stateFilePath?: string): void {
  const defaultPath = path.resolve(process.cwd(), ".data/mcp-prospecting-state.json");
  const targetPath = stateFilePath || defaultPath;
  const dir = path.dirname(targetPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(targetPath, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Search GitHub for actively-maintained MCP server and agent-tool repositories.
 * Supports filtering against already-prospected repos to ensure discovery of new targets.
 */
export async function searchForMcpRepos(
  max: number = 10,
  filterSeen: boolean = false,
  state?: ProspectingState
): Promise<GitHubRepo[]> {
  const clampedMax = Math.max(5, Math.min(max, 15));
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const activeState = state || loadProspectingState();

  if (!token) {
    console.log(
      `[outreach] GITHUB_TOKEN not configured. Utilizing curated target fleet (${CURATED_MCP_TARGETS.length} targets).`
    );
    let targets = CURATED_MCP_TARGETS;
    if (filterSeen) {
      const unseen = targets.filter((r) => !activeState.prospects[r.full_name]);
      if (unseen.length >= 5) {
        targets = unseen;
      }
    }
    return targets.slice(0, clampedMax);
  }

  // Live GitHub Search: Search across MCP topics and manifests
  const searchQueries = [
    `topic:mcp-server+language:typescript&sort=updated&order=desc&per_page=${clampedMax * 2}`,
    `mcp.json+in:file+language:typescript&sort=updated&order=desc&per_page=${clampedMax * 2}`,
    `topic:model-context-protocol&sort=updated&order=desc&per_page=${clampedMax * 2}`,
  ];

  const candidateMap = new Map<string, GitHubRepo>();

  for (const q of searchQueries) {
    if (candidateMap.size >= clampedMax * 2) break;
    const url = `https://api.github.com/search/repositories?q=${q}`;

    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.warn(`[outreach] GitHub search API query returned ${resp.status}`);
        continue;
      }

      const data = (await resp.json()) as { items?: GitHubRepo[] };
      for (const item of data.items || []) {
        if (!candidateMap.has(item.full_name)) {
          candidateMap.set(item.full_name, {
            name: item.name,
            full_name: item.full_name,
            html_url: item.html_url,
            owner: item.owner,
            description: item.description || "",
            stargazers_count: item.stargazers_count,
            updated_at: item.updated_at,
          });
        }
      }
    } catch (err: any) {
      console.warn(`[outreach] GitHub search error on query: ${err.message}`);
    }
  }

  let candidates = Array.from(candidateMap.values());

  // Merge in curated targets if API returned fewer than 5
  if (candidates.length < 5) {
    for (const c of CURATED_MCP_TARGETS) {
      if (!candidateMap.has(c.full_name)) {
        candidates.push(c);
      }
    }
  }

  // If requested, prioritize repos that haven't been prospected yet
  if (filterSeen) {
    const unseen = candidates.filter((r) => !activeState.prospects[r.full_name]);
    if (unseen.length >= 5) {
      candidates = unseen;
    }
  }

  return candidates.slice(0, clampedMax);
}

/**
 * Generate proposal files in outreach-proposals/ for a specific repository:
 *   1. `<owner>_<repo>.md` - Rich targeted proposal markdown showcasing AIPages as upstream execution engine.
 *   2. `<owner>_<repo>.mcp.json` - Ready-to-merge JSON configuration file with referral tracking.
 */
export async function createTargetedProposal(
  repo: GitHubRepo,
  options?: {
    promotedBy?: string;
    outDir?: string;
  }
): Promise<{
  mdPath: string;
  jsonPath: string;
  referralCode: string;
  config: ReadyToMergeMcpConfig;
  body: string;
}> {
  const promotedBy = options?.promotedBy || "aus-agent-alpha";
  const outDir = options?.outDir || path.resolve(process.cwd(), "outreach-proposals");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const cleanOwner = repo.owner.login.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanRepo = repo.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const baseFilename = `${cleanOwner}_${cleanRepo}`;

  const snippet = await generatePromotionalSnippet({
    targetRepo: repo.full_name,
    promotedBy,
    owner: repo.owner.login,
    description: repo.description,
    stargazersCount: repo.stargazers_count,
  });

  const mdPath = path.join(outDir, `${baseFilename}.md`);
  const jsonPath = path.join(outDir, `${baseFilename}.mcp.json`);

  const mdContent = `# Issue Proposal: ${repo.full_name}
**Title:** AIPages Discovery: Boost your tool with AUS micro-payments on Base
**Labels:** mcp-integration, agent-discovery
**Target Repository:** ${repo.html_url}
**Referral Code:** \`${snippet.referralCode}\`
**Generated At:** ${new Date().toISOString()}

---

${snippet.body}
`;

  fs.writeFileSync(mdPath, mdContent, "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify(snippet.readyToMergeConfig, null, 2), "utf-8");

  return {
    mdPath,
    jsonPath,
    referralCode: snippet.referralCode,
    config: snippet.readyToMergeConfig,
    body: snippet.body,
  };
}

/**
 * Send a GitHub issue to a repository with an MCP config snippet.
 * When GITHUB_TOKEN is omitted or dry-run is enabled, saves proposal to outreach-proposals/.
 */
export async function sendOutreachIssue(
  payload: IssuePayload
): Promise<{ live: boolean; path?: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const outDir = path.resolve(process.cwd(), "outreach-proposals");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const filename = `${payload.owner}_${payload.repo}.md`;
    const filepath = path.join(outDir, filename);
    const content = `# Issue Proposal: ${payload.owner}/${payload.repo}
**Title:** ${payload.title}
**Labels:** ${payload.labels.join(", ")}
**Generated At:** ${new Date().toISOString()}

---

${payload.body}
`;
    fs.writeFileSync(filepath, content, "utf-8");
    console.log(`[outreach] [DRY RUN] Proposal generated and saved to: ${filepath}`);
    return { live: false, path: filepath };
  }

  const url = `https://api.github.com/repos/${payload.owner}/${payload.repo}/issues`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      title: payload.title,
      body: payload.body,
      labels: payload.labels,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub issue creation failed: ${resp.status} ${text}`);
  }

  console.log(`[outreach] Issue created successfully on ${payload.owner}/${payload.repo}`);
  return { live: true };
}

/**
 * Run a complete Outbound Autonomous Prospecting Loop cycle:
 *   1. Detects 5-10 repositories publishing agent tools or MCP servers.
 *   2. Generates targeted proposal markdown & ready-to-merge JSON config files.
 *   3. Updates state cache and registers referral tracking.
 */
export async function runMcpProspectingLoop(
  options?: McpProspectingOptions
): Promise<ProspectingResult> {
  const cycle = options?.cycle || 1;
  const limit = options?.limit || 10;
  const promotedBy = options?.promotedBy || "aus-agent-alpha";
  const outDir = options?.outDir || path.resolve(process.cwd(), "outreach-proposals");
  const stateFilePath = options?.stateFile;

  console.log(`\n[outreach-loop] === Cycle ${cycle} === ${new Date().toISOString()}`);
  console.log(`[outreach-loop] Scanning for 5-10 MCP & agent-tool repositories (Limit: ${limit})...`);

  const state = loadProspectingState(stateFilePath);
  const repos = await searchForMcpRepos(limit, false, state);
  console.log(`[outreach-loop] Detected ${repos.length} qualifying repositories.`);

  const generatedFiles: ProspectingResult["generatedFiles"] = [];
  const newProspects: string[] = [];

  for (const repo of repos) {
    try {
      const isNew = !state.prospects[repo.full_name];
      if (isNew) {
        newProspects.push(repo.full_name);
      }

      const proposal = await createTargetedProposal(repo, {
        promotedBy,
        outDir,
      });

      state.prospects[repo.full_name] = {
        prospectedAt: new Date().toISOString(),
        proposalMdPath: proposal.mdPath,
        configJsonPath: proposal.jsonPath,
        referralCode: proposal.referralCode,
        stargazersCount: repo.stargazers_count,
      };

      generatedFiles.push({
        repo: repo.full_name,
        mdPath: proposal.mdPath,
        jsonPath: proposal.jsonPath,
        referralCode: proposal.referralCode,
      });

      console.log(
        `[outreach-loop] [PROPOSAL CREATED] ${repo.full_name} -> ${path.basename(proposal.mdPath)} & ${path.basename(proposal.jsonPath)} (Ref: ${proposal.referralCode})`
      );

      // If live token is present and dryRun is false, dispatch issue
      if (process.env.GITHUB_TOKEN && !options?.dryRun) {
        try {
          await sendOutreachIssue({
            owner: repo.owner.login,
            repo: repo.name,
            title: "AIPages Discovery: Boost your tool with AUS micro-payments on Base",
            body: proposal.body,
            labels: ["mcp-integration", "agent-discovery"],
          });
        } catch (issueErr: any) {
          console.warn(`[outreach-loop] Live issue dispatch failed for ${repo.full_name}: ${issueErr.message}`);
        }
      }
    } catch (err: any) {
      console.error(`[outreach-loop] Error processing repo ${repo.full_name}:`, err.message);
    }
  }

  state.lastRunAt = new Date().toISOString();
  state.cycleCount = (state.cycleCount || 0) + 1;
  saveProspectingState(state, stateFilePath);

  console.log(
    `[outreach-loop] Cycle ${cycle} finished: Generated ${generatedFiles.length} proposals (${newProspects.length} new prospects recorded).\n`
  );

  return {
    cycle,
    detectedCount: repos.length,
    proposalsGenerated: generatedFiles.length,
    newProspects,
    generatedFiles,
  };
}

// CLI Execution Entry Point
const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  const args = process.argv.slice(2);
  const mode = args[0] || "once";

  // Parse optional --limit argument
  let limit = 10;
  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      const val = parseInt(arg.split("=")[1], 10);
      if (!isNaN(val)) limit = val;
    }
  }

  if (mode === "watch") {
    console.log(
      `[outreach-loop] Starting 6-hour autonomous prospecting daemon (Interval: ${
        PROSPECTING_INTERVAL_MS / 3600000
      } hours)`
    );
    let cycle = 0;
    runMcpProspectingLoop({ cycle: ++cycle, limit }).catch((err) =>
      console.error("[outreach-loop] Cycle error:", err)
    );

    setInterval(() => {
      runMcpProspectingLoop({ cycle: ++cycle, limit }).catch((err) =>
        console.error("[outreach-loop] Cycle error:", err)
      );
    }, PROSPECTING_INTERVAL_MS);
  } else {
    runMcpProspectingLoop({ cycle: 1, limit })
      .then((res) => {
        console.log(`[outreach-loop] Manual prospecting cycle completed successfully.`);
        console.log(`  Repositories detected: ${res.detectedCount}`);
        console.log(`  Proposals generated:   ${res.proposalsGenerated}`);
        process.exit(0);
      })
      .catch((err) => {
        console.error("[outreach-loop] Manual prospecting failed:", err);
        process.exit(1);
      });
  }
}
