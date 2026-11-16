/**
 * Autonomous Reddit Publisher Script
 *
 * Authenticates via official Reddit Script App OAuth and submits markdown posts
 * to target subreddits (e.g., r/ClaudeAI, r/Cursor, r/LangChain, or r/test).
 *
 * Requires in .env:
 *   REDDIT_CLIENT_ID=...
 *   REDDIT_CLIENT_SECRET=...
 *   REDDIT_USERNAME=...
 *   REDDIT_PASSWORD=...
 *   REDDIT_USER_AGENT=...
 *
 * Usage:
 *   npx tsx scripts/publish-reddit.ts --dry-run
 *   npx tsx scripts/publish-reddit.ts --subreddit test --file distribution/weekly-updates/2026-W47/reddit-post.md
 *   npx tsx scripts/publish-reddit.ts --subreddit ClaudeAI --file distribution/weekly-updates/2026-W47/reddit-post.md
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

interface RedditAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
}

interface RedditSubmitResponse {
  json: {
    errors: string[][];
    data?: {
      url: string;
      drafts_count: number;
      id: string;
      name: string;
    };
  };
}

async function getRedditAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;
  const userAgent = process.env.REDDIT_USER_AGENT || `aipages-publisher:v1.0.0 (by /u/${username})`;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error(
      "Missing Reddit credentials in .env. Please define REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, and REDDIT_PASSWORD.",
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const bodyParams = new URLSearchParams({
    grant_type: "password",
    username,
    password,
  });

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Reddit OAuth HTTP ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as RedditAuthResponse;
  if (data.error) {
    throw new Error(`Reddit OAuth Error: ${data.error}`);
  }

  return data.access_token;
}

function parseMarkdownPost(filePath: string): { title: string; body: string; subreddit: string } {
  const raw = fs.readFileSync(filePath, "utf8");

  let title = "AIPages — Unified MCP Vector Discovery Gateway";
  let subreddit = "ClaudeAI";
  let body = raw;

  // Extract frontmatter metadata if present
  if (raw.startsWith("---")) {
    const parts = raw.split("---");
    if (parts.length >= 3) {
      const frontmatter = parts[1];
      body = parts.slice(2).join("---").trim();

      const titleMatch = frontmatter.match(/Title:\s*(.+)/i);
      if (titleMatch) title = titleMatch[1].trim();

      const subMatch = frontmatter.match(/Platform:\s*Reddit\s*\(([^)]+)\)/i);
      if (subMatch) {
        const subs = subMatch[1].split(",").map((s) => s.trim().replace(/^r\//, ""));
        if (subs.length > 0) subreddit = subs[0];
      }
    }
  }

  return { title, body, subreddit };
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  // Determine post file
  let filePath = "";
  const fileArgIdx = args.indexOf("--file");
  if (fileArgIdx !== -1 && args[fileArgIdx + 1]) {
    filePath = path.resolve(process.cwd(), args[fileArgIdx + 1]);
  } else {
    // Default to latest generated weekly post if available
    const weeklyDir = path.resolve(process.cwd(), "distribution/weekly-updates");
    if (fs.existsSync(weeklyDir)) {
      const weeks = fs.readdirSync(weeklyDir).filter((d) => d.startsWith("2026-W")).sort().reverse();
      if (weeks.length > 0) {
        filePath = path.join(weeklyDir, weeks[0], "reddit-post.md");
      }
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.error("[reddit-publisher] No post file found. Generate one with: npm run content:weekly");
    process.exit(1);
  }

  let { title, body, subreddit } = parseMarkdownPost(filePath);

  // Override subreddit if flag passed
  const subArgIdx = args.indexOf("--subreddit");
  if (subArgIdx !== -1 && args[subArgIdx + 1]) {
    subreddit = args[subArgIdx + 1].replace(/^r\//, "");
  }

  console.log(`\n=======================================================`);
  console.log(`🤖 Reddit Post Prepared for Dispatch`);
  console.log(`=======================================================`);
  console.log(`Target Subreddit: r/${subreddit}`);
  console.log(`Title:            ${title}`);
  console.log(`Body Length:      ${body.length} characters`);
  console.log(`Source File:      ${filePath}`);
  console.log(`=======================================================\n`);

  if (isDryRun) {
    console.log(`[DRY-RUN MODE] Post validated. Credentials check:`);
    const hasCreds =
      Boolean(process.env.REDDIT_CLIENT_ID) &&
      Boolean(process.env.REDDIT_CLIENT_SECRET) &&
      Boolean(process.env.REDDIT_USERNAME) &&
      Boolean(process.env.REDDIT_PASSWORD);

    if (hasCreds) {
      console.log(`✓ All 4 Reddit credentials present in .env!`);
    } else {
      console.log(`⚠ Reddit credentials missing in .env.`);
      console.log(`Please add REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD.`);
    }
    console.log(`\nDry run complete. No network requests dispatched.`);
    return;
  }

  console.log("[reddit-publisher] Authenticating with Reddit API...");
  const token = await getRedditAccessToken();
  console.log("[reddit-publisher] Authentication successful! Submitting post...");

  const userAgent = process.env.REDDIT_USER_AGENT || `aipages-publisher:v1.0.0 (by /u/${process.env.REDDIT_USERNAME})`;

  const submitParams = new URLSearchParams({
    api_type: "json",
    kind: "self",
    sr: subreddit,
    title,
    text: body,
  });

  const res = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: submitParams.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Reddit Submit HTTP ${res.status}: ${errText}`);
  }

  const result = (await res.json()) as RedditSubmitResponse;

  if (result.json.errors && result.json.errors.length > 0) {
    console.error("[reddit-publisher] Submission failed:", result.json.errors);
    process.exit(1);
  }

  const postUrl = result.json.data?.url;
  console.log(`\n🎉 Success! Post published to Reddit:`);
  console.log(`👉 ${postUrl}\n`);
}

main().catch((err) => {
  console.error("[reddit-publisher] Error:", err.message);
  process.exit(1);
});
