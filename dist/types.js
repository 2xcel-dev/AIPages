/**
 * Core data model for the `tools` collection in MongoDB Atlas.
 */
/**
 * Derive endpoint health and compact reliability indicator from stored tool results.
 * Returns explicit "unchecked" enum state when no result exists.
 */
export function deriveReliability(tool) {
    const lastCheckedDate = tool.lastChecked ?? tool.lastCheckedAt;
    const lastCheckedIso = lastCheckedDate ? new Date(lastCheckedDate).toISOString() : null;
    const healthStatus = tool.healthStatus ?? "unknown";
    const failureReason = tool.failureReason ?? null;
    // Unchecked / no stored result exists
    if (!lastCheckedDate || healthStatus === "unknown") {
        return {
            healthStatus,
            lastCheckedIso: null,
            failureReason: null,
            reliability: "unchecked",
        };
    }
    // Failing endpoint
    if (healthStatus === "inactive") {
        return {
            healthStatus: "inactive",
            lastCheckedIso,
            failureReason,
            reliability: "failing",
        };
    }
    // Active endpoint: evaluate freshness
    const ageMs = Date.now() - new Date(lastCheckedDate).getTime();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (ageMs > TWENTY_FOUR_HOURS_MS) {
        return {
            healthStatus: "active",
            lastCheckedIso,
            failureReason: null,
            reliability: "degraded",
        };
    }
    return {
        healthStatus: "active",
        lastCheckedIso,
        failureReason: null,
        reliability: "high",
    };
}
/**
 * Projection of a Tool document suitable for API responses (no embedding).
 */
export function toSearchResult(tool, score) {
    const { reliability } = deriveReliability(tool);
    return {
        namespace: tool.namespace,
        name: tool.name,
        description: tool.description,
        connectionType: tool.connectionType,
        endpointUrl: tool.endpointUrl,
        healthStatus: tool.healthStatus,
        lastChecked: tool.lastChecked ?? tool.lastCheckedAt,
        failureReason: tool.failureReason ?? null,
        reliability,
        score: Number(score.toFixed(4)),
    };
}
//# sourceMappingURL=types.js.map