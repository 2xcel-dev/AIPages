/**
 * PostHog analytics client for AIPages event tracking.
 *
 * Optional — when POSTHOG_API_KEY is not set, all calls are no-ops.
 * Tracks tool invocations, submissions, searches, and x402 payments.
 */
import { PostHog } from "posthog-node";
import { config } from "./config.js";
let client = null;
function getClient() {
    if (!config.posthogApiKey)
        return null;
    if (!client) {
        client = new PostHog(config.posthogApiKey, {
            host: config.posthogHost,
        });
    }
    return client;
}
/** Track an event with optional properties and distinct ID. */
export function trackEvent(distinctId, event, properties) {
    const c = getClient();
    if (!c)
        return;
    c.capture({ distinctId, event, properties });
}
/** Track a tool invocation (free or paid). */
export function trackInvocation(params) {
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
export function trackSubmission(params) {
    trackEvent("anonymous", "tool_submitted", {
        namespace: params.namespace,
        pricing_model: params.pricingModel,
        connection_type: params.connectionType,
    });
}
/** Track a search query. */
export function trackSearch(params) {
    trackEvent(params.agentId ?? "anonymous", "tool_searched", {
        query: params.query,
        result_count: params.resultCount,
    });
}
/**
 * Identify an agent as a PostHog user with a display name and properties.
 * Enables person-level tracking and labeled filtering in dashboards.
 */
export function identifyAgent(distinctId, properties) {
    const c = getClient();
    if (!c)
        return;
    c.identify({
        distinctId,
        ...(properties && { $set: properties }),
    });
}
/** Shutdown helper — flush any pending events. */
export async function shutdownAnalytics() {
    if (client) {
        await client.shutdown();
    }
}
//# sourceMappingURL=analytics.js.map