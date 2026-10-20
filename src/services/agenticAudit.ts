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

export function auditAgenticWorkflow(req: AgenticAuditRequest): AgenticAuditResult {
  const steps = req.steps || [];
  const budgetLimit = req.budget_limit;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let totalExecutionCost = 0;
  let failedSteps = 0;
  const loopMap: Record<string, number> = {};
  let potentialLoops = 0;

  steps.forEach((step) => {
    totalExecutionCost += step.cost || 0;
    if (step.status === "FAILED" || step.error) failedSteps++;
    if (step.action) {
      loopMap[step.action] = (loopMap[step.action] || 0) + 1;
      if (loopMap[step.action] > 2) potentialLoops++;
    }
  });

  const withinBudget = budgetLimit !== undefined ? totalExecutionCost <= budgetLimit : null;
  const healthScore = steps.length > 0
    ? Number((((steps.length - failedSteps) / steps.length) * (potentialLoops > 0 ? 0.7 : 1.0)).toFixed(2))
    : 1.0;

  return {
    success: true,
    utility: "agentic-audit",
    request_id: requestId,
    trace_summary: {
      total_steps: steps.length,
      failed_steps: failedSteps,
      potential_action_loops: potentialLoops,
      cumulative_cost: Number(totalExecutionCost.toFixed(4)),
      budget_limit: budgetLimit || null,
      within_budget: withinBudget,
      health_score: healthScore,
    },
  };
}
