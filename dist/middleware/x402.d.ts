import { MiddlewareHandler } from "hono";
import type { Collection, Document } from "mongodb";
import { type TypedDataDomain } from "viem";
export declare const USDC_CONTRACT_BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export declare const EXPECTED_RECIPIENT: "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C";
export declare const MIN_AMOUNT_USDC = "0.01";
export declare const USDC_DECIMALS = 6;
export declare const MIN_AMOUNT_UNITS: bigint;
export declare const X402_PAYMENT_DOMAIN: TypedDataDomain;
export declare const X402_VOUCHER_TYPES: {
    readonly PaymentVoucher: readonly [{
        readonly name: "channelId";
        readonly type: "bytes32";
    }, {
        readonly name: "cumulativeAmountUnits";
        readonly type: "uint256";
    }, {
        readonly name: "nonce";
        readonly type: "uint256";
    }, {
        readonly name: "recipient";
        readonly type: "address";
    }, {
        readonly name: "expiry";
        readonly type: "uint256";
    }];
};
export interface PaymentVoucher {
    channelId: string;
    cumulativeAmountUnits: string;
    nonce: number | string;
    recipient: string;
    expiry: number | string;
    signature: string;
}
export declare function parseNonceToBigInt(nonce: string | number): bigint;
export interface ReplayStore {
    has(txHash: string): Promise<boolean>;
    add(txHash: string, metadata?: Record<string, unknown>): Promise<void>;
    clear(): Promise<void>;
}
export declare class FileBackedReplayStore implements ReplayStore {
    private filePath;
    private memorySet;
    constructor(filePath: string);
    private load;
    private persist;
    has(txHash: string): Promise<boolean>;
    add(txHash: string): Promise<void>;
    clear(): Promise<void>;
}
export declare class MongoReplayStore implements ReplayStore {
    private collection;
    constructor(collection: Collection<Document>);
    ensureIndexes(): Promise<void>;
    has(txHash: string): Promise<boolean>;
    add(txHash: string, metadata?: Record<string, unknown>): Promise<void>;
    clear(): Promise<void>;
}
export declare function setReplayStore(store: ReplayStore): void;
export declare function getReplayStore(): ReplayStore;
export declare function resetReplayCache(): Promise<void>;
type ReceiptGetter = (hash: `0x${string}`) => Promise<any>;
export declare function setReceiptGetterForTesting(getter: ReceiptGetter | null): void;
export declare const x402PaymentMiddleware: MiddlewareHandler;
export declare const x402Middleware: MiddlewareHandler;
export {};
//# sourceMappingURL=x402.d.ts.map