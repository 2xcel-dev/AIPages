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
import { config } from "./config.js";
import { slidingWindow } from "./rate-limit.js";
import { verifyCallerIdentity } from "./verification.js";
import { validatePayload } from "./schema-validate.js";
import { sanitizePayload } from "./sanitizer.js";
import { quarantineStatus, recordRequest, recordError } from "./anomaly.js";
import { guardTargetUrl, pinnedRequest } from "./egress-guard.js";
import { trackInvocation, identifyAgent } from "./analytics.js";
// ── x402 payment verification ─────────────────────────────────────────
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
const ingress = new Hono();
// ── Store reference (set by index.ts after createStore()) ──────────────────
let store = null;
let mongoClient = null;
export function setStore(s, client) {
    store = s;
    mongoClient = client ?? null;
}
// ── Platform fee (the ONLY monetization surface) ───────────────────────────
/** Flat platform take-rate per premium invocation, in USDC. */
const PLATFORM_FEE_USDC = Number.parseFloat(config.x402PriceUsdc) || 0.25;
/** Dev bypass: no real wallet configured means we skip the payment gate. */
const DEV_WALLET = /^0x0+$/.test(config.x402WalletAddress);
/** A tool is "premium" when its pricing model is paid or freemium. */
function isPremium(tool) {
    const model = tool.pricing?.model;
    return model === "paid" || model === "freemium";
}
// ── x402 Resource Server (verifies payments via facilitator) ────────────────
// Initialized lazily on first use to avoid startup cost when no wallet is configured.
let x402Server = null;
let x402Initialized = false;
/**
 * Create and initialize an x402ResourceServer with the EVM exact-payment scheme
 * registered for the configured Base network. Uses the X402_FACILITATOR_URL to
 * verify and settle payments. Initializes (fetches supported kinds from the
 * facilitator) exactly once on first use.
 */
function createX402Server() {
    if (x402Server)
        return x402Server;
    const facilitator = new HTTPFacilitatorClient({
        url: config.x402FacilitatorUrl,
        timeoutMs: 15_000,
    });
    const server = new x402ResourceServer(facilitator);
    registerExactEvmScheme(server, { networks: [config.x402Network] });
    x402Server = server;
    return server;
}
/**
 * Lazily create + initialize the x402 server. The initialize() call fetches
 * /supported from the facilitator and is required before buildPaymentRequirements
 * or verifyPayment. Safe to call multiple times.
 */
