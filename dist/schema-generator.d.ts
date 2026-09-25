import type { ToolSchema } from "./types.js";
/** Result from Gemini schema generation */
export interface SchemaGenerationResult {
    /** Generated JSON Schema for the tool's input */
    schema: ToolSchema;
    /** Confidence score (0-1) */
    confidence?: number;
}
/**
 * Use Gemini to generate a JSON Schema from a tool description.
 * Falls back to a minimal empty schema on failure or when no API key is set.
 *
 * Uses Gemini structured outputs (responseSchema + responseMimeType) to
 * guarantee the response is valid JSON. The "schema" field is returned as
 * a stringified JSON Schema which we parse on the client — this avoids
 * Gemini's `additionalProperties` limitation which doesn't support
 * dynamic property names in nested objects.
 */
export declare function generateToolSchema(toolName: string, description: string): Promise<SchemaGenerationResult>;
/**
 * Generate a schema URL for an auto-generated schema.
 */
export declare function generatedSchemaUrl(namespace: string): string;
//# sourceMappingURL=schema-generator.d.ts.map