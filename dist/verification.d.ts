export interface VerificationOutcome {
    ok: boolean;
    agentId: string;
    /** Present when ok=false — safe to expose to the caller. */
    error?: string;
}
/** Compute the canonical string a request signature must cover. */
export declare function canonicalString(timestamp: string, method: string, pathAndQuery: string, bodyBytes: Uint8Array): string;
/**
 * Verify a caller's identity + request signature.
 *
 * @param bodyBytes  Raw request body bytes (already size-checked by the gate).
 */
export declare function verifyCallerIdentity(opts: {
    agentId: string | undefined;
    timestamp: string | undefined;
    signature: string | undefined;
    eip712Signature: string | undefined;
    method: string;
    pathAndQuery: string;
    bodyBytes: Uint8Array;
}): Promise<VerificationOutcome>;
//# sourceMappingURL=verification.d.ts.map