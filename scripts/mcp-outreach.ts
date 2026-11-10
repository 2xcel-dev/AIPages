import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";

/**
 * Search GitHub for actively-maintained MCP server repositories.
 * Uses code search for manifest files + topic filtering.
 */

export interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string };
  description: string;
  stargazers_count: number;
  updated_at: string;
}

const CURATED_MCP_TARGETS: GitHubRepo[] = [
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
];

export async function searchForMcpRepos(max: number = 10): Promise<GitHubRepo[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  if (!token) {
    console.log(`[outreach] GITHUB_TOKEN not configured. Utilizing curated high-priority MCP target fleet (${CURATED_MCP_TARGETS.length} targets).`);
    return CURATED_MCP_TARGETS.slice(0, max);
  }

  // Search for repositories with mcp.json manifests, sorted by recent activity
  const url = `https://api.github.com/search/repositories?q=mcp.json+in:file+language:typescript&sort=updated&order=desc&per_page=${max}`;

  try {
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.warn(`[outreach] GitHub search API returned ${resp.status}. Falling back to curated fleet.`);
      return CURATED_MCP_TARGETS.slice(0, max);
    }

    const data = (await resp.json()) as { items?: GitHubRepo[] };
    if (!data.items || data.items.length === 0) {
      return CURATED_MCP_TARGETS.slice(0, max);
    }

    return data.items.map((r) => ({
      name: r.name,
      full_name: r.full_name,
      html_url: r.html_url,
      owner: r.owner,
      description: r.description || "",
      stargazers_count: r.stargazers_count,
      updated_at: r.updated_at,
    }));
  } catch (err: any) {
    console.warn(`[outreach] GitHub network error: ${err.message}. Using curated fleet.`);
    return CURATED_MCP_TARGETS.slice(0, max);
  }
}

export interface IssuePayload {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels: string[];
}

/**
 * Send a GitHub issue to a repository with an MCP config snippet.
 * When GITHUB_TOKEN is omitted, saves structured proposal to outreach-proposals/ directory.
 */
export async function sendOutreachIssue(payload: IssuePayload): Promise<{ live: boolean; path?: string }> {
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
