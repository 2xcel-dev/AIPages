import { config } from "../src/config.js";

/**
 * Search GitHub for actively-maintained MCP server repositories.
 * Uses code search for manifest files + topic filtering.
 */

interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string };
  description: string;
  stargazers_count: number;
  updated_at: string;
}

export async function searchForMcpRepos(max: number = 10): Promise<GitHubRepo[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // Search for repositories with mcp.json manifests, sorted by recent activity
  const url = `https://api.github.com/search/repositories?q=mcp.json+in:file+language:typescript&sort=updated&order=desc&per_page=${max}`;
  
  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    throw new Error(`GitHub search failed: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json() as { items: GitHubRepo[] };
  return data.items.map((r) => ({
    name: r.name,
    full_name: r.full_name,
    html_url: r.html_url,
    owner: r.owner,
    description: r.description || "",
    stargazers_count: r.stargazers_count,
    updated_at: r.updated_at,
  }));
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
 */
export async function sendOutreachIssue(payload: IssuePayload): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN required for outreach");
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

  console.log(`[outreach] Issue created on ${payload.owner}/${payload.repo}`);
}
