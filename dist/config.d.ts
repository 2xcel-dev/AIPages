/**
 * Environment configuration for AIPages backend.
 * All secrets live in .env (gitignored); .env.example documents the schema.
 */
import "dotenv/config";
export declare const config: {
    readonly port: number;
    readonly MONGODB_URI: string | null;
    readonly VECTOR_INDEX_NAME: string;
    readonly geminiApiKey: string | null;
    readonly geminiEmbeddingModel: string;
    readonly geminiSchemaModel: string;
    readonly embeddingDimensions: number;
    readonly x402WalletAddress: string;
    readonly x402Network: string;
    readonly x402PriceUsdc: string;
    readonly x402FacilitatorUrl: string;
    readonly githubToken: string | null;
    readonly agentKeys: Record<string, {
        publicKey?: string;
        secret?: string;
        address?: string;
    }> | null;
    readonly requireSignature: boolean;
    readonly signatureMaxAgeMs: number;
    readonly proxyAllowedHosts: string[];
    readonly proxyAllowPrivate: boolean;
    readonly maxRequestBytes: number;
    readonly maxResponseBytes: number;
    readonly posthogApiKey: string | null;
    readonly posthogHost: string;
};
export type Config = typeof config;
//# sourceMappingURL=config.d.ts.map