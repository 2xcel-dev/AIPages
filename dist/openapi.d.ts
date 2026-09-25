export declare const openapi: {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: {
        url: string;
        description: string;
    }[];
    paths: {
        "/health": {
            get: {
                summary: string;
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        status: {
                                            type: string;
                                            enum: string[];
                                        };
                                        store: {
                                            type: string;
                                            enum: string[];
                                        };
                                    };
                                    required: string[];
                                };
                            };
                        };
                    };
                };
            };
        };
        "/search": {
            get: {
                summary: string;
                description: string;
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        minimum?: undefined;
                        maximum?: undefined;
                        default?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        minimum: number;
                        maximum: number;
                        default: number;
                    };
                })[];
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        query: {
                                            type: string;
                                        };
                                        count: {
                                            type: string;
                                        };
                                        results: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                    required: string[];
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/openapi.json": {
            get: {
                summary: string;
                description: string;
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/tools": {
            get: {
                summary: string;
                description: string;
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum: number;
                        enum?: undefined;
                    };
                    description: string;
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        default: number;
                        minimum: number;
                        maximum?: undefined;
                        enum?: undefined;
                    };
                    description: string;
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum: string[];
                        default?: undefined;
                        minimum?: undefined;
                        maximum?: undefined;
                    };
                    description: string;
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        default?: undefined;
                        minimum?: undefined;
                        maximum?: undefined;
                        enum?: undefined;
                    };
                    description: string;
                })[];
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        total: {
                                            type: string;
                                        };
                                        count: {
                                            type: string;
                                        };
                                        limit: {
                                            type: string;
                                        };
                                        offset: {
                                            type: string;
                                        };
                                        tools: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                    required: string[];
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/tools/{namespace}": {
            get: {
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "404": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/tools": {
            get: {
                summary: string;
                description: string;
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum?: undefined;
                    };
                    description: string;
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum: string[];
                    };
                    description: string;
                })[];
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "text/html": {
                                schema: {
                                    type: string;
                                    description: string;
                                };
                            };
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        total: {
                                            type: string;
                                        };
                                        count: {
                                            type: string;
                                        };
                                        tools: {
                                            type: string;
                                            items: {
                                                $ref: string;
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        "/tools/{slug}": {
            get: {
                summary: string;
                description: string;
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum?: undefined;
                    };
                    description: string;
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum: string[];
                    };
                    description: string;
                })[];
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "text/html": {
                                schema: {
                                    type: string;
                                    description: string;
                                };
                            };
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "404": {
                        description: string;
                        content: {
                            "text/html": {
                                schema: {
                                    type: string;
                                    description: string;
                                };
                            };
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/tools/submit": {
            post: {
                summary: string;
                description: string;
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                $ref: string;
                            };
                        };
                    };
                };
                responses: {
                    "201": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "400": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/api/invoke/{namespace}": {
            post: {
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                headers: {
                    "X-Agent-ID": {
                        description: string;
                        schema: {
                            type: string;
                        };
                        required: boolean;
                    };
                    "X-Timestamp": {
                        description: string;
                        schema: {
                            type: string;
                        };
                    };
                    "X-Signature": {
                        description: string;
                        schema: {
                            type: string;
                        };
                    };
                    "X-EIP712-Signature": {
                        description: string;
                        schema: {
                            type: string;
                        };
                    };
                    "X-PAYMENT": {
                        description: string;
                        schema: {
                            type: string;
                        };
                    };
                };
                requestBody: {
                    required: boolean;
                    content: {
                        "application/json": {
                            schema: {
                                $ref: string;
                            };
                        };
                    };
                };
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "400": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "401": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "402": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "404": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "422": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "413": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "423": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "429": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    "502": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
                security: {
                    x402: never[];
                }[];
            };
        };
    };
    components: {
        securitySchemes: {
            x402: {
                type: string;
                in: string;
                name: string;
                description: string;
            };
        };
        schemas: {
            SearchResult: {
                type: string;
                properties: {
                    namespace: {
                        type: string;
                    };
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
                    healthStatus: {
                        type: string;
                        enum: string[];
                    };
                    lastChecked: {
                        type: string;
                        format: string;
                        nullable: boolean;
                        description: string;
                    };
                    failureReason: {
                        type: string;
                        nullable: boolean;
                        description: string;
                    };
                    reliability: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    score: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
            ToolDetail: {
                type: string;
                properties: {
                    namespace: {
                        type: string;
                    };
                    name: {
                        type: string;
                    };
                    description: {
                        type: string;
                    };
                    schema: {
                        $ref: string;
                    };
                    connectionType: {
                        type: string;
                        enum: string[];
                    };
                    endpointUrl: {
                        type: string;
                        nullable: boolean;
                    };
                    healthStatus: {
                        type: string;
                        enum: string[];
                    };
                    lastChecked: {
                        type: string;
                        format: string;
                        nullable: boolean;
                        description: string;
                    };
                    failureReason: {
                        type: string;
                        nullable: boolean;
                        description: string;
                    };
                    reliability: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    health: {
                        type: string;
                        properties: {
                            status: {
                                type: string;
                                enum: string[];
                            };
                            lastChecked: {
                                type: string;
                                format: string;
                                nullable: boolean;
                            };
                            reliability: {
                                type: string;
                                enum: string[];
                            };
                            failureReason: {
                                type: string;
                                nullable: boolean;
                            };
                        };
                    };
                    pricing: {
                        type: string;
                        properties: {
                            model: {
                                type: string;
                                enum: string[];
                            };
                            costPerCall: {
                                type: string;
                                format: string;
                            };
                        };
                        required: string[];
                    };
                    developer: {
                        type: string;
                        properties: {
                            address: {
                                type: string;
                            };
                            listingFeePaid: {
                                type: string;
                            };
                            listingFeeAmount: {
                                type: string;
                            };
                        };
                        required: string[];
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                    schemaSource: {
                        type: string;
                        nullable: boolean;
                        description: string;
                    };
                };
                required: string[];
            };
            ToolSchema: {
                type: string;
                description: string;
                properties: {
                    type: {
                        type: string;
                    };
                    properties: {
                        type: string;
                        additionalProperties: boolean;
                    };
                    required: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                };
                additionalProperties: boolean;
            };
            ToolSubmission: {
                type: string;
                properties: {
                    name: {
                        type: string;
                        minLength: number;
                    };
                    description: {
                        type: string;
                        minLength: number;
                    };
                    schema: {
                        $ref: string;
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
                        format: string;
                        minimum: number;
                    };
                    developerAddress: {
                        type: string;
                        minLength: number;
                    };
                };
                required: string[];
            };
            InvocationRequest: {
                type: string;
                description: string;
                additionalProperties: boolean;
                properties: {};
            };
            InvocationResult: {
                type: string;
                properties: {
                    toolNamespace: {
                        type: string;
                    };
                    toolName: {
                        type: string;
                    };
                    agentId: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                    latencyMs: {
                        type: string;
                        description: string;
                    };
                    statusCode: {
                        type: string;
                        description: string;
                    };
                    error: {
                        type: string;
                        nullable: boolean;
                        description: string;
                    };
                    fee: {
                        type: string;
                        description: string;
                        properties: {
                            amountUsdc: {
                                type: string;
                                description: string;
                            };
                            status: {
                                type: string;
                                enum: string[];
                                description: string;
                            };
                            note: {
                                type: string;
                            };
                        };
                        required: string[];
                    };
                    invokedAt: {
                        type: string;
                        format: string;
                    };
                };
                required: string[];
            };
            PaymentRequired: {
                type: string;
                properties: {
                    error: {
                        type: string;
                        enum: string[];
                    };
                    x402Version: {
                        type: string;
                        example: number;
                    };
                    accepts: {
                        type: string;
                        items: {
                            type: string;
                            properties: {
                                scheme: {
                                    type: string;
                                    enum: string[];
                                };
                                price: {
                                    type: string;
                                };
                                network: {
                                    type: string;
                                };
                                payTo: {
                                    type: string;
                                };
                                asset: {
                                    type: string;
                                };
                                maxTimeoutSeconds: {
                                    type: string;
                                };
                                description: {
                                    type: string;
                                };
                            };
                        };
                    };
                    description: {
                        type: string;
                    };
                };
                required: string[];
            };
            Error: {
                type: string;
                properties: {
                    error: {
                        type: string;
                    };
                    message: {
                        type: string;
                    };
                };
                required: string[];
            };
        };
    };
};
//# sourceMappingURL=openapi.d.ts.map