async function ensureX402Server() {
    const server = createX402Server();
    if (!x402Initialized) {
        await server.initialize();
        x402Initialized = true;
    }
    return server;
}
async function logInvocation(tool, agentId, status, latencyMs, statusCode, feeUsdc, feeStatus, errorMsg, promotedBy) {
    const record = {
        toolNamespace: tool.namespace,
        toolName: tool.name,
        agentId,
        status,
        latencyMs,
        statusCode,
        errorMsg: errorMsg ?? null,
        feeUsdc,
        feeStatus,
        invokedAt: new Date(),
    };
    // Feed the anomaly detector: 402 / 4xx / 5xx outcomes count toward an
    // error-storm quarantine (a caller hammering paid tools or a broken crawler).
    const isErrorStatus = status === "failed" ||
        status === "payment_required" ||
        status === "invalid_payload" ||
        status === "egress_blocked";
    if (isErrorStatus && agentId && agentId !== "unknown") {
        recordError(agentId);
    }
    if (mongoClient) {
        try {
            const coll = mongoClient.db("aipages").collection("invocations");
            await coll.insertOne(record);
        }
        catch (err) {
            console.error("[invocation] Failed to log to Atlas:", err);
        }
    }
    else {
        const list = MEMORY_LOG ??= [];
        list.push(record);
        if (list.length > 10_000)
            list.shift();
    }
    // PostHog analytics (no-op if POSTHOG_API_KEY is not set)
    trackInvocation({
        agentId,
        namespace: tool.namespace,
        statusCode,
        success: status === "success",
        latencyMs,
        feeAmountUsdc: feeStatus === "collected" ? feeUsdc : 0,
        feeStatus,
        promotedBy,
    });
}
let MEMORY_LOG;
// ── Rate limit config ──────────────────────────────────────────────────────
const INVOCATION_RATE_MAX = Number(process.env.INVOCATION_RATE_MAX ?? "60"); // per agent / minute
const INVOCATION_RATE_WINDOW_MS = 60_000;
// ── context keys ───────────────────────────────────────────────────────────
const K_AGENT = "invoke.agentId";
const K_BODY = "invoke.bodyBytes";
const K_JSON = "invoke.bodyJson";
const K_CT = "invoke.contentType";
const K_PROMOTED_BY = "invoke.promotedBy";
// ── 1. Verification gate middleware ────────────────────────────────────────
ingress.use("/:namespace/*", async (c, next) => {
    const agentId = c.req.header("x-agent-id") ?? undefined;
    // Read raw body with a hard size cap (before trusting it in any signature).
    let rawBody;
    try {
        const buf = await c.req.arrayBuffer();
        if (buf.byteLength > config.maxRequestBytes) {
            return c.json({ error: `request body exceeds ${config.maxRequestBytes} byte limit` }, 413);
        }
        rawBody = new Uint8Array(buf);
    }
    catch {
        return c.json({ error: "failed to read request body" }, 400);
    }
    // Best-effort JSON parse (schema validation + proxy reuse the parsed form).
    const contentType = c.req.header("content-type") ?? "";
    let bodyJson = null;
    if (contentType.startsWith("application/json") && rawBody.byteLength > 0) {
        try {
            bodyJson = JSON.parse(new TextDecoder().decode(rawBody));
        }
        catch {
            bodyJson = null; // leave it; schema validation will surface the error
        }
    }
    const reqUrl = new URL(c.req.url, "http://localhost");
    const verdict = await verifyCallerIdentity({
        agentId,
        timestamp: c.req.header("x-timestamp") ?? undefined,
        signature: c.req.header("x-signature") ?? undefined,
        eip712Signature: c.req.header("x-eip712-signature") ?? undefined,
        method: c.req.method,
        pathAndQuery: reqUrl.pathname + reqUrl.search,
        bodyBytes: rawBody,
    });
    if (!verdict.ok) {
        await logInvocation({ namespace: "", name: "" }, agentId ?? "unknown", "unverified", 0, 401, 0, "none", verdict.error);
        return c.json({ error: verdict.error ?? "Unauthorized" }, 401);
    }
    c.set(K_AGENT, verdict.agentId);
    c.set(K_BODY, rawBody);
    c.set(K_JSON, bodyJson);
    c.set(K_CT, contentType);
    c.set(K_PROMOTED_BY, c.req.header("x-promoted-by") ?? null);
    // Identify agent in PostHog for labeled dashboards (no-op without API key)
    const agentName = c.req.header("x-agent-name");
    if (agentId) {
        identifyAgent(agentId, {
            name: agentName ?? agentId,
            distinct_id: agentId,
            ...(agentName && { agent_name: agentName }),
        });
    }
    await next();
});
// ── 2. Behavioral quarantine + rate-limit middleware ──────────────────────
ingress.use("/:namespace/*", async (c, next) => {
    if (!store)
        return c.json({ error: "Server not initialized" }, 503);
    const agentId = c.get(K_AGENT);
    // Quarantine check: a caller sidelined by the anomaly detector is rejected
    // outright (and logged) before any rate-limit or downstream work.
    const q = quarantineStatus(agentId);
    if (q.quarantined) {
        await logInvocation({ namespace: "", name: "" }, agentId, "rate_limited", 0, 429, 0, "none", `quarantined: ${q.reason}`);
        return c.json({
            error: "Temporarily quarantined — repeated abuse detected",
            reason: q.reason,
            retryAfterSec: q.remainingSec,
        }, 429);
    }
    // Burst tracking (feeds the anomaly detector).
    recordRequest(agentId);
    const rl = slidingWindow(`invoke:${agentId}`, INVOCATION_RATE_MAX, INVOCATION_RATE_WINDOW_MS);
    if (!rl.allowed) {
        await logInvocation({ namespace: "", name: "" }, agentId, "rate_limited", 0, 429, 0, "none");
        return c.json({
            error: "Rate limit exceeded",
            retryAfterSec: rl.retryAfterSec,
            limit: INVOCATION_RATE_MAX,
            windowSec: INVOCATION_RATE_WINDOW_MS / 1000,
        }, 429);
    }
    c.header("x-ratelimit-remaining", String(rl.remaining));
    c.header("x-ratelimit-reset", String(Math.ceil(rl.resetAt / 1000)));
    await next();
});
// ── 3–8. Handler ───────────────────────────────────────────────────────────
ingress.use("/:namespace/*", async (c) => {
    const namespace = c.req.param("namespace");
    if (!namespace)
        return c.json({ error: "Missing namespace" }, 400);
    if (!store)
        return c.json({ error: "Server not initialized" }, 503);
    const tool = await store.getByNamespace(namespace);
    if (!tool)
        return c.json({ error: "Tool not found" }, 404);
    if (tool.status !== "active") {
        return c.json({ error: `Tool is not active (status: ${tool.status})` }, 423);
    }
    const agentId = c.get(K_AGENT);
    const bodyJson = c.get(K_JSON);
    const promotedBy = c.get(K_PROMOTED_BY);
    // ── 4. Schema validation ─────────────────────────────────────────────────
    const sv = validatePayload(tool.schema, bodyJson);
    if (!sv.ok) {
        await logInvocation(tool, agentId, "invalid_payload", 0, 400, 0, "none", sv.errors?.join("; "));
        return c.json({ error: "Invalid payload", details: sv.errors }, 400);
    }
    // ── 4b. Prompt-injection / payload sanitization ──────────────────────────
    const sanitize = sanitizePayload(bodyJson);
    if (!sanitize.ok) {
        await logInvocation(tool, agentId, "invalid_payload", 0, 422, 0, "none", `sanitizer blocked: ${sanitize.matched?.join(", ")}`);
        return c.json({ error: "Payload rejected by sanitizer", matched: sanitize.matched }, 422);
    }
    const t0 = Date.now();
    // ── 5. Payment gate (premium tools only) ─────────────────────────────────
    const premium = isPremium(tool);
    const feeUsd = premium ? PLATFORM_FEE_USDC : 0;
    // Payment context — set when payment is verified, used for settlement
    let paymentCtx;
    const onchainVerified = Boolean(c.get("x402.verified"));
    if (premium && !DEV_WALLET && !onchainVerified) {
        const paymentHeader = c.req.header("x-payment");
        const authHeader = c.req.header("authorization");
        if (!paymentHeader && !authHeader) {
            // No payment payload → return 402 with x402 payment requirements
            await logInvocation(tool, agentId, "payment_required", 0, 402, feeUsd, "not_collected", `Missing payment header for $${feeUsd.toFixed(2)} platform fee`);
            return c.json({
                error: "Payment required",
                description: `This is a premium tool. A flat $${feeUsd.toFixed(2)} USDC platform fee applies per call, collected only on successful delivery. Include a valid X-PAYMENT header with an x402 payment payload to proceed.`,
                payment: {
                    x402Version: 1,
                    accepts: [
                        {
                            scheme: "exact",
                            network: config.x402Network,
                            asset: "USDC",
                            amount: String(PLATFORM_FEE_USDC * 1_000_000),
                            payTo: config.x402WalletAddress,
                            maxTimeoutSeconds: 60,
                            extra: {},
                        },
                    ],
                },
            }, 402);
        }
        // Parse the payment payload from the header
        let paymentPayload;
        try {
            const raw = paymentHeader ?? authHeader;
            paymentPayload = JSON.parse(raw);
        }
        catch {
            await logInvocation(tool, agentId, "payment_required", 0, 402, feeUsd, "not_collected", "Invalid payment payload — not valid JSON");
            return c.json({ error: "Payment required", description: "X-PAYMENT header must contain a valid x402 payment payload" }, 402);
        }
        // Verify payment with the facilitator
        x402Server = await ensureX402Server();
        const requirements = await x402Server.buildPaymentRequirements({
            scheme: "exact",
            payTo: config.x402WalletAddress,
            price: `$${PLATFORM_FEE_USDC}`,
            network: config.x402Network,
        });
        const matching = x402Server.findMatchingRequirements(requirements, paymentPayload);
        if (!matching) {
            await logInvocation(tool, agentId, "payment_required", 0, 402, feeUsd, "not_collected", "Payment payload does not match any accepted requirements");
            return c.json({
                error: "Payment required",
                description: "Payment payload does not match accepted requirements for this tool",
            }, 402);
        }
        let verifyResult;
        try {
            verifyResult = await x402Server.verifyPayment(paymentPayload, matching);
        }
        catch (err) {
            await logInvocation(tool, agentId, "payment_required", 0, 402, feeUsd, "not_collected", `Facilitator verify failed: ${err?.message ?? String(err)}`);
            return c.json({
                error: "Payment verification failed",
                description: `The facilitator rejected the payment: ${err?.message ?? "unknown error"}`,
            }, 402);
        }
        if (!verifyResult.isValid) {
            await logInvocation(tool, agentId, "payment_required", 0, 402, feeUsd, "not_collected", `Payment invalid: ${verifyResult.invalidReason ?? "unspecified"}`);
            return c.json({
                error: "Payment required",
                description: `Payment verification failed: ${verifyResult.invalidReason ?? "invalid payment"}`,
            }, 402);
        }
        // Payment verified — store context for settlement in executeAndLog
        paymentCtx = { payload: paymentPayload, requirements: matching };
    }
    // ── 6–8. Egress guard + proxy + collect ──────────────────────────────────
    return executeAndLog(c, tool, agentId, t0, feeUsd, bodyJson, paymentCtx, promotedBy);
});
/**
 * Build the downstream URL, run the egress guard, proxy the (already
 * size-checked + schema-validated) request, enforce the response cap, and
 * collect the take-rate only on successful delivery.
 */
