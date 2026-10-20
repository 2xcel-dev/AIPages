/**
 * AUS Schema Sanitizer Service
 * Ported faithfully from agent-utility-services (Engine: schema-sanitizer)
 *
 * Enterprise input sanitization, XSS/HTML tag stripping, key normalization,
 * and sensitive field masking for structured JSON data.
 */
export interface SchemaSanitizerRequest {
    data: Record<string, unknown>;
    rules?: {
        stripHtml?: boolean;
        maskFields?: string[];
    };
}
export interface SchemaSanitizerResult {
    success: boolean;
    utility: "schema-sanitizer";
    request_id: string;
    sanitized_at: string;
    analysis: {
        original_keys_count: number;
        sanitized_keys: string[];
    };
    data: Record<string, unknown>;
}
export declare function sanitizeSchema(req: SchemaSanitizerRequest): SchemaSanitizerResult;
//# sourceMappingURL=schemaSanitizer.d.ts.map