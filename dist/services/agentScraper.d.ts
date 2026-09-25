export interface ScrapedAgent {
    url: string;
    title: string;
    description: string;
    metadata?: Record<string, any>;
}
export declare function scrapeAgentDirectory(startUrls: string[]): Promise<ScrapedAgent[]>;
//# sourceMappingURL=agentScraper.d.ts.map