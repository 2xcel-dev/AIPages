/**
 * Secure Micro-VM Code Execution Service (Python & TypeScript)
 *
 * Provides containerized/VM execution harness for autonomous agent code blocks
 * with memory ceilings, CPU timeouts, and AST/regex security inspection.
 */
export type SupportedRuntime = "python" | "typescript" | "javascript";
export type ExecutionStatus = "success" | "error" | "timeout" | "rejected";
export interface SandboxRunnerRequest {
    runtime: SupportedRuntime;
    code: string;
    entrypoint?: string;
    args?: string[];
    timeoutMs?: number;
    memoryLimitMb?: number;
    allowNetwork?: boolean;
}
export interface SandboxRunnerResult {
    status: ExecutionStatus;
    exitCode: number;
    stdout: string;
    stderr: string;
    executionTimeMs: number;
    memoryUsedMb: number;
    runtime: SupportedRuntime;
    securityChecksPassed: boolean;
    executedAt: string;
}
/**
 * Execute code inside isolated micro-VM envelope.
 */
export declare function runInSandbox(req: SandboxRunnerRequest): Promise<SandboxRunnerResult>;
//# sourceMappingURL=sandboxRunner.d.ts.map