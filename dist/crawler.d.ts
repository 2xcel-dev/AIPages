/**
 * Automated Discovery & Growth Engine: background cron crawler.
 *
 * Authoritative ingestion: a tool is ingested ONLY when it ships a genuine,
 * parseable manifest: an `mcp.json` (MCP manifest) or `openapi.json` /
 * `swagger.json` (OpenAPI/Swagger) document. Schemas are parsed verbatim from
 * those manifests. Nothing is ever inferred by an LLM or guessed from a name
 * or description; repos whose manifest is missing, unparseable, or schema-less
 * are rejected outright.
 *
 * Pipeline per cycle:
 *   1. Discover candidate GitHub repos and npm packages (code and registry search).
 *   2. Fetch + parse the manifest for each repo (see manifest.ts).
 *   3. Reject repos with no genuine schema-bearing tools.
 *   4. For each extracted tool: health-check endpoint, embed description, upsert.
 *
 * Run modes:
 *   npm run crawl         : one-shot cycle
 *   npm run crawl:watch   : continuous loop with CRAWL_INTERVAL_MS delay
 *   npm run crawl:cron    : bi-daily cron schedule (0 2,14 * * *)
 *
 * Environment (all optional):
 *   GITHUB_TOKEN          : GitHub PAT (unauthenticated code search = 60 req/hr)
 *   CRAWL_INTERVAL_MS     : sleep between cycles (default 5 min)
 *   CRAWL_MAX_REPOS       : max candidate repos per cycle (default 20)
 *   CRAWL_TIMEOUT_MS      : per-fetch / per-health-check timeout (default 8 s)
 */
import { type ScheduledTask } from "node-cron";
import { type ToolStore } from "./db.js";
import type { ToolSchema } from "./types.js";
import { type Candidate, type CandidateSource, type SourceYieldMetrics } from "./discovery/types.js";
/**
 * Minimum viability validation for repository descriptions before invoking Gemini fallback.
 */
export declare function isViableDescription(description?: string | null): boolean;
/**
 * Strict schema validation for synthesized or parsed tool schemas.
 * Ensures the schema is a non-empty object schema with at least one typed property.
 */
export declare function isViableToolSchema(schema: unknown): schema is ToolSchema;
export declare const BI_DAILY_CRON_SCHEDULE = "0 2,14 * * *";
export type RejectionReasonCategory = "missing_manifest" | "invalid_schema" | "missing_required_metadata" | "fetch_failure";
export interface CandidateRejection {
    repo: string;
    source?: CandidateSource;
    reasonCategory: RejectionReasonCategory;
    details: string;
    timestamp: string;
}
export type RejectionBreakdown = Record<RejectionReasonCategory, number>;
export declare function createInitialRejectionBreakdown(): RejectionBreakdown;
export interface CrawlResult {
    discovered: number;
    fetched: number;
    rejected: number;
    extracted: number;
    healthChecked: number;
    active: number;
    ingested: number;
    errors: number;
    rejectionsByCategory: RejectionBreakdown;
    rejections: CandidateRejection[];
    bySource?: Record<CandidateSource, SourceYieldMetrics>;
}
export declare function recordRejection(result: CrawlResult, repo: string, category: RejectionReasonCategory, details: string, source?: CandidateSource): void;
export declare function diagnoseManifestRejection(manifest: {
    kind: string;
    url: string;
    raw: string;
} | null): {
    category: RejectionReasonCategory;
    details: string;
};
export declare const CRAWLER_LOCK_KEY = "crawler:execution";
export declare const CRAWLER_LOCK_TTL_MS: number;
export declare const RUNNER_INSTANCE_ID: string;
/** Discover candidate repos and tool endpoints (deduped by repo or primary URL). */
export declare function discoverCandidates(max: number): Promise<Candidate[]>;
export declare function crawlOnce(existingStore?: ToolStore): Promise<CrawlResult>;
export declare function crawlLoop(): Promise<void>;
/**
 * Start bi-daily cron runner via node-cron (schedule: 0 2,14 * * *).
 */
export declare function startCrawlerCron(cronExpression?: string): ScheduledTask;
//# sourceMappingURL=crawler.d.ts.map