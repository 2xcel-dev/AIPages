/**
 * Predictive Base Gas Routing & Fee Optimization Engine
 *
 * Analyzes L2 gas telemetry on Base Mainnet, evaluates L1 rollup calldata/blob
 * congestion, and computes predictive EIP-1559 fee strategies for agentic transactions.
 */
export type GasUrgency = "immediate" | "standard" | "economy";
export type CongestionLevel = "low" | "normal" | "elevated" | "congested";
export interface GasOptimizerRequest {
    urgency?: GasUrgency;
    estimatedGasUnits?: number;
    includeL1DataFee?: boolean;
}
export interface GasFeeTier {
    urgency: GasUrgency;
    maxFeePerGasGwei: number;
    maxPriorityFeePerGasGwei: number;
    estimatedWaitBlocks: number;
    estimatedCostEth: string;
    estimatedCostUsd: string;
}
export interface GasOptimizerResult {
    network: string;
    chainId: number;
    currentBaseFeeGwei: number;
    congestion: CongestionLevel;
    recommended: GasFeeTier;
    tiers: Record<GasUrgency, GasFeeTier>;
    l1BlobFeeGwei: number;
    optimizedAt: string;
}
/**
 * Compute optimal gas routing strategy on Base L2.
 */
export declare function estimateOptimalGas(req?: GasOptimizerRequest): GasOptimizerResult;
//# sourceMappingURL=gasOptimizer.d.ts.map