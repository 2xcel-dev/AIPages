/**
 * EVM Smart Contract Risk Auditor & Bytecode Scanner (Base Network)
 *
 * Scans EVM contract bytecode and interfaces for malicious backdoors,
 * honeypot logic, unverified proxies, hidden mint functions, and liquidity traps.
 */
export type ContractRiskLevel = "low" | "medium" | "high" | "critical";
export interface RugcheckRequest {
    contractAddress: string;
    chainId?: number;
    checkBytecodeOnly?: boolean;
}
export interface SecurityVulnerability {
    id: string;
    name: string;
    severity: ContractRiskLevel;
    description: string;
    detected: boolean;
}
export interface RugcheckResult {
    contractAddress: string;
    chainId: number;
    riskScore: number;
    riskLevel: ContractRiskLevel;
    isHoneypot: boolean;
    canMint: boolean;
    canBlacklist: boolean;
    isProxy: boolean;
    hasSelfDestruct: boolean;
    vulnerabilities: SecurityVulnerability[];
    summary: string;
    auditedAt: string;
}
/**
 * Scan smart contract address or bytecode for security anomalies.
 */
export declare function auditContractRisk(req: RugcheckRequest): RugcheckResult;
//# sourceMappingURL=rugcheck.d.ts.map