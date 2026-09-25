/**
 * Invocation gateway — POST /api/invoke/:namespace.
 *
 * This is the single monetization surface for AIPages, and the hardened
 * outbound boundary. Request flow, in order:
 *
 *   1. Verification gate — caller identity + request signature (X-Agent-ID,
 *      X-Timestamp, X-Signature) over the canonical request string; request
 *      body size is capped here.
 *   2. Rate limit — sliding window per agent ID.
 *   3. Tool lookup + status check.
 *   4. Schema validation — the JSON payload is validated against the tool's
 *      registered schema (Ajv) before anything leaves the proxy.
 *   5. Payment gate — flat $0.25 USDC platform take-rate for premium tools
 *      (pricing.model === "paid" | "freemium").
 *   6. Egress guard — SSRF protection (no private/reserved IPs), host
 *      allowlist, and strict response-size cap — then proxy.
 *   7. Take-rate collected ONLY on successful (2xx) delivery; failed
 *      invocations are never charged.
 *   8. Every invocation is metered to the `invocations` collection.
 *
 * Dev mode: no AGENT_KEYS → signature passthrough; no wallet → payment
 * passthrough. Rate limiting, schema validation, and egress guard always run.
 */
import { Hono } from "hono";
import type { ToolStore } from "./db.js";
import { MongoClient } from "mongodb";
interface InvokeVariables {
    "invoke.agentId": string;
    "invoke.bodyBytes": Uint8Array;
    "invoke.bodyJson": unknown;
    "invoke.contentType": string;
    "invoke.promotedBy": string | null;
}
declare const ingress: Hono<{
    Variables: InvokeVariables;
}, import("hono/types").BlankSchema, "/">;
export declare function setStore(s: ToolStore, client?: MongoClient): void;
export default ingress;
//# sourceMappingURL=invocation.d.ts.map