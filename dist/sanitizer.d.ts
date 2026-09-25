/**
 * Prompt-injection & payload sanitization — a lightweight guard that scans
 * invocation payloads for malicious code-execution patterns and jailbreak
 * strings before they are proxied to a downstream tool.
 *
 * Because agents pass arbitrary JSON and natural-language prompts through the
 * gateway, this walks the full payload and flags anything that looks like:
 *
 *   - code execution / shell escape (eval, exec, subprocess, os.system,
 *     child_process, shell pipes, base64 -d, rm -rf, PowerShell IEX, …)
 *   - prompt-injection / jailbreak ("ignore previous instructions",
 *     "developer mode", "DAN", "reveal your system prompt", …)
 *
 * It is deliberately conservative: the default pattern set targets
 * clear-cut abuse. Configure via env:
 *   SANITIZER_ENABLED=true|false         (default true)
 *   SANITIZER_MODE=block|log             (default block; log = flag but pass)
 *   SANITIZER_EXTRA_PATTERNS=<regex,regex,...>   (append caller-specific rules)
 *
 * The scan is string-based and cheap — it does NOT execute or evaluate anything.
 */
export interface SanitizeResult {
    ok: boolean;
    matched?: string[];
}
/**
 * Scan a payload for code-execution / jailbreak patterns.
 *
 * @returns ok:false with a `matched` list of rule names when anything matches
 *          (and SANITIZER_MODE=block). In "log" mode, always ok:true.
 */
export declare function sanitizePayload(payload: unknown): SanitizeResult;
//# sourceMappingURL=sanitizer.d.ts.map