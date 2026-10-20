/**
 * AUS Parse Markdown Web Extraction Service
 * Ported from aus.parse.markdown node specifications
 *
 * Scrapes target web URLs, strips DOM bloat/ads/cookie modals, and extracts clean token-optimized Markdown.
 */
export interface ParseMarkdownRequest {
    url: string;
    stripAds?: boolean;
    extractImages?: boolean;
}
export interface ParseMarkdownResult {
    success: boolean;
    utility: "parse-markdown";
    url: string;
    title: string;
    markdown: string;
    tokenCount: number;
    extractedAt: string;
}
export declare function parseUrlToMarkdown(req: ParseMarkdownRequest): Promise<ParseMarkdownResult>;
//# sourceMappingURL=parseMarkdown.d.ts.map