async function executeAndLog(c, tool, agentId, t0, feeUsdc, bodyJson, paymentCtx, promotedBy) {
    const rawBody = c.get(K_BODY);
    const contentType = c.get(K_CT);
    // Path AFTER /api/invoke/:namespace — appended to the tool's endpointUrl.
    const req = new URL(c.req.url, "http://localhost");
    const prefix = `/api/invoke/${tool.namespace}`;
    const idx = req.pathname.indexOf(prefix);
    const subpath = idx >= 0 ? req.pathname.slice(idx + prefix.length) : "";
    const toolPath = subpath + req.search;
    if (!tool.endpointUrl) {
        await logInvocation(tool, agentId, "failed", Date.now() - t0, 502, feeUsdc, "not_collected", `Tool ${tool.namespace} has no endpointUrl — cannot proxy.`);
        return c.json({ error: "Tool has no endpointUrl", status: "failed" }, 502);
    }
    const fullUrl = tool.endpointUrl.replace(/\/+$/, "") + toolPath;
    // ── 6. Egress guard (SSRF + allowlist) BEFORE any bytes leave ────────────
    const decision = await guardTargetUrl(fullUrl, { namespace: tool.namespace });
    if (!decision.ok || !decision.target) {
        const latency = Date.now() - t0;
        const feeStatus = feeUsdc > 0 ? "not_collected" : "none";
        await logInvocation(tool, agentId, "egress_blocked", latency, 502, 0, feeStatus, decision.reason);
        return c.json({ error: "Target blocked by egress guard", reason: decision.reason, status: "failed" }, 502);
    }
    // ── 7. Proxy (pinned to the validated IP) with response-size cap ─────────
    let statusCode = 0;
    let status = "success";
    let errorMsg;
    try {
        const res = await proxyToTool(decision.target, c.req.method, contentType, rawBody, c);
        statusCode = res.status;
        if (res.status >= 400) {
            status = "failed";
            errorMsg = `Tool returned HTTP ${res.status}`;
        }
    }
    catch (err) {
        statusCode = 502;
        status = "failed";
        errorMsg = err?.message ?? String(err);
    }
    const latencyMs = Date.now() - t0;
    // Collect the take-rate only on successful (2xx) delivery.
    let feeStatus = feeUsdc > 0 ? "not_collected" : "none";
    let settlementError;
    if (feeUsdc > 0 && status === "success") {
        if (c.get("x402.verified")) {
            feeStatus = "collected";
        }
        else if (paymentCtx && x402Server) {
            try {
                const settleResult = await x402Server.settlePayment(paymentCtx.payload, paymentCtx.requirements);
                if (settleResult.success) {
                    feeStatus = "collected";
                }
                else {
                    feeStatus = "not_collected";
                    settlementError = settleResult.errorReason ?? settleResult.errorMessage ?? "Settlement failed";
                }
            }
            catch (err) {
                feeStatus = "not_collected";
                settlementError = `Settlement error: ${err?.message ?? String(err)}`;
            }
        }
    }
    await logInvocation(tool, agentId, status, latencyMs, statusCode, feeStatus === "collected" ? feeUsdc : 0, feeStatus, errorMsg ?? settlementError, promotedBy);
    return c.json({
        toolNamespace: tool.namespace,
        toolName: tool.name,
        agentId,
        status,
        latencyMs,
        statusCode,
        error: errorMsg ?? null,
        fee: {
            amountUsdc: feeStatus === "collected" ? feeUsdc : 0,
            status: feeStatus,
            note: feeStatus === "collected"
                ? "Platform take-rate settled on-chain via x402 facilitator."
                : feeStatus === "not_collected"
                    ? settlementError
                        ? `Payment verified but settlement failed: ${settlementError}`
                        : "Fee not collected — tool did not deliver a successful response."
                    : "Free tool — no platform fee.",
        },
        invokedAt: new Date().toISOString(),
    }, statusCode >= 400 ? statusCode : 200);
}
/**
 * Forward a pre-validated request to the downstream tool's PINNED IP address
 * (the socket dials the validated address; the original hostname is preserved
 * for TLS SNI + Host headers), returning the response with its body capped.
 */
async function proxyToTool(target, method, contentType, bodyBytes, c) {
    const headers = {};
    const forwardHeaders = ["content-type", "accept", "x-agent-id", "x-request-id"];
    for (const h of forwardHeaders) {
        const v = c.req.header(h);
        if (v)
            headers[h] = v;
    }
    delete headers["x-payment"];
    let body;
    if (bodyBytes.byteLength > 0) {
        body = bodyBytes;
        if (contentType.startsWith("application/json"))
            headers["content-type"] = "application/json";
    }
    return pinnedRequest(target, {
        method,
        headers,
        body,
        maxResponseBytes: config.maxResponseBytes,
    });
}
export default ingress;
//# sourceMappingURL=invocation.js.map