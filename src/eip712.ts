/**
 * EIP-712 wallet authentication — proves a caller controls the Base address
 * registered for their agent, without ever handling a private key.
 *
 * The agent signs an EIP-712 typed-data message with their wallet. The server
 * recovers the signer address via secp256k1 `ecrecover` (viem) and compares it
 * to the agent's registered address — proving identity + integrity, and
 * defeating man-in-the-middle tampering (the signature covers the full request:
 * method, path+query, timestamp, and the keccak256 hash of the body).
 *
 * Typed data:
 *   domain:  { name: "AIPages", version: "1", chainId: <SIGNING_CHAIN_ID> }
 *   primaryType: "InvokeRequest"
 *   types: {
 *     InvokeRequest: [
 *       { name: "agentId",   type: "string"   },
 *       { name: "timestamp", type: "uint256"  },
 *       { name: "method",    type: "string"   },
 *       { name: "path",      type: "string"   },
 *       { name: "bodyHash",  type: "bytes32"  },
 *     ]
 *   }
 *
 * The client must construct this exact domain/types/message and sign it. The
 * signature is sent in the `X-EIP712-Signature` header (0x-prefixed, 65 bytes:
 * r ‖ s ‖ v).
 */
import { keccak256, recoverTypedDataAddress, type TypedDataDomain } from "viem";

const TYPES = {
  InvokeRequest: [
    { name: "agentId", type: "string" },
    { name: "timestamp", type: "uint256" },
    { name: "method", type: "string" },
    { name: "path", type: "string" },
    { name: "bodyHash", type: "bytes32" },
  ],
} as const;

const PRIMARY_TYPE = "InvokeRequest";

const CHAIN_ID = (() => {
  const raw = process.env.SIGNING_CHAIN_ID ?? "8453"; // Base mainnet default
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 8453;
})();

function domain(): TypedDataDomain {
  return { name: "AIPages", version: "1", chainId: BigInt(CHAIN_ID) };
}

// Exposed so client SDKs / tests can reproduce the exact domain + types.
export const EIP712_DOMAIN = { name: "AIPages", version: "1", chainId: CHAIN_ID };
export const EIP712_TYPES = TYPES;
export const EIP712_PRIMARY_TYPE = PRIMARY_TYPE;

export type Eip712RecoverResult =
  | { ok: true; address: string }
  | { ok: false; error: string };

/**
 * Recover the signer address from an EIP-712 invocation signature.
 *
 * @param opts.signature  0x-prefixed 65-byte signature (r ‖ s ‖ v).
 */
export async function recoverInvokeSigner(opts: {
  agentId: string;
  timestampSec: number;
  method: string;
  pathAndQuery: string;
  bodyBytes: Uint8Array;
  signature: string;
}): Promise<Eip712RecoverResult> {
  const { agentId, timestampSec, method, pathAndQuery, bodyBytes, signature } = opts;

  // 65 bytes = 130 hex chars + "0x" prefix.
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) {
    return { ok: false, error: "Invalid X-EIP712-Signature encoding" };
  }

  const bodyHash = await keccak256(bodyBytes); // 0x-prefixed bytes32

  const message = {
    agentId,
    timestamp: BigInt(Math.floor(timestampSec)),
    method,
    path: pathAndQuery,
    bodyHash,
  } as const;

  try {
    const address = await recoverTypedDataAddress({
      domain: domain(),
      types: TYPES,
      primaryType: PRIMARY_TYPE,
      message,
      signature: signature as `0x${string}`,
    });
    return { ok: true, address };
  } catch {
    return { ok: false, error: "Invalid EIP-712 signature" };
  }
}
