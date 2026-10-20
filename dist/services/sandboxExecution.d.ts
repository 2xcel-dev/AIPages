export interface SandboxExecutionRequest {
    code: string;
    context_data?: Record<string, unknown>;
    timeout_ms?: number;
}
export interface SandboxExecutionResult {
    success: boolean;
    utility: "sandbox-execution";
    request_id: string;
    execution_time_ms: number;
    result: unknown;
    error?: string;
}
export declare function executeInSandbox(req: SandboxExecutionRequest): SandboxExecutionResult;
//# sourceMappingURL=sandboxExecution.d.ts.map