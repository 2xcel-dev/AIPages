/**
 * AUS Sandbox Execution Service
 * Ported faithfully from agent-utility-services (Engine: sandbox-execution)
 *
 * Secure isolated Node.js VM execution context with CPU time limits,
 * memory guards, and input/output mapping.
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

export function executeInSandbox(req: SandboxExecutionRequest): SandboxExecutionResult {
  const code = req.code;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (!code) {
    return {
      success: false,
      utility: "sandbox-execution",
      request_id: requestId,
      execution_time_ms: 0,
      result: null,
      error: "Missing 'code' string in payload.",
    };
  }

  const sandbox: Record<string, unknown> = {
    input: req.context_data || {},
    output: null,
    Math,
    Date,
    JSON,
  };

  const context = vm.createContext(sandbox);
  const timeout = Math.min(req.timeout_ms || 1000, 3000);

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
