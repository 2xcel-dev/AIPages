import type { AIPagesClientOptions, ToolRecord, InvokeOptions, InvokeResult } from "./types.js";
export declare class AIPagesBudgetExceededError extends Error {
    constructor(message: string);
}
export declare class AIPagesPaymentError extends Error {
    constructor(message: string);
}
export declare class AIPagesClient {
    private baseUrl;
    private agentId;
    private walletPrivateKey?;
    private maxCostPerCallUsdc;
    private budgetCapUsdc;
    private timeoutMs;
    private customPaymentSigner?;
    private cumulativeSpentUsdc;
    constructor(options?: AIPagesClientOptions);
    /**
     * Current cumulative USDC spent by this client session.
     */
    get totalSpentUsdc(): number;
    /**
     * Semantic vector search across registered MCP tools and AUS micro-utilities.
     *
     * @param query Natural language task or intent description
     * @param limit Maximum results (default: 5)
     */
    search(query: string, limit?: number): Promise<ToolRecord[]>;
    /**
     * Fetch details and schema for a specific tool by namespace or slug.
     */
    getTool(namespaceOrSlug: string): Promise<ToolRecord>;
    /**
     * Fetch all first-party canonical AUS micro-utilities.
     */
    listCanonical(): Promise<ToolRecord[]>;
    /**
     * Execute a tool by namespace or slug.
     * If the tool requires payment (HTTP 402), this method automatically handles:
     * 1. Budget verification (maxCostPerCallUsdc, budgetCapUsdc).
     * 2. Payment proof generation via private key or custom signer.
     * 3. Seamless retry and verified output delivery.
     */
    invoke<T = unknown>(namespaceOrSlug: string, payload: Record<string, unknown>, options?: InvokeOptions): Promise<InvokeResult<T>>;
    /**
     * Internal helper to sign transaction or payment voucher on Base Mainnet.
     */
    private signPaymentWithWallet;
}
//# sourceMappingURL=client.d.ts.map