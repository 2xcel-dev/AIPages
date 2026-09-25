import { type Tool } from "../types.js";
export interface SitemapEntry {
    loc: string;
    lastmod?: string;
    changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority?: number;
}
export declare function escapeXml(str: string): string;
/**
 * Generate an XML sitemap for public tool and directory pages.
 * Includes homepage, tools directory, and all indexed tool detail pages with lastmod timestamps.
 */
export declare function generateSitemapXml(tools: Tool[], baseUrl?: string): string;
//# sourceMappingURL=sitemap.d.ts.map