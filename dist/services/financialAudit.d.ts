/**
 * AUS Financial Audit Service
 * Ported faithfully from agent-utility-services (Engine: financial-audit)
 * Hardened with batch limits (DoS prevention), non-negative finite amount validation,
 * and anomaly/risk boundary enforcement.
 */
export interface TransactionRecord {
    id: string;
    amount: number;
    type?: "credit" | "debit";
    category?: string;
    risk_score?: number;
    [key: string]: unknown;
}
export interface FinancialAuditRequest {
    transactions: TransactionRecord[];
    threshold?: number;
}
export interface AuditedTransaction extends TransactionRecord {
    audited: boolean;
    flagged: boolean;
}
export interface FinancialAuditResult {
    success: boolean;
    utility: "financial-audit";
    request_id: string;
    audit_summary?: {
        total_items_analyzed: number;
        total_volume: number;
        flagged_transactions: number;
        risk_index: number;
        status: "HIGH_RISK" | "PASSED";
    };
    data?: AuditedTransaction[];
    error?: string;
}
export declare function auditFinancialTransactions(req: FinancialAuditRequest): FinancialAuditResult;
//# sourceMappingURL=financialAudit.d.ts.map