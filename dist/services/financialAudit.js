/**
 * AUS Financial Audit Service
 * Ported faithfully from agent-utility-services (Engine: financial-audit)
 * Hardened with batch limits (DoS prevention), non-negative finite amount validation,
 * and anomaly/risk boundary enforcement.
 */
const MAX_TRANSACTION_BATCH = 10_000;
export function auditFinancialTransactions(req) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rawTransactions = req?.transactions;
    if (!Array.isArray(rawTransactions)) {
        return {
            success: false,
            utility: "financial-audit",
            request_id: requestId,
            error: "Invalid payload: 'transactions' must be a valid array.",
        };
    }
    if (rawTransactions.length > MAX_TRANSACTION_BATCH) {
        return {
            success: false,
            utility: "financial-audit",
            request_id: requestId,
            error: `Batch size exceeds maximum limit of ${MAX_TRANSACTION_BATCH} transactions.`,
        };
    }
    const rawThreshold = req.threshold;
    const riskLimit = typeof rawThreshold === "number" && Number.isFinite(rawThreshold) && rawThreshold > 0
        ? rawThreshold
        : 10000;
    let totalVolume = 0;
    let flaggedCount = 0;
    const auditedTransactions = [];
    for (let i = 0; i < rawTransactions.length; i++) {
        const tx = rawTransactions[i];
        if (!tx || typeof tx !== "object") {
            continue;
        }
        const id = String(tx.id || `tx_${i}`);
        const rawAmt = Number(tx.amount);
        const amt = Number.isFinite(rawAmt) && rawAmt >= 0 ? rawAmt : 0;
        totalVolume += amt;
        const rawScore = Number(tx.risk_score);
        const score = Number.isFinite(rawScore) ? Math.min(Math.max(rawScore, 0), 1) : undefined;
        const isFlagged = amt > riskLimit || (score !== undefined && score > 0.7);
        if (isFlagged)
            flaggedCount++;
        auditedTransactions.push({
            ...tx,
            id,
            amount: amt,
            risk_score: score,
            audited: true,
            flagged: isFlagged,
        });
    }
    const totalAnalyzed = auditedTransactions.length;
    const overallRiskScore = totalAnalyzed > 0 ? Number((flaggedCount / totalAnalyzed).toFixed(2)) : 0;
    return {
        success: true,
        utility: "financial-audit",
        request_id: requestId,
        audit_summary: {
            total_items_analyzed: totalAnalyzed,
            total_volume: Number(totalVolume.toFixed(2)),
            flagged_transactions: flaggedCount,
            risk_index: overallRiskScore,
            status: overallRiskScore > 0.3 ? "HIGH_RISK" : "PASSED",
        },
        data: auditedTransactions,
    };
}
//# sourceMappingURL=financialAudit.js.map