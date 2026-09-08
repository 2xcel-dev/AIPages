/**
 * Ingest tool listings into the AIPages tools collection via the project's
 * shared store and embed utility.
 *
 * Flow per listing:
 *   1. Listing-fee gate (placeholder for real x402 facilitator verification;
 *      in production this calls the facilitator to confirm $25 USDC was settled).
 *   2. Embed description via Gemini (RETRIEVAL_DOCUMENT taskType, 768-dim,
 *      or dev pseudo-embedding when GEMINI_API_KEY is absent).
 *   3. Upsert into the shared ToolStore by namespace.
 *
 * Uses the same createStore() / embed() the server on port 3001 uses, so
 * ingestion and live search share one store.
 *
 * Run:  npm run ingest-listings
 *
 * Requires: MONGODB_URI (Atlas) for persistence, or runs in dev in-memory mode
 *           if absent (tools vanish when the process exits).
 */
import "dotenv/config";
import { createStore } from "../src/db.js";
import { embed } from "../src/embedding.js";
import type { Tool } from "../src/types.js";

interface ToolSubmission {
  name: string;
  description: string;
  pricingModel: "free" | "freemium" | "paid";
  costPerCall: number;
  developerAddress: string;
}

const TOOLS_TO_SUBMIT: ToolSubmission[] = [
  {
    name: "WebScout Pro",
    description:
      "High-speed automated web scraper with built-in anti-bot bypass and structured JSON extraction for AI agents.",
    pricingModel: "paid",
    costPerCall: 0.25,
    developerAddress: "0x1234...abcd",
  },
  {
    name: "VectorCache",
    description:
      "Lightning-fast local vector caching utility designed to minimize LLM embedding API calls.",
    pricingModel: "free",
    costPerCall: 0.0,
    developerAddress: "0x5678...efgh",
  },
];

function submissionToTool(sub: ToolSubmission, embedding: number[]): Tool {
  const namespace = `listing.${sub.name.toLowerCase().replace(/[^a-z0-9.-]/g, "_")}`;
  return {
    namespace,
    name: sub.name,
    description: sub.description,
    schema: {
      type: "object",
      properties: {
        pricingModel: { type: "string", enum: ["free", "freemium", "paid"] },
        costPerCall: { type: "number" },
        developerAddress: { type: "string" },
      },
      required: ["pricingModel", "costPerCall"],
    },
    connectionType: "http",
    endpointUrl: `https://aipages.example.com/tools/${sub.name.toLowerCase().replace(/\s+/g, "-")}`,
    embedding,
    healthStatus: "active",
    updatedAt: new Date(),
    pricing: {
      model: sub.pricingModel,
      costPerCall: sub.costPerCall,
    },
    developer: {
      address: sub.developerAddress,
      listingFeePaid: true,
      listingFeeAmount: 25.0,
    },
    status: "active",
  };
}

async function processSubmissions() {
  const store = await createStore();

  console.log(
    "Processing listings ($25 USDC verification gate) and generating Gemini vectors " +
      "via shared store + embed utility..."
  );

  let ingested = 0;
  for (const tool of TOOLS_TO_SUBMIT) {
    // ---- Listing-fee verification gate ------------------------------------------
    // In production this checks the x402 facilitator for a settled $25 USDC tx.
    // Placeholder for now: gate is open (listingFeePaid = true).
    const listingFeePaid = true;
    if (!listingFeePaid) {
      console.log(`⏭  Listing fee not verified for ${tool.name}. Skipping.`);
      continue;
    }

    const vector = await embed(tool.description, "RETRIEVAL_DOCUMENT");
    if (!vector || vector.length === 0) {
      console.error(`✗ Failed to generate embedding for ${tool.name}.`);
      continue;
    }

    await store.upsert(submissionToTool(tool, vector));
    console.log(
      `✓ Ingested: ${tool.name}  (Tier: ${tool.pricingModel}, ` +
        `Cost/Call: $${tool.costPerCall}, Vector dim: ${vector.length})`
    );
    ingested++;
  }

  const total = await store.count();
  console.log(
    `\nDone. Ingested ${ingested} listing(s). Total tools in store: ${total}.`
  );

  // In-memory dev store has no close; MongoToolStore.close() is a no-op safety net.
  await store.close().catch(() => {});
}

processSubmissions().catch((err) => {
  console.error("Ingestion pipeline failed:", err);
  process.exit(1);
});
