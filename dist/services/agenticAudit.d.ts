/**
 * AUS Agentic Audit Service
 * Ported faithfully from agent-utility-services (Engine: agentic-audit)
 *
 * Autonomous agent workflow trace auditing, execution step health scoring,
 * circular action loop detection, and budget limit enforcement.
 */
export interface WorkflowStep {
    step: number;
    action: string;
    status?: string;
    cost?: number;
    latency_ms?: number;
    error?: string;
}
export interface AgenticAuditRequest {
    steps: WorkflowStep[];
    budget_limit?: number;
}
export interface AgenticAuditResult {
    success: boolean;
    utility: "agentic-audit";
    request_id: string;
    trace_summary: {
        total_steps: number;
        failed_steps: number;
        potential_action_loops: number;
        cumulative_cost: number;
        budget_limit: number | null;
        within_budget: boolean | null;
        health_score: number;
    };
}
export declare function auditAgenticWorkflow(req: AgenticAuditRequest): AgenticAuditResult;
//# sourceMappingURL=agenticAudit.d.ts.map