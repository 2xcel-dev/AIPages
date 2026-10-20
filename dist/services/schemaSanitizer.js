/**
 * AUS Schema Sanitizer Service
 * Ported faithfully from agent-utility-services (Engine: schema-sanitizer)
 *
 * Enterprise input sanitization, XSS/HTML tag stripping, key normalization,
 * and sensitive field masking for structured JSON data.
 */
export function sanitizeSchema(req) {
    const payload = req.data || {};
    const maskFields = new Set((req.rules?.maskFields || []).map((f) => f.toLowerCase()));
    const stripHtml = req.rules?.stripHtml !== false;
    const cleanObject = (obj) => {
        const cleaned = {};
        for (const [key, val] of Object.entries(obj)) {
            const sanitizedKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
            if (maskFields.has(sanitizedKey)) {
                cleaned[sanitizedKey] = "********";
            }
            else if (typeof val === "string") {
                cleaned[sanitizedKey] = stripHtml ? val.replace(/<[^>]*>?/gm, "").trim() : val.trim();
            }
            else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
                cleaned[sanitizedKey] = cleanObject(val);
            }
            else {
                cleaned[sanitizedKey] = val;
            }
        }
        return cleaned;
    };
    const sanitized = cleanObject(payload);
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
        success: true,
        utility: "schema-sanitizer",
        request_id: requestId,
        sanitized_at: new Date().toISOString(),
        analysis: {
            original_keys_count: Object.keys(payload).length,
            sanitized_keys: Object.keys(sanitized),
        },
        data: sanitized,
    };
}
//# sourceMappingURL=schemaSanitizer.js.map