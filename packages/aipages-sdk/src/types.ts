export interface AIPagesClientOptions {
  /**
   * Base URL of the AIPages instance.
   * Default: "https://aipages.tech"
   */
  baseUrl?: string;

  /**
   * Optional API Key or Agent ID header.
   */
  agentId?: string;

  /**
   * Optional private key hex (0x...) for Base Mainnet wallet to automatically
   * sign and settle x402 USDC micropayments when challenged.
   */
  walletPrivateKey?: `0x${string}`;

  /**
   * Maximum allowed USDC cost per single tool invocation.
   * Default: 0.50 USDC
   */
  maxCostPerCallUsdc?: number;

  /**
   * Maximum cumulative session budget cap in USDC.
   * Default: 10.00 USDC
   */
  budgetCapUsdc?: number;

  /**
   * Timeout in milliseconds for HTTP calls.
   * Default: 30000ms (30s)
   */
  timeoutMs?: number;

  /**
   * Custom payment receipt generator callback.
   */
  customPaymentSigner?: (challenge: PaymentChallenge) => Promise<string>;
}

export interface PaymentChallenge {
  error: string;
  message: string;
  price: string;
  amountMinorUnits: string;
  token: string;
  address: string;
  network: string;
}

export interface ToolRecord {
  namespace: string;
  name: string;
  description: string;
  endpointUrl: string;
  capabilities: string[];
  isFirstParty: boolean;
  pricing?: {
    model: "free" | "paid" | "freemium";
    costPerCall?: number;
  };
  schema?: Record<string, unknown>;
  healthStatus?: string;
}

export interface SearchResult {
  tools: ToolRecord[];
  total?: number;
  query?: string;
}

export interface InvokeOptions {
  /**
   * Run in zero-cost sandbox test mode without requiring on-chain payment.
   * Default: false
   */
  playgroundTest?: boolean;

  /**
   * Custom agent ID for attribution.
   */
  agentId?: string;

  /**
   * Explicit transaction hash or voucher to satisfy x402 challenge directly.
   */
  paymentProof?: string;
}

export interface InvokeResult<T = unknown> {
  success: boolean;
  data: T;
  namespace: string;
  settledPayment?: {
    amountUsdc: number;
    recipient: string;
    proof: string;
  };
  executionTimeMs?: number;
}
