import { Hono } from "hono";
import { scrapeAgentDirectory } from "../services/agentScraper.js";
import { guardTargetUrl } from "../egress-guard.js";
const router = new Hono();
const MAX_SCRAPE_URLS = 10;
router.post("/api/scrape-agents", async (c) => {
    // 1. Admin Authentication Gate (Prevents public resource exhaustion & unauthenticated crawling)
    const authHeader = c.req.header("authorization") || "";
    const adminKeyHeader = c.req.header("x-admin-key") || c.req.header("X-ADMIN-KEY") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() || adminKeyHeader.trim();
    const expected = process.env.ADMIN_KEY;
    if (expected && token !== expected) {
        return c.json({ error: "Unauthorized: admin key required to trigger agent scraping." }, 401);
    }
    try {
        const body = (await c.req.json().catch(() => null));
        const urls = body?.urls;
        if (!urls || !Array.isArray(urls)) {
            return c.json({ error: "Please provide an array of URLs to scrape." }, 400);
        }
        if (urls.length === 0) {
            return c.json({ success: true, count: 0, agents: [] });
        }
        if (urls.length > MAX_SCRAPE_URLS) {
            return c.json({ error: `Exceeded maximum of ${MAX_SCRAPE_URLS} URLs per scrape request.` }, 400);
        }
        // 2. SSRF Protection: Validate every URL against internal/private IP ranges
        const validatedUrls = [];
        for (const rawUrl of urls) {
            if (typeof rawUrl !== "string")
                continue;
            const trimmed = rawUrl.trim();
            try {
                const parsed = new URL(trimmed);
                if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                    return c.json({ error: `Invalid protocol '${parsed.protocol}'. Only HTTP and HTTPS are allowed.` }, 400);
                }
                const decision = await guardTargetUrl(trimmed);
                if (!decision.ok) {
                    return c.json({ error: `URL blocked by SSRF egress guard: ${decision.reason}` }, 400);
                }
                validatedUrls.push(trimmed);
            }
            catch {
                return c.json({ error: `Invalid URL format: '${trimmed}'` }, 400);
            }
        }
        if (validatedUrls.length === 0) {
            return c.json({ error: "No valid URLs provided." }, 400);
        }
        const agents = await scrapeAgentDirectory(validatedUrls);
        return c.json({ success: true, count: agents.length, agents });
    }
    catch (error) {
        console.error("Scraping error:", error);
        return c.json({ error: error.message || "Failed to execute agent scraping." }, 500);
    }
});
export default router;
//# sourceMappingURL=agentScraper.js.map