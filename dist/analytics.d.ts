/** Track an event with optional properties and distinct ID. */
export declare function trackEvent(distinctId: string, event: string, properties?: Record<string, unknown>): void;
/** Track a tool invocation (free or paid). */
export declare function trackInvocation(params: {
    agentId: string;
    namespace: string;
    statusCode: number;
    success: boolean;
    latencyMs?: number;
    feeAmountUsdc?: number;
    feeStatus?: string;
    promotedBy?: string | null;
}): void;
/** Track a tool submission/listing. */
export declare function trackSubmission(params: {
    namespace: string;
    pricingModel: string;
    connectionType: string;
}): void;
/** Track a search query. */
export declare function trackSearch(params: {
    query: string;
    resultCount: number;
    agentId?: string;
}): void;
/**
 * Identify an agent as a PostHog user with a display name and properties.
 * Enables person-level tracking and labeled filtering in dashboards.
 */
export declare function identifyAgent(distinctId: string, properties?: Record<string, unknown>): void;
/** Shutdown helper — flush any pending events. */
export declare function shutdownAnalytics(): Promise<void>;
//# sourceMappingURL=analytics.d.ts.map