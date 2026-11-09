/**
 * AUS Schema Sanitizer Service
 * Ported faithfully from agent-utility-services (Engine: schema-sanitizer)
 * Hardened with prototype pollution defense, recursion depth bounding,
 * circular reference cycle detection, and array support.
 */
const MAX_RECURSION_DEPTH = 20;
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
export function sanitizeSchema(req) {
    const payload = req.data || {};
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        return {
            success: false,
            utility: "schema-sanitizer",
            request_id: requestId,
            sanitized_at: new Date().toISOString(),
            analysis: {
                original_keys_count: 0,
                sanitized_keys: [],
            },
            data: {},
            error: "Invalid input: 'data' must be a valid non-null JSON object.",
        };
    }
    const maskFields = new Set((req.rules?.maskFields || []).map((f) => f.toLowerCase().trim()));
    const stripHtml = req.rules?.stripHtml !== false;
    const seenObjects = new WeakSet();
    const cleanValue = (val, depth) => {
        if (depth > MAX_RECURSION_DEPTH) {
            return "[Max Depth Reached]";
        }
        if (typeof val === "string") {
            return stripHtml ? val.replace(/<[^>]*>/gm, "").trim() : val.trim();
        }
        if (Array.isArray(val)) {
            return val.map((item) => cleanValue(item, depth + 1));
        }
        if (typeof val === "object" && val !== null) {
            if (seenObjects.has(val)) {
                return "[Circular Reference]";
            }
            seenObjects.add(val);
            return cleanObject(val, depth + 1);
        }
        return val;
    };
    const cleanObject = (obj, depth = 0) => {
        if (depth > MAX_RECURSION_DEPTH) {
            return {};
        }
        const cleaned = Object.create(null);
        for (const [key, val] of Object.entries(obj)) {
            if (DANGEROUS_KEYS.has(key)) {
                continue; // Block prototype pollution vectors
            }
            const sanitizedKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
            if (!sanitizedKey || DANGEROUS_KEYS.has(sanitizedKey)) {
                continue;
            }
            if (maskFields.has(sanitizedKey)) {
                cleaned[sanitizedKey] = "********";
            }
            else {
                cleaned[sanitizedKey] = cleanValue(val, depth);
            }
        }
        return cleaned;
    };
    try {
        const sanitized = cleanObject(payload);
        return {
            success: true,
            utility: "schema-sanitizer",
            request_id: requestId,
            sanitized_at: new Date().toISOString(),
            analysis: {
                original_keys_count: Object.keys(payload).length,
                sanitized_keys: Object.keys(sanitized),
            },
            data: { ...sanitized },
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            utility: "schema-sanitizer",
            request_id: requestId,
            sanitized_at: new Date().toISOString(),
            analysis: {
                original_keys_count: 0,
                sanitized_keys: [],
            },
            data: {},
            error: `Sanitization error: ${message}`,
        };
    }
}
//# sourceMappingURL=schemaSanitizer.js.map