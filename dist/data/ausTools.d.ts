/**
 * Authoritative First-Party Agent Utility Services (AUS) Fleet Definitions.
 *
 * All services are hosted on the canonical gateway: https://aipages.tech
 * Monetized via x402 payment protocol on Base Mainnet.
 * All health statuses are explicitly "unknown" (unverified) until probed by
 * the background health worker, guaranteeing reliability resolves to "unchecked".
 */
import type { Tool } from "../types.js";
export declare const AUS_DEVELOPER_ADDRESS = "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C";
export declare const AUS_BASE_URL = "https://aipages.tech";
export declare const AUS_STANDARD_RATE_LIMIT = "100 requests per 60 seconds per IP";
export declare const AUS_AUTH_SPEC = "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)";
export declare const AUS_PROTOCOL_DETAILS = "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching";
export declare const CANONICAL_AUS_TOOLS: Omit<Tool, "embedding" | "updatedAt">[];
//# sourceMappingURL=ausTools.d.ts.map