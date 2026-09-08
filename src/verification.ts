/**
 * Verification gate — cryptographic caller identity.
 *
 * Every `/invoke` request must prove the caller's identity. Supported schemes,
 * selected per-agent from the `AGENT_KEYS` registry:
 *
 *   - Ed25519: `X-Signature` is the base64url Ed25519 signature over the
 *     canonical request string, verified against the agent's registered
 *     public key.
 *   - HMAC-SHA256: `X-Signature` is the hex HMAC-SHA256 of the canonical
 *     string, keyed by the agent's shared `secret`.
 *   - EIP-712 wallet auth: `X-EIP712-Signature` is a 0x 65-byte signature over
 *     an EIP-712 `InvokeRequest` typed message, recovered to the agent's
 *     registered Base `address` (see eip712.ts).
 *
 * Canonical string (newline-joined):
 *     <unix-timestamp>\n<UPPERCASE-METHOD>\n<path+query>\n<hex-sha256(body)>
 *
 * Freshness: `X-Timestamp` must be within `SIGNATURE_MAX_AGE_MS` of now, and
 * the request body is bound into the signature (replay/tamper resistance).
 *
 * When `AGENT_KEYS` is empty the gate is a dev passthrough (a warning is
 * logged once), unless `VERIFY_REQUIRE_SIGNATURE=true` forces strict mode.
 *
 * Headers:
 *   X-Agent-ID        (required)  — caller identity
 *   X-Timestamp       (required)  — unix seconds
 *   X-Signature       (Ed25519/HMAC) OR X-EIP712-Signature (wallet)
 */
import {
  createHash,
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify as edVerify,
  type KeyObject,
} from "node:crypto";
import { config } from "./config.js";
import { recoverInvokeSigner } from "./eip712.js";

export interface VerificationOutcome {
  ok: boolean;
  agentId: string;
  /** Present when ok=false — safe to expose to the caller. */
  error?: string;
}

/** Compute the canonical string a request signature must cover. */
export function canonicalString(
  timestamp: string,
  method: string,
  pathAndQuery: string,
  bodyBytes: Uint8Array,
): string {
  const bodyHash = createHash("sha256").update(bodyBytes).digest("hex");
  return `${timestamp}\n${method.toUpperCase()}\n${pathAndQuery}\n${bodyHash}`;
}

// One-time dev-passthrough warning.
let warnedDevPassthrough = false;

/**
 * Verify a caller's identity + request signature.
 *
 * @param bodyBytes  Raw request body bytes (already size-checked by the gate).
 */
export async function verifyCallerIdentity(opts: {
  agentId: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  eip712Signature: string | undefined;
  method: string;
  pathAndQuery: string;
  bodyBytes: Uint8Array;
}): Promise<VerificationOutcome> {
  const { agentId, timestamp, signature, eip712Signature, method, pathAndQuery, bodyBytes } = opts;

  if (!agentId) return { ok: false, agentId: "", error: "Missing X-Agent-ID header" };

  const keys = config.agentKeys;

  // Dev passthrough: no key registry configured → accept without a signature
  // (unless strict mode is forced), so local/dev callers work out of the box.
  if (!keys || Object.keys(keys).length === 0) {
    if (config.requireSignature) {
      return { ok: false, agentId, error: "Signature required but no AGENT_KEYS configured" };
    }
    if (!warnedDevPassthrough) {
      warnedDevPassthrough = true;
      console.warn(
        "[verify] AGENT_KEYS empty — signature verification is DISABLED (dev passthrough). " +
        "Set AGENT_KEYS + VERIFY_REQUIRE_SIGNATURE=true in production.",
      );
    }
    return { ok: true, agentId };
  }

  if (!timestamp) return { ok: false, agentId, error: "Missing X-Timestamp header" };

  // Freshness check.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, agentId, error: "Invalid X-Timestamp" };
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > config.signatureMaxAgeMs / 1000) {
    return { ok: false, agentId, error: "X-Timestamp outside allowed window" };
  }

  const entry = keys[agentId];
  if (!entry) return { ok: false, agentId, error: "Unknown agent — no key registered" };

  // ── EIP-712 wallet auth (preferred when the agent registers a Base address) ──
  if (entry.address) {
    if (!eip712Signature) {
      return { ok: false, agentId, error: "Missing X-EIP712-Signature header" };
    }
    const rec = await recoverInvokeSigner({
      agentId,
      timestampSec: ts,
      method,
      pathAndQuery,
      bodyBytes,
      signature: eip712Signature,
    });
    if (!rec.ok) return { ok: false, agentId, error: rec.error };
    if (rec.address.toLowerCase() !== entry.address.toLowerCase()) {
      return { ok: false, agentId, error: "Signature does not match the registered address" };
    }
    return { ok: true, agentId };
  }

  if (!signature) return { ok: false, agentId, error: "Missing X-Signature header" };

  const canonical = canonicalString(timestamp, method, pathAndQuery, bodyBytes);

  if (entry.secret) {
    const expected = createHmac("sha256", entry.secret).update(canonical).digest();
    let provided: Buffer;
    try {
      provided = Buffer.from(signature, "hex");
    } catch {
      return { ok: false, agentId, error: "Invalid signature encoding" };
    }
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return { ok: false, agentId, error: "Invalid signature" };
    }
    return { ok: true, agentId };
  }

  if (entry.publicKey) {
    let key: KeyObject;
    try {
      key = createPublicKey({ key: Buffer.from(entry.publicKey, "base64"), format: "der", type: "spki" });
    } catch {
      return { ok: false, agentId, error: "Agent public key is invalid (server misconfiguration)" };
    }
    let sig: Buffer;
    try {
      sig = Buffer.from(signature, "base64url");
    } catch {
      return { ok: false, agentId, error: "Invalid signature encoding" };
    }
    const ok = edVerify(null, Buffer.from(canonical, "utf8"), key, sig);
    return ok ? { ok: true, agentId } : { ok: false, agentId, error: "Invalid signature" };
  }

  return { ok: false, agentId, error: "Agent has neither publicKey nor secret (server misconfiguration)" };
}
