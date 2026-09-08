/**
 * Environment configuration for AIPages backend.
 * All secrets live in .env (gitignored); .env.example documents the schema.
 */
import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

/** Parse a comma/whitespace-separated list into a trimmed array (empty → []). */
function listOf(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Parse an `AGENT_KEYS` JSON map into a typed agent-key registry, or null. */
function parseAgentKeys(
  raw: string | undefined,
): Record<string, { publicKey?: string; secret?: string; address?: string }> | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: Record<string, { publicKey?: string; secret?: string; address?: string }> = {};
    for (const [id, v] of Object.entries(parsed)) {
      if (v && typeof v === "object") {
        const e = v as any;
        out[id] = {
          publicKey: typeof e.publicKey === "string" ? e.publicKey : undefined,
          secret: typeof e.secret === "string" ? e.secret : undefined,
          address: typeof e.address === "string" ? e.address : undefined,
        };
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    console.warn("[config] AGENT_KEYS is not valid JSON — ignoring.");
    return null;
  }
}

export const config = {
  port: parseInt(optional("PORT", "3000"), 10),

  // MongoDB Atlas
  MONGODB_URI: process.env.MONGODB_URI ?? null, // null = in-memory fallback for dev
  VECTOR_INDEX_NAME: optional("VECTOR_INDEX_NAME", "vector_index"),

  // Gemini embeddings (via google/genai REST or SDK)
  geminiApiKey: process.env.GEMINI_API_KEY ?? null,
  geminiEmbeddingModel: optional("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"),
  geminiSchemaModel: optional("GEMINI_SCHEMA_MODEL", "gemini-3.6-flash"),
  embeddingDimensions: parseInt(optional("EMBEDDING_DIMENSIONS", "3072"), 10),

  // x402 payment
  x402WalletAddress: optional("X402_WALLET_ADDRESS", "0x0000000000000000000000000000000000000000"),
  x402Network: optional("X402_NETWORK", "eip155:84532"),
  x402PriceUsdc: optional("X402_PRICE_USDC", "0.25"),
  x402FacilitatorUrl: optional("X402_FACILITATOR_URL", "https://x402.org/facilitator"),

  // GitHub scraping (optional — uses unauthenticated API if not set)
  githubToken: process.env.GITHUB_TOKEN ?? null,

  // ── Verification gate (caller identity + signature) ────────────────────
  // Map of agentId → { publicKey?: base64 Ed25519 public key, secret?: HMAC key }
  // When non-empty, /invoke requires a valid signature for a known agent.
  // When empty, verification is a dev passthrough unless VERIFY_REQUIRE_SIGNATURE.
  agentKeys: parseAgentKeys(process.env.AGENT_KEYS),
  requireSignature: optional("VERIFY_REQUIRE_SIGNATURE", "false") === "true",
  signatureMaxAgeMs: parseInt(optional("SIGNATURE_MAX_AGE_MS", "300000"), 10),

  // ── Egress guard (SSRF / proxy hardening) ───────────────────────────────
  // Allowlist of downstream hosts (exact or "*.example.com" suffix wildcard).
  // Empty = allow any public host.
  proxyAllowedHosts: listOf(process.env.PROXY_ALLOWED_HOSTS),
  // Permit proxying to private/reserved IPs (loopback, RFC1918, link-local) —
  // OFF by default; only for trusted internal dev.
  proxyAllowPrivate: optional("PROXY_ALLOW_PRIVATE", "false") === "true",
  maxRequestBytes: parseInt(optional("MAX_REQUEST_BYTES", "1048576"), 10), // 1 MiB
  maxResponseBytes: parseInt(optional("MAX_RESPONSE_BYTES", "5242880"), 10), // 5 MiB
} as const;

export type Config = typeof config;
