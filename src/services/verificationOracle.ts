/**
 * AUS Verification Oracle Service
 * Ported faithfully from agent-utility-services (Engine: verification-oracle)
 * Hardened with cryptographic algorithm allowlisting, timing-safe equality comparison,
 * and robust exception handling.
 */
import crypto from "crypto";

export interface VerificationOracleRequest {
  data: unknown;
  expected_hash?: string;
  algorithm?: string; // default: sha256
}

export interface VerificationOracleResult {
  success: boolean;
  utility: "verification-oracle";
  request_id: string;
  attestation?: {
    algorithm: string;
    computed_hash: string;
    matches_expected: boolean | null;
    verified_at: string;
  };
  error?: string;
}

const SUPPORTED_ALGORITHMS = new Set(["sha256", "sha384", "sha512", "sha1", "md5"]);

/**
 * Constant-time hash comparison to eliminate side-channel timing attacks.
 */
function safeTimingHashEqual(computed: string, expected: string): boolean {
  const normComputed = computed.trim().toLowerCase();
  const normExpected = expected.trim().toLowerCase();
  const bufA = Buffer.from(normComputed, "utf8");
  const bufB = Buffer.from(normExpected, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function attestVerification(req: VerificationOracleRequest): VerificationOracleResult {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const rawAlgo = (req.algorithm || "sha256").toLowerCase().trim();

  if (!SUPPORTED_ALGORITHMS.has(rawAlgo)) {
    return {
      success: false,
      utility: "verification-oracle",
      request_id: requestId,
      error: `Unsupported digest algorithm: '${rawAlgo}'. Supported: ${Array.from(SUPPORTED_ALGORITHMS).join(", ")}.`,
    };
  }

  try {
    const data = req.data;
    const dataString = typeof data === "object" && data !== null ? JSON.stringify(data) : String(data ?? "");
    const computedHash = crypto.createHash(rawAlgo).update(dataString).digest("hex");
    const matches = req.expected_hash ? safeTimingHashEqual(computedHash, req.expected_hash) : null;

    return {
      success: true,
      utility: "verification-oracle",
      request_id: requestId,
      attestation: {
        algorithm: rawAlgo,
        computed_hash: computedHash,
        matches_expected: matches,
        verified_at: new Date().toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      utility: "verification-oracle",
      request_id: requestId,
      error: `Verification attestation failed: ${message}`,
    };
  }
}
