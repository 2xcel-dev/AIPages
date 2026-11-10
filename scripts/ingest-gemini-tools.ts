/**
 * Autonomous Tool Ingestion Pipeline for Scraped & Discovered Tools
 *
 * Ingests external crawler and Google Gemini tool output (e.g. data/geminiScrapedTools.json),
 * normalizes records into compliant Tool specifications, validates against first-party/catalog
 * guardrails, generates semantic embeddings, and upserts into the active ToolStore.
 *
 * Usage:
 *   npx tsx scripts/ingest-gemini-tools.ts [path/to/tools.json]
 *   npm run tools:ingest
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createStore } from "../src/db.js";
import { embed } from "../src/embedding.js";
import type { Tool, ConnectionType } from "../src/types.js";
import { validateToolRecord } from "../src/validation/toolValidator.js";
import {
  AUS_DEVELOPER_ADDRESS,
  AUS_BASE_URL,
  AUS_STANDARD_RATE_LIMIT,
  AUS_AUTH_SPEC,
  AUS_PROTOCOL_DETAILS,
} from "../src/data/ausTools.js";

export interface RawScrapedTool {
  name: string;
  namespace: string;
  category?: string;
  description: string;
  pricingModel?: "free" | "freemium" | "paid";
  costPerCall?: number;
  capabilities?: string[];
  connectionType?: string;
  endpointUrl?: string;
  schema?: Record<string, unknown>;
}

export function normalizeScrapedTool(raw: RawScrapedTool): Omit<Tool, "embedding" | "updatedAt"> {
  const isFirstParty = raw.namespace.startsWith("net.2xcel.aus");
  const slug = raw.namespace.replace("net.2xcel.aus.", "").replace(/-/g, "_");
  const connectionType = (raw.connectionType || "http").toLowerCase() as ConnectionType;

  const endpointUrl =
    raw.endpointUrl ||
    (isFirstParty
      ? `${AUS_BASE_URL}/tool/${raw.namespace.replace("net.2xcel.aus.", "")}`
      : undefined);

  return {
    namespace: raw.namespace,
    name: slug,
    description: raw.description,
    schema: raw.schema || {
      type: "object",
      properties: {
        query: { type: "string", description: "Operational query or input payload" },
        parameters: { type: "object", description: "Dynamic execution parameters" },
      },
    },
    connectionType,
    endpointUrl,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty,
    capabilities: raw.capabilities || [],
    pricing: {
      model: raw.pricingModel || "paid",
      costPerCall: typeof raw.costPerCall === "number" ? raw.costPerCall : 0.001,
    },
    authentication: isFirstParty ? AUS_AUTH_SPEC : undefined,
    rateLimit: isFirstParty ? AUS_STANDARD_RATE_LIMIT : undefined,
    protocolDetails: isFirstParty ? AUS_PROTOCOL_DETAILS : undefined,
    developer: isFirstParty
      ? {
          address: AUS_DEVELOPER_ADDRESS,
          listingFeePaid: true,
          listingFeeAmount: 0,
          isFirstParty: true,
          name: "2XceL AUS Fleet",
        }
      : undefined,
  };
}

export async function ingestToolsFromFile(filePath: string): Promise<{
  total: number;
  ingested: number;
  errors: number;
}> {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Tools file not found at: ${resolvedPath}`);
  }

  const rawData: RawScrapedTool[] = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  console.log(`\n📥 Ingesting ${rawData.length} tools from: ${path.basename(resolvedPath)}...`);

  const store = await createStore();
  let ingested = 0;
  let errors = 0;

  for (const raw of rawData) {
    try {
      const toolRecord = normalizeScrapedTool(raw);
      const val = validateToolRecord(toolRecord, { isFirstParty: Boolean(toolRecord.isFirstParty) });

      if (!val.valid) {
        console.error(`  ✗ Validation failed for [${raw.namespace}]:`, val.errors.join("; "));
        errors++;
        continue;
      }

      const text = `${toolRecord.namespace} ${toolRecord.name} ${toolRecord.description} ${(toolRecord.capabilities ?? []).join(" ")}`;
      const embedding = await embed(text);

      const completeTool: Tool = {
        ...toolRecord,
        embedding,
        updatedAt: new Date(),
      };

      await store.upsert(completeTool);
      ingested++;
      console.log(
        `  ✓ ${toolRecord.namespace} (${toolRecord.pricing?.model || "free"}, $${toolRecord.pricing?.costPerCall ?? 0}/call) [${toolRecord.capabilities?.length || 0} capabilities]`,
      );
    } catch (err: any) {
      console.error(`  ✗ Failed to ingest [${raw.namespace}]:`, err.message);
      errors++;
    }
  }

  const count = await store.count();
  console.log(`\n🎉 Ingestion complete: ${ingested} ingested, ${errors} errors. Total tools in store: ${count}.\n`);
  await store.close();

  return { total: rawData.length, ingested, errors };
}

async function main() {
  const targetFile = process.argv[2] || "data/geminiScrapedTools.json";
  await ingestToolsFromFile(targetFile);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch((err) => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  });
}
