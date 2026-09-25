/**
 * Telegram Alerting: sends failure notifications when the crawler
 * experiences issues (no tools ingested, error thresholds, health check failures).
 *
 * Env vars (set in Render):
 *   TLG_BOT_TOKEN : Telegram bot token
 *   TLG_CHAT_ID   : Telegram chat ID to receive alerts
 */
/**
 * Checks crawler result and sends alerts for failure conditions.
 * Call this after each crawl cycle.
 */
export declare function alertOnFailure(result: {
    discovered: number;
    ingested: number;
    errors: number;
    cycle?: number;
}): Promise<void>;
/**
 * Health check alert: fires when the service health endpoint reports
 * a degraded state.
 */
export declare function alertOnHealthIssue(health: {
    status: string;
    store: string;
}): Promise<void>;
//# sourceMappingURL=notify.d.ts.map