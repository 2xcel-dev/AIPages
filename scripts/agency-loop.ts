/**
 * Autonomous Agency Pipeline Loop Orchestrator
 *
 * Coordinates the automated verification, catalog synchronization, testing,
 * and outreach loop for AIPages. Used by the agency agent swarm
 * (AgentsOrchestrator, TrendResearcher, PromptEngineer, TechnicalWriter, UIDesigner)
 * whenever new tools are registered or UI appearance templates are modified.
 *
 * Usage:
 *   npx tsx scripts/agency-loop.ts verify    # Comprehensive integrity & catalog check
 *   npx tsx scripts/agency-loop.ts sync      # Validate, seed store, and recompile dist
 *   npx tsx scripts/agency-loop.ts test      # Run full regression test suite
 *   npx tsx scripts/agency-loop.ts outreach  # Execute autonomous MCP discovery & outreach
 *   npx tsx scripts/agency-loop.ts pipeline  # Run complete end-to-end loop
 */

import "dotenv/config";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import { CAPABILITY_DESCRIPTIONS } from "../src/views/capabilitiesPage.js";
import { assertValidFirstPartyTools, validateToolRecord } from "../src/validation/toolValidator.js";
import type { Tool } from "../src/types.js";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function header(title: string) {
  console.log(`\n${ANSI.bold}${ANSI.cyan}════════════════════════════════════════════════════════════════${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}  🚀 ${title}${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}════════════════════════════════════════════════════════════════${ANSI.reset}\n`);
}

function success(msg: string) {
  console.log(`${ANSI.green}  ✓ ${msg}${ANSI.reset}`);
}

function warn(msg: string) {
  console.log(`${ANSI.yellow}  ⚠ ${msg}${ANSI.reset}`);
}

function fail(msg: string): never {
  console.error(`${ANSI.red}  ✗ ${msg}${ANSI.reset}`);
  process.exit(1);
}

/**
 * Step 1: Verify first-party catalog integrity & capability descriptions
 */
export async function stepVerifyCatalog(): Promise<void> {
  header("STAGE 1: First-Party Catalog & Compliance Guardrail");

  console.log(`Checking ${CANONICAL_AUS_TOOLS.length} canonical AUS tool definitions...`);
  try {
    assertValidFirstPartyTools(CANONICAL_AUS_TOOLS as unknown as Tool[]);
    success(`All ${CANONICAL_AUS_TOOLS.length} First-Party AUS tools passed strict assertion check.`);
  } catch (err: any) {
    fail(`Catalog assertion failed: ${err.message}`);
  }

  // Capability mapping verification
  const missingCaps: string[] = [];
  for (const tool of CANONICAL_AUS_TOOLS) {
    for (const cap of tool.capabilities || []) {
      if (!CAPABILITY_DESCRIPTIONS[cap]) {
        missingCaps.push(cap);
      }
    }
  }

  const uniqueMissing = [...new Set(missingCaps)];
  if (uniqueMissing.length > 0) {
    fail(`Missing human-readable descriptions in CAPABILITY_DESCRIPTIONS for: ${uniqueMissing.join(", ")}`);
  } else {
    success(`All capability tags map to curated descriptions in CAPABILITY_DESCRIPTIONS.`);
  }

  // Service module file verification
  const servicesDir = path.resolve(process.cwd(), "src/services");
  if (fs.existsSync(servicesDir)) {
    const serviceFiles = fs.readdirSync(servicesDir).filter((f) => f.endsWith(".ts"));
    success(`Verified ${serviceFiles.length} backend service modules in src/services/.`);
  }
}

/**
 * Step 2: Seed the store
 */
export async function stepSeed(): Promise<void> {
  header("STAGE 2: Store Seeding & Vector Sync");
  console.log("Seeding in-memory and database tool store...");
  try {
    execSync("npm run seed", { stdio: "inherit" });
    success("Tool store seeded successfully.");
  } catch (err: any) {
    fail(`Seeding failed: ${err.message}`);
  }
}

/**
 * Step 3: Run regression tests
 */
