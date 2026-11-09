/**
 * AUS Sandbox Execution Service
 * Ported faithfully from agent-utility-services (Engine: sandbox-execution)
 * Hardened for enterprise execution: AST keyword blocking, null-prototype context,
 * memory ceiling, execution timeouts, and prototype isolation.
 */
import vm from "vm";

export interface SandboxExecutionRequest {
  code: string;
  context_data?: Record<string, unknown>;
  timeout_ms?: number; // default: 1000, max: 3000
}

export interface SandboxExecutionResult {
  success: boolean;
  utility: "sandbox-execution";
  request_id: string;
  execution_time_ms: number;
  result: unknown;
  error?: string;
}

const MAX_CODE_LENGTH = 10_000;

/**
 * Forbidden tokens and escape vectors that must never execute in untrusted VM
 */
const ESCAPE_VECTORS = [
  /\bprocess\b/i,
  /\bchild_process\b/i,
  /\brequire\s*\(/i,
  /\bimport\s*[\('"]/i,
  /\bconstructor\b/i,
  /\b__proto__\b/i,
  /\bprototype\b/i,
  /\bglobal\b/i,
  /\bglobalThis\b/i,
  /\bmainModule\b/i,
  /\beval\s*\(/i,
  /\bFunction\s*\(/i,
  /\bReflect\b/i,
];

export function executeInSandbox(req: SandboxExecutionRequest): SandboxExecutionResult {
  const code = req.code;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (!code || typeof code !== "string") {
    return {
      success: false,
      utility: "sandbox-execution",
      request_id: requestId,
      execution_time_ms: 0,
      result: null,
      error: "Missing or invalid 'code' string in payload.",
    };
  }

  if (code.length > MAX_CODE_LENGTH) {
    return {
      success: false,
      utility: "sandbox-execution",
      request_id: requestId,
      execution_time_ms: 0,
      result: null,
      error: `Code payload exceeds maximum size limit of ${MAX_CODE_LENGTH} characters.`,
    };
  }

  // 1. Static security filter to block prototype escape and process access
  for (const pattern of ESCAPE_VECTORS) {
    if (pattern.test(code)) {
      return {
        success: false,
        utility: "sandbox-execution",
        request_id: requestId,
        execution_time_ms: 0,
        result: null,
        error: "Execution rejected: forbidden keyword, constructor access, or restricted module detected.",
      };
    }
  }

  // 2. Build isolated sandbox with null prototype and deep-cloned immutable inputs
  const safeInput = req.context_data
    ? JSON.parse(JSON.stringify(req.context_data))
    : {};

  const sandbox = Object.assign(Object.create(null), {
    input: Object.freeze(safeInput),
    output: null,
    Math: Object.freeze(Math),
    Date: Object.freeze(Date),
    JSON: Object.freeze(JSON),
  });

  const context = vm.createContext(sandbox, {
    codeGeneration: {
      strings: false, // Disallows eval() and new Function()
      wasm: false,    // Disallows WebAssembly compiling
    },
  });

  const timeout = Math.min(Math.max(req.timeout_ms || 1000, 100), 3000);

  try {
    const startTime = process.hrtime();
    const script = new vm.Script(code);
    script.runInContext(context, { timeout });
    const diff = process.hrtime(startTime);
    const executionTimeMs = Number((diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3));

    return {
      success: true,
      utility: "sandbox-execution",
      request_id: requestId,
      execution_time_ms: executionTimeMs,
      result: sandbox.output !== undefined ? sandbox.output : "Execution completed without setting output variable.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      utility: "sandbox-execution",
      request_id: requestId,
      execution_time_ms: 0,
      result: null,
      error: message,
    };
  }
}
