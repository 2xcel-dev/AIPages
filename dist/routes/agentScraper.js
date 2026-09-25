import { Hono } from "hono";
import { scrapeAgentDirectory } from "../services/agentScraper.js";
const router = new Hono();
router.post("/api/scrape-agents", async (c) => {
    try {
        const body = (await c.req.json().catch(() => null));
        const urls = body?.urls;
        if (!urls || !Array.isArray(urls)) {
            return c.json({ error: "Please provide an array of URLs to scrape." }, 400);
        }
        const agents = await scrapeAgentDirectory(urls);
        return c.json({ success: true, count: agents.length, agents });
    }
    catch (error) {
        console.error("Scraping error:", error);
        return c.json({ error: error.message }, 500);
    }
});
export default router;
//# sourceMappingURL=agentScraper.js.map