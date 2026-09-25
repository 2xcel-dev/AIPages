/**
 * Schema validation gate — validates an invocation payload against the tool's
 * registered JSON Schema before anything is proxied downstream.
 *
 * Uses Ajv (Draft-07/2019/2020/2026 as available) with:
 *   - strict: false     — manifests may carry non-JSON-Schema keywords
 *                        (x-* extensions, examples, etc.); don't hard-fail.
 *   - allErrors: true   — collect every violation for a useful 400 response.
 *   - no coercion       — types are checked strictly; never mutate input.
 *
 * Compiled validators are cached per schema shape so hot paths don't recompile.
 */
import Ajv from "ajv";
const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: false, removeAdditional: false });
const cache = new Map();
const MAX_CACHE = 1000;
function compile(schema) {
    const key = JSON.stringify(schema);
    let fn = cache.get(key);
    if (!fn) {
        fn = ajv.compile(schema);
        if (cache.size >= MAX_CACHE)
            cache.clear();
        cache.set(key, fn);
    }
    return fn;
}
/**
 * Validate `payload` against the tool's registered schema.
 *
 * A schema with no `type`/`properties`/`required`/`$ref`/`items` (i.e. an
 * effectively-empty schema) is treated as "accept any object" rather than
 * rejected — matching how the crawler/registry treats a schema-less tool.
 */
export function validatePayload(schema, payload) {
    if (!schema)
        return { ok: true };
    // Empty schema → no constraints to enforce.
    const hasShape = typeof schema.type === "string" ||
        schema.properties ||
        schema.required ||
        schema.$ref ||
        schema.items ||
        schema.anyOf ||
        schema.oneOf ||
        schema.allOf;
    if (!hasShape)
        return { ok: true };
    let fn;
    try {
        fn = compile(schema);
    }
    catch (err) {
        // Malformed schema (shouldn't happen for authoritative manifests) — fail
        // closed rather than proxy unvalidated input.
        return { ok: false, errors: [`tool schema is invalid: ${err?.message ?? String(err)}`] };
    }
    const valid = fn(payload);
    if (valid)
        return { ok: true };
    const errors = (fn.errors ?? []).map(formatError);
    return { ok: false, errors };
}
function formatError(e) {
    const path = e.instancePath || "/";
    if (e.keyword === "required") {
        return `${path} missing required: ${e.params.missingProperty}`;
    }
    if (e.keyword === "type") {
        return `${path} must be ${e.params.type}`;
    }
    if (e.keyword === "additionalProperties") {
        return `${path} unexpected field: ${e.params.additionalProperty}`;
    }
    if (e.keyword === "enum") {
        return `${path} must be one of: ${e.params.allowedValues?.join(", ")}`;
    }
    return `${path} ${e.message ?? e.keyword}`;
}
//# sourceMappingURL=schema-validate.js.map