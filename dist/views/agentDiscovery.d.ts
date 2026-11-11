import { type Tool } from "../types.js";
/**
 * Generate an authoritative Model Context Protocol (MCP) discovery manifest
 * published at GET /mcp.json and GET /.well-known/mcp.json.
 *
 * Compatible with:
 * - AIPages authoritative manifest parser (parseMcpManifest in src/manifest.ts)
 * - Claude Desktop, Cursor (.cursor/mcp.json), Cline, and standard MCP clients
 */
export declare function generateMcpManifest(tools: Tool[], baseUrl?: string): {
    schemaVersion: string;
    name: string;
    version: string;
    description: string;
    url: string;
    transport: string;
    discoveryEndpoints: {
        search: string;
        tools: string;
        capabilities: string;
        openapi: string;
        llmsTxt: string;
        llmsFullTxt: string;
        webMcpActions: string;
        agentPermissions: string;
        syndicationFeed: string;
    };
    mcpServers: {
        "aipages-registry": {
            name: string;
            description: string;
            url: string;
            type: string;
        };
        "aipages-gateway": {
            name: string;
            description: string;
            url: string;
            type: string;
        };
    };
    tools: ({
        name: string;
        namespace: string;
        description: string;
        transport: string;
        endpointUrl: string;
        inputSchema: {
            type: string;
            properties: {
                q: {
                    type: string;
                    description: string;
                };
                limit: {
                    type: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                    description: string;
                };
                search?: undefined;
                capability?: undefined;
                reliability?: undefined;
                connectionType?: undefined;
                pricingModel?: undefined;
                name?: undefined;
                description?: undefined;
                endpointUrl?: undefined;
                costPerCall?: undefined;
                developerAddress?: undefined;
                schema?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        namespace: string;
        description: string;
        transport: string;
        endpointUrl: string;
        inputSchema: {
            type: string;
            properties: {
                search: {
                    type: string;
                    description: string;
                };
                capability: {
                    type: string;
                    description: string;
                };
                reliability: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                connectionType: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                pricingModel: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                limit: {
                    type: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                    description?: undefined;
                };
                q?: undefined;
                name?: undefined;
                description?: undefined;
                endpointUrl?: undefined;
                costPerCall?: undefined;
                developerAddress?: undefined;
                schema?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        namespace: string;
        description: string;
        transport: string;
        endpointUrl: string;
        inputSchema: {
            type: string;
            properties: {
                name: {
                    type: string;
                    description: string;
                };
                description: {
                    type: string;
                    description: string;
                };
                connectionType: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                endpointUrl: {
                    type: string;
                    description: string;
                };
                pricingModel: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                costPerCall: {
                    type: string;
                    minimum: number;
                    description: string;
                };
                developerAddress: {
                    type: string;
                    description: string;
                };
                schema: {
                    type: string;
                    description: string;
                };
                q?: undefined;
                limit?: undefined;
                search?: undefined;
                capability?: undefined;
                reliability?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        namespace: string;
        description: string;
        transport: import("../types.js").ConnectionType;
        endpointUrl: string;
        invokeUrl: string;
        directInvokeUrl: string;
        inputSchema: import("../types.js").ToolSchema;
        capabilities: string[];
        isFirstParty: boolean;
        pricing: {
            model: "free" | "freemium" | "paid";
            costPerCall: number;
            currency: string;
            network: string;
        };
        reliability: import("../types.js").ReliabilityIndicator;
        healthStatus: import("../types.js").HealthStatus;
    })[];
};
/**
 * Generate the WebMCP Actions inventory (GET /mcp-actions.json and /.well-known/mcp-actions.json).
 * Documents both Declarative WebMCP HTML form annotations (toolname, tooldescription, toolparamdescription)
 * and Imperative WebMCP registrations (document.modelContext.registerTool) across AIPages.
 */
export declare function generateWebMcpActionsManifest(tools: Tool[], baseUrl?: string): {
    spec: string;
    site: string;
    updatedAt: string;
    modesSupported: string[];
    declarativeForms: {
        toolname: string;
        tooldescription: string;
        pageUrls: string[];
        method: string;
        action: string;
        parameters: ({
            name: string;
            type: string;
            required: boolean;
            description: string;
            enum?: undefined;
        } | {
            name: string;
            type: string;
            required: boolean;
            enum: string[];
            description: string;
        })[];
    }[];
    imperativeTools: ({
        name: string;
        registeredOn: string[];
        description: string;
        consequentialHint: boolean;
        totalToolsCovered?: undefined;
    } | {
        name: string;
        registeredOn: string[];
        description: string;
        consequentialHint: boolean;
        totalToolsCovered: number;
    })[];
};
/**
 * Generate machine-readable agent permissions & task policies
 * (GET /agent-permissions.json and GET /.well-known/agent-permissions.json).
 */
export declare function generateAgentPermissionsManifest(baseUrl?: string): {
    schemaVersion: string;
    site: string;
    name: string;
    updatedAt: string;
    defaultPolicy: string;
    authenticationRequiredForDiscovery: boolean;
    captchaRequired: boolean;
    guestTaskFlowsAllowed: boolean;
    crawlers: {
        GPTBot: string;
        "OAI-SearchBot": string;
        "ChatGPT-User": string;
        ClaudeBot: string;
        "Claude-Web": string;
        "anthropic-ai": string;
        PerplexityBot: string;
        "Google-Extended": string;
        Applebot: string;
        "Applebot-Extended": string;
        CCBot: string;
        "cohere-ai": string;
        Bytespider: string;
    };
    allowedActions: ({
        action: string;
        endpoint: string;
        method: string;
        authRequired: boolean;
        cost: string;
        rateLimit: string;
        headers?: undefined;
        paymentProtocol?: undefined;
        network?: undefined;
        currency?: undefined;
        settlementGuarantee?: undefined;
    } | {
        action: string;
        endpoint: string;
        method: string;
        authRequired: boolean;
        cost: string;
        rateLimit?: undefined;
        headers?: undefined;
        paymentProtocol?: undefined;
        network?: undefined;
        currency?: undefined;
        settlementGuarantee?: undefined;
    } | {
        action: string;
        endpoint: string;
        method: string;
        headers: {
            "Content-Type": string;
            "x-playground-test": string;
            "x-agent-id": string;
            "X-Agent-ID"?: undefined;
            "X-Payment"?: undefined;
        };
        authRequired: boolean;
        cost: string;
        rateLimit?: undefined;
        paymentProtocol?: undefined;
        network?: undefined;
        currency?: undefined;
        settlementGuarantee?: undefined;
    } | {
        action: string;
        endpoint: string;
        method: string;
        headers: {
            "Content-Type": string;
            "X-Agent-ID": string;
            "X-Payment": string;
            "x-playground-test"?: undefined;
            "x-agent-id"?: undefined;
        };
        authRequired: boolean;
        paymentProtocol: string;
        network: string;
        currency: string;
        settlementGuarantee: string;
        rateLimit: string;
        cost?: undefined;
    })[];
};
/**
 * Generate standard AI Plugin manifest (GET /.well-known/ai-plugin.json).
 */
export declare function generateAiPluginManifest(baseUrl?: string): {
    schema_version: string;
    name_for_human: string;
    name_for_model: string;
    description_for_human: string;
    description_for_model: string;
    auth: {
        type: string;
    };
    api: {
        type: string;
        url: string;
        is_user_authenticated: boolean;
    };
    logo_url: string;
    contact_email: string;
    legal_info_url: string;
};
/**
 * Generate AI-aware robots.txt with explicit directives for search, citation,
 * and autonomous browsing agents plus machine-readable discovery pointers.
 */
export declare function generateRobotsTxt(baseUrl?: string): string;
/**
 * Generate comprehensive, token-budgeted llms-full.txt Markdown documentation
 * containing full tool schemas, sample payloads, cURL snippets, and WebMCP guides.
 */
export declare function generateLlmsFullTxt(tools: Tool[], baseUrl?: string): string;
/**
 * Generate a clean, token-budgeted (<1,500 tokens) Markdown representation
 * of a single tool for GET /tool/:slug.md or Accept: text/markdown.
 */
export declare function generateToolMarkdown(tool: Tool, baseUrl?: string): string;
export interface WebMcpScriptContext {
    pageType: "directory" | "capabilities" | "submit" | "tool" | "legal";
    tool?: Tool;
}
/**
 * Render the client-side Imperative WebMCP (`document.modelContext.registerTool`)
 * script block and `window.verifyWebMcpTools()` discovery helper.
 *
 * Safely checks `if ('modelContext' in document)` before registering tools.
 */
export declare function renderWebMcpRuntimeScript(ctx: WebMcpScriptContext): string;
//# sourceMappingURL=agentDiscovery.d.ts.map