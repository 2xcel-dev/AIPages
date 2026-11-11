/**
 * OpenAPI 3.1 specification for the AIPages registry API.
 *
 * Published at GET /api/openapi.json for zero-config agent discovery.
 */
import { config } from "./config.js";
export const openapi = {
    openapi: "3.1.0",
    info: {
        title: "AIPages — Machine-Native Agent Tool Registry",
        version: "0.1.0",
        description: "Machine-native discovery registry and vector search index for autonomous AI agent tools. Discovery, search, and listing submission are free and open. The platform monetizes exclusively at execution: a flat $0.25 USDC take-rate on Base for premium tool invocations, collected only when the invocation succeeds.",
    },
    servers: [
        {
            url: "https://aipages.tech",
            description: "Production AIPages Registry and x402 Execution Gateway (Base Mainnet)",
        },
        {
            url: `http://localhost:${config.port}`,
            description: "Local development server",
        },
    ],
    paths: {
        "/health": {
            get: {
                summary: "Service health check",
                responses: {
                    "200": {
                        description: "Service is healthy",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string", enum: ["healthy", "degraded"] },
                                        store: { type: "string", enum: ["connected", "disconnected"] },
                                    },
                                    required: ["status", "store"],
                                },
                            },
                        },
                    },
                },
            },
        },
        "/search": {
            get: {
                summary: "Semantic vector search for agent tools (free)",
                description: "Free and open natural-language semantic search over the indexed tool embeddings. No authentication or payment required.",
                parameters: [
                    {
                        name: "q",
                        in: "query",
                        required: true,
                        schema: { type: "string" },
                    },
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
                    },
                ],
                responses: {
                    "200": {
                        description: "Search results",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        query: { type: "string" },
                                        count: { type: "integer" },
                                        results: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/SearchResult" },
                                        },
                                    },
                                    required: ["query", "count", "results"],
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/openapi.json": {
            get: {
                summary: "OpenAPI 3.1 specification",
                description: "Machine-readable OpenAPI 3.1 specification for zero-config agent discovery and binding.",
                responses: {
                    "200": {
                        description: "OpenAPI spec",
                        content: {
                            "application/json": {
                                schema: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
        "/mcp.json": {
            get: {
                summary: "Authoritative Model Context Protocol (MCP) server & tool manifest",
                description: "Returns the complete MCP server discovery manifest and schema-bearing tool definitions for Cursor, Claude Desktop, Cline, and autonomous MCP clients.",
                responses: {
                    "200": {
                        description: "MCP manifest JSON",
                        content: {
                            "application/json": {
                                schema: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
        "/mcp-actions.json": {
            get: {
                summary: "W3C WebMCP declarative and imperative browser agent actions manifest",
                description: "Declares structured browser actions (search_agent_tools, filter_tools_by_capability, register_agent_tool, execute_tool_*) for WebMCP-enabled browsing agents.",
                responses: {
                    "200": {
                        description: "WebMCP actions manifest",
                        content: {
                            "application/json": {
                                schema: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
        "/agent-permissions.json": {
            get: {
                summary: "Autonomous AI agent & crawler permissions policy",
                description: "Machine-readable policy specifying allowed AI crawlers, rate limits, sandbox test headers, and Base Mainnet x402 settlement rules.",
                responses: {
                    "200": {
                        description: "Agent permissions policy JSON",
                        content: {
                            "application/json": {
                                schema: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
        "/llms.txt": {
            get: {
                summary: "Token-budgeted Markdown discovery index for LLMs",
                description: "Concise, prioritized Markdown index of AIPages endpoints, capabilities, and registered tools following the llms.txt specification.",
                responses: {
                    "200": {
                        description: "Markdown discovery file",
                        content: {
                            "text/markdown": {
                                schema: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        "/llms-full.txt": {
            get: {
                summary: "Complete Markdown catalog with full JSON Schemas and cURL examples",
                description: "Single-request comprehensive Markdown specification of every registered tool, its input JSON Schema, and HTTP 402 / sandbox invocation examples.",
                responses: {
                    "200": {
                        description: "Full Markdown catalog",
                        content: {
                            "text/markdown": {
                                schema: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        "/api/tools": {
            get: {
                summary: "List tools with health, freshness, and reliability status",
                description: "Returns registered tools with their latest endpoint health status, last-checked timestamp, and compact reliability indicator ('high', 'degraded', 'failing', or null/unchecked). Supports filtering by status, connectionType, healthStatus, pricingModel, hasEndpoint, and pagination via limit and offset/page.",
                parameters: [
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
                        description: "Number of tools to return",
                    },
                    {
                        name: "offset",
                        in: "query",
                        required: false,
                        schema: { type: "integer", default: 0, minimum: 0 },
                        description: "Offset index for pagination",
                    },
                    {
                        name: "status",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["active", "inactive", "pending", "rejected"] },
                        description: "Filter by tool registration status",
                    },
                    {
                        name: "connectionType",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["sse", "stdio", "http", "websocket"] },
                        description: "Filter by connection protocol",
                    },
                    {
                        name: "healthStatus",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["active", "inactive", "unknown"] },
                        description: "Filter by endpoint health status",
                    },
                    {
                        name: "pricingModel",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["free", "freemium", "paid"] },
                        description: "Filter by pricing model",
                    },
                    {
                        name: "hasEndpoint",
                        in: "query",
                        required: false,
                        schema: { type: "boolean" },
                        description: "Filter tools that have a valid remote endpoint URL",
                    },
                    {
                        name: "capability",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Filter tools by capability, keyword, or parameter across name, namespace, description, and schema properties",
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated list of tools with health and reliability evaluation",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        total: { type: "integer" },
                                        count: { type: "integer" },
                                        limit: { type: "integer" },
                                        offset: { type: "integer" },
                                        tools: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/ToolDetail" },
                                        },
                                    },
                                    required: ["total", "count", "limit", "offset", "tools"],
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/tools/{namespace}": {
            get: {
                summary: "Get full execution metadata for a tool",
                description: "Returns the complete registration record for a tool: full JSON Schema, connection type, endpoint URL, pricing metadata (model + declared costPerCall), developer address, registration status, health status, and embedding dimensions. Note: listing is free, and the actual platform fee is a flat $0.25 charged only on successful premium invocation — see POST /api/invoke/{namespace}. Use this to construct valid tool invocation requests without guessing parameters.",
                parameters: [
                    {
                        name: "namespace",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Tool detail",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ToolDetail" },
                            },
                        },
                    },
                    "404": {
                        description: "Tool not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/tools": {
            get: {
                summary: "Responsive human-facing tool directory with reliability cards",
                description: "Renders an interactive directory grid of tool cards showcasing live endpoint reliability indicators, probe freshness relative timestamps, pricing, and connection protocols. Supports filtering by reliability state, connection type, and keyword query.",
                parameters: [
                    {
                        name: "q",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Keyword search across tool name, namespace, or description",
                    },
                    {
                        name: "reliability",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["all", "high", "degraded", "failing", "unchecked"] },
                        description: "Filter cards by endpoint reliability state",
                    },
                    {
                        name: "connectionType",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["sse", "stdio", "http", "websocket"] },
                        description: "Filter by connection protocol",
                    },
                ],
                responses: {
                    "200": {
                        description: "Tool directory HTML view or JSON tool array",
                        content: {
                            "text/html": {
                                schema: { type: "string", description: "Responsive HTML5 directory view" },
                            },
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        total: { type: "integer" },
                                        count: { type: "integer" },
                                        tools: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/ToolDetail" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "/tools/{slug}": {
            get: {
                summary: "Responsive human-facing tool detail and reliability page",
                description: "Renders a responsive HTML detail page for a tool, featuring a prominent Reliability Section displaying endpoint liveness status, last-checked timestamp, human-readable failure reason, and recorded probe scope disclaimer. Supports content negotiation (returns JSON if Accept: application/json or ?format=json).",
                parameters: [
                    {
                        name: "slug",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Tool namespace or normalized slug identifier",
                    },
                    {
                        name: "format",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["json", "html"] },
                        description: "Optional response format override",
                    },
                ],
                responses: {
                    "200": {
                        description: "Tool detail page (HTML) or JSON representation",
                        content: {
                            "text/html": {
                                schema: { type: "string", description: "Responsive HTML5 document" },
                            },
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ToolDetail" },
                            },
                        },
                    },
                    "404": {
                        description: "Tool not found",
                        content: {
                            "text/html": {
                                schema: { type: "string", description: "Not found HTML page" },
                            },
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/api/tools/submit": {
            post: {
                summary: "Submit a tool listing (free, self-serve)",
                description: "Register a new tool in the AIPages registry. The submitting agent provides tool metadata (name, description, schema, connectionType, endpointUrl, pricingModel, costPerCall, developerAddress). A 3072-dim Gemini embedding is generated from the description and indexed for semantic discovery. Listing is free — monetization happens only on successful invocation via the proxy's flat platform take-rate.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ToolSubmission" },
                        },
                        "application/x-www-form-urlencoded": {
                            schema: { $ref: "#/components/schemas/ToolSubmission" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Tool registered",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ToolDetail" },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid payload",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/api/invoke/{namespace}": {
            post: {
                summary: "Invoke a tool (execution-only monetization + metering)",
                description: "Proxy an invocation request to a registered tool. The caller identifies themselves via the X-Agent-ID header. Premium tools (pricing.model 'paid' or 'freemium') incur a flat $0.25 USDC platform take-rate on Base, collected ONLY when the downstream tool returns a successful (2xx) response — failed invocations are never charged. Free tools execute without any fee. Every invocation is metered and logged to the invocations collection regardless of payment status. Rate-limited per agent (sliding window).",
                parameters: [
                    {
                        name: "namespace",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                headers: {
                    "X-Agent-ID": {
                        description: "Agent identifier for metering, rate limiting, and signature verification",
                        schema: { type: "string" },
                        required: true,
                    },
                    "X-Timestamp": {
                        description: "Unix seconds. Required when AGENT_KEYS is configured (binds freshness).",
                        schema: { type: "string" },
                    },
                    "X-Signature": {
                        description: "base64url Ed25519 (or hex HMAC-SHA256) signature over the canonical request string. Required when AGENT_KEYS is configured (unless X-EIP712-Signature is used).",
                        schema: { type: "string" },
                    },
                    "X-EIP712-Signature": {
                        description: "0x-prefixed 65-byte EIP-712 signature over the InvokeRequest typed message. Required for agents registered by Base address.",
                        schema: { type: "string" },
                    },
                    "X-PAYMENT": {
                        description: "x402 payment proof header. Required for paid tools. Omit for free tools.",
                        schema: { type: "string" },
                    },
                },
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/InvocationRequest" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Invocation result",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/InvocationResult" },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid namespace or payload fails the tool's registered schema",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Missing X-Agent-ID, unknown agent, or invalid signature",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "402": {
                        description: "Payment required for this tool",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/PaymentRequired" },
                            },
                        },
                    },
                    "404": {
                        description: "Tool not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "422": {
                        description: "Payload rejected by the prompt-injection / sanitization gate",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "413": {
                        description: "Request body exceeds the size limit",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "423": {
                        description: "Tool not active",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "429": {
                        description: "Rate limit exceeded",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "502": {
                        description: "Tool invocation failed (proxy error, response too large, or egress blocked)",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
                security: [{ x402: [] }],
            },
        },
    },
    components: {
        securitySchemes: {
            x402: {
                type: "apiKey",
                in: "header",
                name: "X-PAYMENT",
                description: "x402 Payment Protocol — payment proof header. Obtain payment requirements from a 402 response body and attach a verified payment proof as the X-PAYMENT header on retry.",
            },
        },
        schemas: {
            SearchResult: {
                type: "object",
                properties: {
                    namespace: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    connectionType: {
                        type: "string",
                        enum: ["sse", "stdio", "http", "websocket"],
                    },
                    endpointUrl: { type: "string" },
                    healthStatus: {
                        type: "string",
                        enum: ["active", "inactive", "unknown"],
                    },
                    lastChecked: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                        description: "Timestamp of latest health check probe, or null if unchecked.",
                    },
                    failureReason: {
                        type: "string",
                        nullable: true,
                        description: "Concise diagnostic failure reason if endpoint check failed.",
                    },
                    reliability: {
                        type: "string",
                        enum: ["high", "degraded", "failing", "unchecked"],
                        description: "Compact reliability indicator derived from health status and freshness.",
                    },
                    score: {
                        type: "number",
                        description: "Vector search similarity score (cosine)",
                    },
                },
                required: [
                    "namespace",
                    "name",
                    "description",
                    "connectionType",
                    "healthStatus",
                    "score",
                ],
            },
            ToolDetail: {
                type: "object",
                properties: {
                    namespace: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    schema: { $ref: "#/components/schemas/ToolSchema" },
                    connectionType: {
                        type: "string",
                        enum: ["sse", "stdio", "http", "websocket"],
                    },
                    endpointUrl: { type: "string", nullable: true },
                    healthStatus: {
                        type: "string",
                        enum: ["active", "inactive", "unknown"],
                    },
                    lastChecked: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                        description: "Timestamp of latest health check probe, or null if unchecked.",
                    },
                    failureReason: {
                        type: "string",
                        nullable: true,
                        description: "Concise diagnostic failure reason if endpoint check failed.",
                    },
                    reliability: {
                        type: "string",
                        enum: ["high", "degraded", "failing", "unchecked"],
                        description: "Compact reliability indicator derived from health status and freshness.",
                    },
                    health: {
                        type: "object",
                        properties: {
                            status: { type: "string", enum: ["active", "inactive", "unknown"] },
                            lastChecked: { type: "string", format: "date-time", nullable: true },
                            reliability: { type: "string", enum: ["high", "degraded", "failing", "unchecked"] },
                            failureReason: { type: "string", nullable: true },
                        },
                    },
                    pricing: {
                        type: "object",
                        properties: {
                            model: {
                                type: "string",
                                enum: ["free", "freemium", "paid"],
                            },
                            costPerCall: { type: "number", format: "float" },
                        },
                        required: ["model", "costPerCall"],
                    },
                    developer: {
                        type: "object",
                        properties: {
                            address: { type: "string" },
                            listingFeePaid: { type: "boolean" },
                            listingFeeAmount: { type: "number" },
                        },
                        required: ["address"],
                    },
                    status: {
                        type: "string",
                        enum: ["active", "inactive", "pending", "rejected"],
                    },
                    updatedAt: { type: "string", format: "date-time" },
                    schemaSource: {
                        type: "string",
                        nullable: true,
                        description: "Provenance URL of the manifest the schema was parsed from.",
                    },
                },
                required: [
                    "namespace",
                    "name",
                    "description",
                    "schema",
                    "connectionType",
                    "healthStatus",
                    "pricing",
                    "developer",
                    "status",
                ],
            },
            ToolSchema: {
                type: "object",
                description: "A faithful JSON Schema for the tool's input parameters — stored verbatim from an mcp.json or OpenAPI manifest. type/properties/required are optional; arbitrary JSON Schema keywords ($ref, items, enum, anyOf, …) are preserved.",
                properties: {
                    type: { type: "string" },
                    properties: {
                        type: "object",
                        additionalProperties: true,
                    },
                    required: {
                        type: "array",
                        items: { type: "string" },
                    },
                },
                additionalProperties: true,
            },
            ToolSubmission: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 1,
                    },
                    description: {
                        type: "string",
                        minLength: 1,
                    },
                    schema: { $ref: "#/components/schemas/ToolSchema" },
                    connectionType: {
                        type: "string",
                        enum: ["sse", "stdio", "http", "websocket"],
                    },
                    endpointUrl: { type: "string" },
                    pricingModel: {
                        type: "string",
                        enum: ["free", "freemium", "paid"],
                    },
                    costPerCall: { type: "number", format: "float", minimum: 0 },
                    developerAddress: { type: "string", minLength: 1 },
                },
                required: [
                    "name",
                    "description",
                    "connectionType",
                    "pricingModel",
                    "costPerCall",
                    "developerAddress",
                ],
            },
            InvocationRequest: {
                type: "object",
                description: "Payload for a tool invocation request. Shape is tool-specific — see the tool's schema via GET /api/tools/{namespace}.",
                additionalProperties: true,
                properties: {
                /** Tool-specific parameters, as defined by the tool's JSON Schema. */
                },
            },
            InvocationResult: {
                type: "object",
                properties: {
                    toolNamespace: { type: "string" },
                    toolName: { type: "string" },
                    agentId: { type: "string" },
                    status: {
                        type: "string",
                        enum: ["success", "failed"],
                    },
                    latencyMs: { type: "integer", description: "Round-trip latency in milliseconds" },
                    statusCode: { type: "integer", description: "HTTP status code returned by the downstream tool" },
                    error: { type: "string", nullable: true, description: "Error message if invocation failed" },
                    fee: {
                        type: "object",
                        description: "Platform take-rate. Collected only on successful delivery.",
                        properties: {
                            amountUsdc: { type: "number", description: "USDC actually collected (0 on failure or for free tools)" },
                            status: {
                                type: "string",
                                enum: ["collected", "not_collected", "none"],
                                description: "collected = settled on success; not_collected = premium tool failed, no charge; none = free tool",
                            },
                            note: { type: "string" },
                        },
                        required: ["amountUsdc", "status", "note"],
                    },
                    invokedAt: { type: "string", format: "date-time" },
                },
                required: [
                    "toolNamespace",
                    "toolName",
                    "agentId",
                    "status",
                    "latencyMs",
                    "statusCode",
                    "fee",
                    "invokedAt",
                ],
            },
            PaymentRequired: {
                type: "object",
                properties: {
                    error: { type: "string", enum: ["payment_required"] },
                    x402Version: { type: "integer", example: 2 },
                    accepts: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                scheme: { type: "string", enum: ["exact"] },
                                price: { type: "string" },
                                network: { type: "string" },
                                payTo: { type: "string" },
                                asset: { type: "string" },
                                maxTimeoutSeconds: { type: "integer" },
                                description: { type: "string" },
                            },
                        },
                    },
                    description: { type: "string" },
                },
                required: ["error", "accepts"],
            },
            Error: {
                type: "object",
                properties: {
                    error: { type: "string" },
                    message: { type: "string" },
                },
                required: ["error"],
            },
        },
    },
};
//# sourceMappingURL=openapi.js.map