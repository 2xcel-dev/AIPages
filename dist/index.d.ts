import { type ToolStore } from "./db.js";
import { formatToolRecord } from "./api/tools.js";
export { formatToolRecord };
export declare const DISCOVERY_MANIFEST: {
    name: string;
    version: string;
    status: string;
    description: string;
    x402: boolean;
    pricing: {
        "/search": string;
        "/api/tools/submit": string;
        "/api/invoke/{namespace}": string;
    };
    endpoints: {
        search: string;
        directory: string;
        tools: string;
        syndication: string;
        submit: string;
        toolDetail: string;
        toolPage: string;
        capabilities: string;
        sitemap: string;
        openapi: string;
        ingest: string;
        scrape: string;
        scrapeAgents: string;
    };
    payment: {
        network: string;
        currency: string;
        model: string;
        platformFee: string;
        note: string;
    };
    openapi: string;
};
export declare function handleDirectoryRequest(c: any, baseUrl?: string, targetStore?: ToolStore): Promise<any>;
//# sourceMappingURL=index.d.ts.map