import type { ToolSchema } from "./types.js";
export interface SchemaValidationResult {
    ok: boolean;
    errors?: string[];
}
/**
 * Validate `payload` against the tool's registered schema.
 *
 * A schema with no `type`/`properties`/`required`/`$ref`/`items` (i.e. an
 * effectively-empty schema) is treated as "accept any object" rather than
 * rejected — matching how the crawler/registry treats a schema-less tool.
 */
export declare function validatePayload(schema: ToolSchema | undefined, payload: unknown): SchemaValidationResult;
//# sourceMappingURL=schema-validate.d.ts.map