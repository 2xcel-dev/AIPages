export declare const EIP712_DOMAIN: {
    name: string;
    version: string;
    chainId: number;
};
export declare const EIP712_TYPES: {
    readonly InvokeRequest: readonly [{
        readonly name: "agentId";
        readonly type: "string";
    }, {
        readonly name: "timestamp";
        readonly type: "uint256";
    }, {
        readonly name: "method";
        readonly type: "string";
    }, {
        readonly name: "path";
        readonly type: "string";
    }, {
        readonly name: "bodyHash";
        readonly type: "bytes32";
    }];
};
export declare const EIP712_PRIMARY_TYPE = "InvokeRequest";
export type Eip712RecoverResult = {
    ok: true;
    address: string;
} | {
    ok: false;
    error: string;
};
/**
 * Recover the signer address from an EIP-712 invocation signature.
 *
 * @param opts.signature  0x-prefixed 65-byte signature (r ‖ s ‖ v).
 */
export declare function recoverInvokeSigner(opts: {
    agentId: string;
    timestampSec: number;
    method: string;
    pathAndQuery: string;
    bodyBytes: Uint8Array;
    signature: string;
}): Promise<Eip712RecoverResult>;
//# sourceMappingURL=eip712.d.ts.map