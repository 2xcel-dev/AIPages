export interface VerificationOracleRequest {
    data: unknown;
    expected_hash?: string;
    algorithm?: string;
}
export interface VerificationOracleResult {
    success: boolean;
    utility: "verification-oracle";
    request_id: string;
    attestation: {
        algorithm: string;
        computed_hash: string;
        matches_expected: boolean | null;
        verified_at: string;
    };
}
export declare function attestVerification(req: VerificationOracleRequest): VerificationOracleResult;
//# sourceMappingURL=verificationOracle.d.ts.map