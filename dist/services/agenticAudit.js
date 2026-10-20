/**
 * AUS Agentic Audit Service
 * Ported faithfully from agent-utility-services (Engine: agentic-audit)
 *
 * Autonomous agent workflow trace auditing, execution step health scoring,
 * circular action loop detection, and budget limit enforcement.
 */
export function auditAgenticWorkflow(req) {
    const steps = req.steps || [];
    const budgetLimit = req.budget_limit;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let totalExecutionCost = 0;
    let failedSteps = 0;
    const loopMap = {};
    let potentialLoops = 0;
    steps.forEach((step) => {
        totalExecutionCost += step.cost || 0;
        if (step.status === "FAILED" || step.error)
            failedSteps++;
        if (step.action) {
            loopMap[step.action] = (loopMap[step.action] || 0) + 1;
            if (loopMap[step.action] > 2)
                potentialLoops++;
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
//# sourceMappingURL=agenticAudit.js.map