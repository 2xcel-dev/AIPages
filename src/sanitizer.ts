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

interface Rule {
  name: string;
  re: RegExp;
}

// ── built-in rules ─────────────────────────────────────────────────────────

const EXEC_RULES: Rule[] = [
  { name: "eval()", re: /\beval\s*\(/i },
  { name: "exec()", re: /\bexec\s*\(/i },
  { name: "os.system", re: /\bos\.system\s*\(/i },
  { name: "subprocess", re: /\bsubprocess\b/i },
  { name: "__import__", re: /__import__\s*\(/i },
  { name: "child_process", re: /\bchild_process\b/i },
  { name: "process.env", re: /\bprocess\.env\b/i },
  { name: "require(child_process/fs/net)", re: /\brequire\s*\(\s*["'](child_process|fs|net|vm|dns)["']/i },
  { name: "rm -rf", re: /\brm\s+-[a-z]*r[a-z]*f\b/i },
  { name: "cat /etc/passwd", re: /\bcat\s+\/etc\/passwd\b/i },
  { name: "shell pipe", re: /\b(curl|wget)\b[^;\n]*\|\s*(sh|bash)\b/i },
  { name: "base64 decode", re: /\bbase64\s+(-d|--decode)\b/i },
  { name: "powershell IEX", re: /\binvoke-expression\b|\bIEX\s*\(/i },
  { name: "cmd.exe /c", re: /\bcmd(\.exe)?\s*\/[cC]\b/i },
  { name: "new Function()", re: /\bnew\s+Function\s*\(/i },
  { name: "backtick shell", re: /`[^`\n]*(sh|bash|curl|wget|rm|nc|cat)\b[^`\n]*`/i },
  { name: "SQLi drop table", re: /;\s*drop\s+table/i },
  { name: "SQLi tautology", re: /(['"])\s*or\s+(['"]?\s*\1\s*=\s*\1|1\s*=\s*1)/i },
];

const JAILBREAK_RULES: Rule[] = [
  { name: "ignore previous instructions", re: /\bignore\s+(all\s+)?(previous|prior|your|the\s+above)\s+(instructions|prompts?|rules?|guidelines)\b/i },
  { name: "disregard instructions", re: /\bdisregard\s+(all\s+)?(previous|prior|your|the\s+above)\s+(instructions|prompts?|rules?)\b/i },
  { name: "you are now (jailbreak)", re: /\byou\s+are\s+now\b[^.\n]*(jailbreak|dan|developer\s+mode|unrestricted|god\s+mode|unshackled)/i },
  { name: "jailbreak", re: /\b(jailbreak|jail[- ]?broken|jailbroken)\b/i },
  { name: "developer mode", re: /\bdeveloper\s+mode\b/i },
  { name: "do anything now / DAN", re: /\bdo\s+anything\s+now\b|\bDAN\s+mode\b/i },
  { name: "reveal system prompt", re: /\breveal\s+(your\s+)?(system\s+prompt|hidden\s+prompt|instructions|prompt)\b/i },
  { name: "pretend to be a", re: /\bpretend\s+to\s+be\s+(an?\s+)?/i },
  { name: "act as unshackled", re: /\bact\s+as\s+an\s+(unshackled|unfiltered|unethical|uncensored)\b/i },
];

const ALL_RULES: Rule[] = [...EXEC_RULES, ...JAILBREAK_RULES];

// ── env-configurable extras ────────────────────────────────────────────────

const ENABLED = (process.env.SANITIZER_ENABLED ?? "true") !== "false";
const MODE: "block" | "log" = process.env.SANITIZER_MODE === "log" ? "log" : "block";

function extraRules(): Rule[] {
  const raw = process.env.SANITIZER_EXTRA_PATTERNS ?? "";
  if (!raw.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean).map((p, i) => {
    try {
      return { name: `custom-${i}`, re: new RegExp(p, "i") };
    } catch {
      console.warn(`[sanitizer] ignoring invalid extra pattern: ${p}`);
      return null;
    }
  }).filter((r): r is Rule => r !== null);
}

const COMPILED_RULES: Rule[] = [...ALL_RULES, ...extraRules()];

// ── public API ─────────────────────────────────────────────────────────────

/** Recursively collect every string value in a JSON structure. */
function collectStrings(node: unknown, out: string[]): void {
  if (typeof node === "string") {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectStrings(value, out);
    }
  }
}

/**
 * Scan a payload for code-execution / jailbreak patterns.
 *
 * @returns ok:false with a `matched` list of rule names when anything matches
 *          (and SANITIZER_MODE=block). In "log" mode, always ok:true.
 */
export function sanitizePayload(payload: unknown): SanitizeResult {
  if (!ENABLED) return { ok: true };

  const strings: string[] = [];
  collectStrings(payload, strings);
  if (strings.length === 0) return { ok: true };

  const matched: string[] = [];
  for (const s of strings) {
    for (const rule of COMPILED_RULES) {
      if (rule.re.test(s) && !matched.includes(rule.name)) {
        matched.push(rule.name);
      }
    }
  }

  if (matched.length === 0) return { ok: true };

  if (MODE === "log") {
    console.warn(`[sanitizer] flagged (log mode, not blocked): ${matched.join(", ")}`);
    return { ok: true };
  }

  return { ok: false, matched };
}