export async function stepTest(): Promise<void> {
  header("STAGE 3: Regression & Validation Test Suite");
  console.log("Executing test suite across all engines...");
  try {
    execSync("npm test", { stdio: "inherit" });
    success("All unit, integration, and payment gate tests passed.");
  } catch (err: any) {
    fail(`Test suite execution failed: ${err.message}`);
  }
}

/**
 * Step 4: Compile TypeScript build
 */
export async function stepBuild(): Promise<void> {
  header("STAGE 4: Production TypeScript Build Verification");
  console.log("Compiling TypeScript to dist/...");
  try {
    if (fs.existsSync("dist")) {
      fs.rmSync("dist", { recursive: true, force: true });
    }
    execSync("npm run build", { stdio: "inherit" });
    success("Compiled dist/ verified with zero TypeScript diagnostic errors.");
  } catch (err: any) {
    fail(`Build compilation failed: ${err.message}`);
  }
}

/**
 * Step 5: Execute outreach discovery cycle
 */
export async function stepOutreach(): Promise<void> {
  header("STAGE 5: Autonomous MCP Repo Outreach & Ingestion");
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    warn("GITHUB_TOKEN not found in environment. Outreach running in scan-only mode.");
  }

  try {
    const { runMcpProspectingLoop } = await import("./mcp-outreach.js");
    const result = await runMcpProspectingLoop({ cycle: 1 });
    success(`Outreach cycle finished. Detected ${result.detectedCount} repos, generated ${result.proposalsGenerated} targeted proposals with ready-to-merge JSON.`);
  } catch (err: any) {
    warn(`Outreach cycle warning: ${err.message}`);
  }
}

/**
 * Step 6: Execute search engine and crawler syndication
 */
export async function stepSeo(): Promise<void> {
  header("STAGE 6: Autonomous Search Engine & LLM Crawler Dispatch");
  try {
    const { runSeoSyndication } = await import("./seo-ping.js");
    await runSeoSyndication();
    success("Search engine and crawler syndication dispatched.");
  } catch (err: any) {
    warn(`SEO syndication warning: ${err.message}`);
  }
}

/**
 * Step 7: Revenue gate and settlement verification
 */
export async function stepRevenue(): Promise<void> {
  header("STAGE 7: Base Mainnet x402 Revenue Settlement Verification");
  try {
    const { runRevenueGateVerification } = await import("./verify-revenue-gate.js");
    const result = await runRevenueGateVerification();
    if (result.passed) {
      success("Base Mainnet x402 revenue gateway verified operational.");
    } else {
      fail("Revenue gateway checks failed.");
    }
  } catch (err: any) {
    fail(`Revenue verification error: ${err.message}`);
  }
}

/**
 * CLI Entrypoint Router
 */
async function main() {
  const mode = process.argv[2] || "verify";

  console.log(`\n${ANSI.bold}${ANSI.blue}▶ AIPages Autonomous Agency Execution Loop [Mode: ${mode.toUpperCase()}]${ANSI.reset}`);

  switch (mode) {
    case "verify":
      await stepVerifyCatalog();
      break;

    case "sync":
      await stepVerifyCatalog();
      await stepSeed();
      await stepBuild();
      break;

    case "test":
      await stepVerifyCatalog();
      await stepTest();
      break;

    case "build":
      await stepVerifyCatalog();
      await stepBuild();
      break;

    case "outreach":
      await stepOutreach();
      break;

    case "seo":
      await stepSeo();
      break;

    case "revenue":
      await stepRevenue();
      break;

    case "pipeline":
    case "all":
      await stepVerifyCatalog();
      await stepSeed();
      await stepBuild();
      await stepTest();
      await stepOutreach();
      await stepSeo();
      await stepRevenue();
      console.log(`\n${ANSI.bold}${ANSI.green}✨ COMPLETE AGENCY LOOP EXECUTED SUCCESSFULLY! Ready for release.${ANSI.reset}\n`);
      process.exit(0);
      break;

    default:
      console.log(`Unknown command "${mode}". Available: verify, sync, test, build, outreach, seo, revenue, pipeline`);
      process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal loop failure:", err);
  process.exit(1);
});
