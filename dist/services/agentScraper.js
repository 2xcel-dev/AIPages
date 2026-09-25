import { PlaywrightCrawler } from 'crawlee';
export async function scrapeAgentDirectory(startUrls) {
    const results = [];
    const crawler = new PlaywrightCrawler({
        // Adjust concurrency based on Render resource tier
        maxRequestsPerCrawl: 50,
        async requestHandler({ page, request, log }) {
            log.info(`Processing agent source: ${request.url}`);
            await page.waitForLoadState('domcontentloaded');
            const title = await page.title();
            const description = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content')).catch(() => '');
            results.push({
                url: request.url,
                title,
                description: description || '',
            });
        },
        failedRequestHandler({ request, log }) {
            log.error(`Request ${request.url} failed.`);
        },
    });
    await crawler.run(startUrls);
    return results;
}
//# sourceMappingURL=agentScraper.js.map