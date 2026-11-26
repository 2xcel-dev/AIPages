/**
 * PostHog analytics client for AIPages event tracking.
 *
 * Optional — when POSTHOG_API_KEY is not set, all calls are no-ops.
 * Tracks tool invocations, submissions, searches, and x402 payments.
 */
import { PostHog } from "posthog-node";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const UNMET_SEARCHES_PATH = path.resolve(ROOT_DIR, ".data/unmet-searches.json");

export interface UnmetSearchRecord {
  query: string;
  count: number;
  lastSearchedAt: string;
  agentIds: string[];
}

export function recordUnmetSearch(query: string, agentId?: string): void {
  try {
    const dir = path.dirname(UNMET_SEARCHES_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let records: Record<string, UnmetSearchRecord> = {};
    if (fs.existsSync(UNMET_SEARCHES_PATH)) {
      try {
        records = JSON.parse(fs.readFileSync(UNMET_SEARCHES_PATH, "utf-8"));
      } catch {}
    }

    const normQuery = query.toLowerCase().trim();
    if (!records[normQuery]) {
      records[normQuery] = {
        query: normQuery,
        count: 0,
        lastSearchedAt: new Date().toISOString(),
        agentIds: [],
      };
    }

    records[normQuery].count += 1;
    records[normQuery].lastSearchedAt = new Date().toISOString();
    if (agentId && !records[normQuery].agentIds.includes(agentId)) {
      records[normQuery].agentIds.push(agentId);
      if (records[normQuery].agentIds.length > 10) {
        records[normQuery].agentIds.shift();
      }
    }

    fs.writeFileSync(UNMET_SEARCHES_PATH, JSON.stringify(records, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[analytics] Could not record unmet search:", err?.message);
  }
}

export function getUnmetSearches(): UnmetSearchRecord[] {
  try {
    if (!fs.existsSync(UNMET_SEARCHES_PATH)) return [];
    const records: Record<string, UnmetSearchRecord> = JSON.parse(
      fs.readFileSync(UNMET_SEARCHES_PATH, "utf-8")
    );
    return Object.values(records).sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!config.posthogApiKey) return null;
  if (!client) {
    client = new PostHog(config.posthogApiKey!, {
      host: config.posthogHost,
    });
  }
  return client;
}

/** Track an event with optional properties and distinct ID. */
export function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  const c = getClient();
  if (!c) return;
  c.capture({ distinctId, event, properties });
}

/** Track a tool invocation (free or paid). */
export function trackInvocation(params: {
  agentId: string;
  namespace: string;
  statusCode: number;
  success: boolean;
  latencyMs?: number;
  feeAmountUsdc?: number;
  feeStatus?: string;
  promotedBy?: string | null;
}): void {
  trackEvent(params.agentId, "tool_invoked", {
    namespace: params.namespace,
    success: params.success,
    status_code: params.statusCode,
    latency_ms: params.latencyMs,
    fee_amount_usdc: params.feeAmountUsdc,
    fee_status: params.feeStatus,
    promoted_by: params.promotedBy,
  });
}

/** Track a tool submission/listing. */
export function trackSubmission(params: {
  namespace: string;
  pricingModel: string;
  connectionType: string;
}): void {
  trackEvent("anonymous", "tool_submitted", {
    namespace: params.namespace,
    pricing_model: params.pricingModel,
    connection_type: params.connectionType,
  });
}

/** Track a search query. */
export function trackSearch(params: {
  query: string;
  resultCount: number;
  agentId?: string;
}): void {
  trackEvent(params.agentId ?? "anonymous", "tool_searched", {
    query: params.query,
    result_count: params.resultCount,
  });

  if (params.resultCount === 0) {
    recordUnmetSearch(params.query, params.agentId);
  }
}

/**
 * Identify an agent as a PostHog user with a display name and properties.
 * Enables person-level tracking and labeled filtering in dashboards.
 */
export function identifyAgent(
  distinctId: string,
  properties?: Record<string, unknown>,
): void {
  const c = getClient();
  if (!c) return;
  c.identify({
    distinctId,
    ...(properties && { $set: properties }),
  });
}

/** Shutdown helper — flush any pending events. */
export async function shutdownAnalytics(): Promise<void> {
  if (client) {
    await client.shutdown();
  }
}
