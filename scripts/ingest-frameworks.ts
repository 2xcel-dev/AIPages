/**
 * Auto-ingest agent frameworks via GitHub repo scraping + Gemini schema generation.
 *
 * For repos that have good documentation (README, package.json, etc.) but no
 * manifest file, we use Gemini to infer the schema from the description.
 *
 * Run: npm run ingest-frameworks
 */
import { createStore } from "../src/db.js";
import { embed } from "../src/embedding.js";
import { searchGitHubRepos } from "../src/scraper.js";
import { generateToolSchema } from "../src/schema-generator.js";
import type { Tool } from "../src/types.js";

const FRAMEWORK_QUERY = "topic:mcp-server topic:mcp language:python OR topic:ai-agent-tools OR filename:README.md:agent";

interface FrameworkCandidate {
  fullName: string;
  description: string;
  stars: number;
  language: string;
}

async function discoverFrameworks(max = 30): Promise<FrameworkCandidate[]> {
  const repos = await searchGitHubRepos(FRAMEWORK_QUERY, max);
  return repos.map((r) => ({
    fullName: r.full_name,
    description: r.description ?? r.full_name,
    stars: 0, // GitHub search doesn't return stars by default
    language: "python",
  }));
}

function toNamespace(fullName: string): string {
  const part = fullName.replace(/^github\./, "").toLowerCase().replace(/[^a-z0-9.-]/g, "_");
  return `scraped.${part}`;
}

async function main() {
  console.log("Discovering AI agent frameworks via GitHub search...");
  const candidates = await discoverFrameworks(20);
  console.log(`Found ${candidates.length} candidates`);

  const store = await createStore();
  let ingested = 0;

  for (const c of candidates) {
    const namespace = toNamespace(c.fullName);
    const embedding = await embed(`${c.fullName} ${c.description}`, "RETRIEVAL_DOCUMENT");

    // Try Gemini schema generation
    const nameMatch = c.fullName.split("/")[1] ?? "tool";
    const gen = await generateToolSchema(nameMatch, c.description);

    const tool: Tool = {
      namespace,
      name: nameMatch.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: c.description,
      schema: gen.schema,
      connectionType: "http",
      endpointUrl: `https://github.com/${c.fullName}`,
      embedding,
      healthStatus: "unknown",
      updatedAt: new Date(),
      schemaSource: "github-search-gemini-fallback",
    };

    await store.upsert(tool);
    console.log(`  ✓ ${namespace}`);
    ingested++;
  }

  const total = await store.count();
  console.log(`\nIngested ${ingested} tools. Total in store: ${total}`);
  await store.close();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});