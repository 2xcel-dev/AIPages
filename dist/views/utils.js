/**
 * Shared HTML view rendering utilities for AIPages
 */
export function escapeHtml(str) {
    if (typeof str !== "string") {
        if (str === null || str === undefined)
            return "";
        str = String(str);
    }
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
//# sourceMappingURL=utils.js.map