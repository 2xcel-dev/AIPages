import { Hono } from "hono";
import { type ToolStore } from "./db.js";
import { formatToolRecord } from "./api/tools.js";
export { formatToolRecord };
export declare const app: Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
export declare function isAiOrSearchCrawler(userAgent?: string | null): boolean;
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
        llms: string;
        llmsFull: string;
        mcpManifest: string;
        mcpActions: string;
        agentPermissions: string;
        agentsMd: string;
        openapi: string;
        metrics: string;
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
export declare const ROBOTS_TXT: string;
export declare const AGENT_PERMISSIONS_MANIFEST: {
    schemaVersion: string;
    site: string;
    name: string;
    defaultPolicy: string;
    crawlers: {
        allow: string[];
        disallow: string[];
    };
    discoveryFiles: {
        llmsTxt: string;
        llmsFullTxt: string;
        agentsMd: string;
        mcpManifest: string;
        mcpActions: string;
        openApi: string;
        jsonFeed: string;
        sitemap: string;
    };
    authentication: {
        discovery: string;
        sandboxTest: string;
        productionInvoke: string;
    };
    rateLimits: {
        "/search": string;
        "/api/tools": string;
        "/api/tools/submit": string;
        "/api/invoke/:namespace": string;
    };
};
export declare const MCP_ACTIONS_MANIFEST: {
    schemaVersion: string;
    site: string;
    actions: ({
        id: string;
        name: string;
        description: string;
        method: string;
        endpoint: string;
        selector: string;
        authentication: string;
        parameters: {
            q: {
                type: string;
                required: boolean;
                description: string;
            };
            limit: {
                type: string;
                required: boolean;
                default: number;
                maximum: number;
            };
            search?: undefined;
            capability?: undefined;
            source?: undefined;
            active?: undefined;
            page?: undefined;
            namespace?: undefined;
        };
        bodySchema?: undefined;
        headers?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        method: string;
        endpoint: string;
        authentication: string;
        parameters: {
            search: {
                type: string;
                required: boolean;
            };
            capability: {
                type: string;
                required: boolean;
            };
            source: {
                type: string;
                required: boolean;
            };
            active: {
                type: string;
                required: boolean;
            };
            limit: {
                type: string;
                required: boolean;
                default: number;
                maximum?: undefined;
            };
            page: {
                type: string;
                required: boolean;
                default: number;
            };
            q?: undefined;
            namespace?: undefined;
        };
        selector?: undefined;
        bodySchema?: undefined;
        headers?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        method: string;
        endpoint: string;
        authentication: string;
        parameters: {
            namespace: {
                type: string;
                required: boolean;
                description: string;
            };
            q?: undefined;
            limit?: undefined;
            search?: undefined;
            capability?: undefined;
            source?: undefined;
            active?: undefined;
            page?: undefined;
        };
        selector?: undefined;
        bodySchema?: undefined;
        headers?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        method: string;
        endpoint: string;
        authentication: string;
        bodySchema: {
            type: string;
            required: string[];
            properties: {
                name: {
                    type: string;
                };
                description: {
                    type: string;
                };
                connectionType: {
                    type: string;
                    enum: string[];
                };
                endpointUrl: {
                    type: string;
                };
                pricingModel: {
                    type: string;
                    enum: string[];
                };
                costPerCall: {
                    type: string;
                };
                developerAddress: {
                    type: string;
                };
                schema: {
                    type: string;
                };
            };
        };
        selector?: undefined;
        parameters?: undefined;
        headers?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        method: string;
        endpoint: string;
        selector: string;
        authentication: string;
        headers: {
            "Content-Type": string;
            "x-playground-test": string;
            "x-payment-receipt": string;
        };
        parameters?: undefined;
        bodySchema?: undefined;
    })[];
};
export declare function initApp(): Promise<{
    store: ToolStore;
    app: Hono;
}>;
export declare function syncCanonicalAusTools(store: ToolStore): Promise<number>;
//# sourceMappingURL=index.d.ts.map