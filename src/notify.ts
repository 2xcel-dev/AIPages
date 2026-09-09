/**
 * Telegram Alerting — sends failure notifications when the crawler
 * experiences issues (no tools ingested, error thresholds, health check failures).
 *
 * Env vars (set in Render):
 *   TLG_BOT_TOKEN  — Telegram bot token
 *   TLG_CHAT_ID    — Telegram chat ID to receive alerts
 */

const TELEGRAM_ENDPOINT = "https://api.telegram.org/bot";
const ERROR_THRESHOLD = 10; // alert if crawl cycle has more than 10 errors
const INGESTION_WARNING = 0;  // alert if zero tools ingested (but candidates were found)

/**
   * Sends a Telegram message via the Bot API. No-op if credentials not set.
   */
async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TLG_BOT_TOKEN;
  const chatId = process.env.TLG_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[notify] Telegram credentials not configured — skipping alert");
    return false;
  }

  try {
    const resp = await fetch(`${TELEGRAM_ENDPOINT}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_notification: false,
      }),
    });

    if (!resp.ok) {
      console.error(`[notify] Telegram API error: ${resp.status} ${resp.statusText}`);
      return false;
    }

    console.log("[notify] Telegram alert sent successfully");
    return true;
  } catch (err) {
    console.error("[notify] Failed to send Telegram alert:", err);
    return false;
  }
}

/**
 * Checks crawler result and sends alerts for failure conditions.
 * Call this after each crawl cycle.
 */
export async function alertOnFailure(
  result: {
    discovered: number;
    ingested: number;
    errors: number;
    cycle?: number;
  },
): Promise<void> {
  const issues: string[] = [];

  // Alert if we found candidates but ingested nothing
  if (result.discovered > 0 && result.ingested === INGESTION_WARNING) {
    issues.push(`⚠️ Tool ingestion failure — ${result.discovered} candidates found but 0 tools ingested`);
  }

  // Alert if error count exceeds threshold
  if (result.errors >= ERROR_THRESHOLD) {
    issues.push(`⚠️ High error rate — ${result.errors} errors in crawl cycle`);
  }

  // Alert if we discovered zero candidates (potential rate limit / network issue)
  if (result.discovered === 0 && result.ingested === 0) {
    issues.push(`⚠️ Crawler discovered 0 candidates — possible rate limiting or network issue`);
  }

  if (issues.length > 0) {
    const cycleInfo = result.cycle ? ` (Cycle: ${result.cycle})` : "";
    const timestamp = new Date().toISOString();

    const message = issues
      .map((issue) => `• ${issue}`)
      .join("\n");

    await sendTelegramMessage(
      `🚨 AIPages Crawler Alert${cycleInfo}\n\n${message}\n\n⏰ ${timestamp}`,
    );
  }
}

/**
 * Health check alert — fires when the service health endpoint reports
 * a degraded state.
 */
export async function alertOnHealthIssue(
  health: { status: string; store: string },
): Promise<void> {
  if (health.status === "degraded" || health.store === "disconnected") {
    await sendTelegramMessage(
      `🚨 AIPages Health Check FAILED\n\nStatus: ${health.status}\nStore: ${health.store}\nTime: ${new Date().toISOString()}`,
    );
  }
}
