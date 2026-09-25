import { type Tool } from "../types.js";
import { type ToolStore } from "../db.js";
export declare function findToolBySlug(store: ToolStore, slug: string): Promise<Tool | null>;
export declare function findRelatedTools(store: ToolStore, tool: Tool, limit?: number): Promise<Tool[]>;
export declare function generateSamplePayload(schema: any): any;
export interface RequestExample {
    endpoint: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, any>;
    bodyJson: string;
    curl: string;
    fetchCode: string;
    rawHttp: string;
    authDescription: string;
    isX402: boolean;
    costDisplay: string;
    recipientAddress?: string;
}
export declare function generateRequestExample(tool: Tool): RequestExample;
/**
 * Generate Schema.org JSON-LD structured data for a tool detail page.
 * Uses existing listing fields (name, description, url, capabilities, pricing,
 * authentication, and reliability context).
 * Adheres strictly to the anti-falsification rule (never invents claims; unchecked health remains unchecked)
 * and never exposes private keys or credentials.
 */
export declare function generateToolJsonLd(tool: Tool): Record<string, unknown>;
export declare function renderToolPage(tool: Tool, relatedTools?: Tool[]): string;
export declare function renderNotFoundPage(slug: string): string;
//# sourceMappingURL=toolPage.d.ts.map