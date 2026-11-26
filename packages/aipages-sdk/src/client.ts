import type {
  AIPagesClientOptions,
  PaymentChallenge,
  ToolRecord,
  SearchResult,
  InvokeOptions,
  InvokeResult,
} from "./types.js";

export class AIPagesBudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIPagesBudgetExceededError";
  }
}

export class AIPagesPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIPagesPaymentError";
  }
}

export class AIPagesClient {
  private baseUrl: string;
  private agentId: string;
  private walletPrivateKey?: `0x${string}`;
  private maxCostPerCallUsdc: number;
  private budgetCapUsdc: number;
  private timeoutMs: number;
  private customPaymentSigner?: (challenge: PaymentChallenge) => Promise<string>;
  private cumulativeSpentUsdc: number = 0;

  constructor(options: AIPagesClientOptions = {}) {
    this.baseUrl = (options.baseUrl || "https://aipages.tech").replace(/\/$/, "");
    this.agentId = options.agentId || `agent-${Math.random().toString(36).slice(2, 9)}`;
    this.walletPrivateKey = options.walletPrivateKey;
    this.maxCostPerCallUsdc = options.maxCostPerCallUsdc ?? 0.50;
    this.budgetCapUsdc = options.budgetCapUsdc ?? 10.00;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.customPaymentSigner = options.customPaymentSigner;
  }

  /**
   * Current cumulative USDC spent by this client session.
   */
  public get totalSpentUsdc(): number {
    return this.cumulativeSpentUsdc;
  }

  /**
   * Semantic vector search across registered MCP tools and AUS micro-utilities.
   *
   * @param query Natural language task or intent description
   * @param limit Maximum results (default: 5)
   */
  public async search(query: string, limit: number = 5): Promise<ToolRecord[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-agent-id": this.agentId,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`AIPages search failed with status ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as SearchResult | { tools: ToolRecord[] };
    return (json as any).tools || (json as any).results || [];
  }

  /**
   * Fetch details and schema for a specific tool by namespace or slug.
   */
  public async getTool(namespaceOrSlug: string): Promise<ToolRecord> {
    const clean = namespaceOrSlug.replace(/^net\.2xcel\.aus\./, "");
    const url = `${this.baseUrl}/api/tools/${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-agent-id": this.agentId,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`AIPages getTool failed with status ${res.status}: ${await res.text()}`);
    }

    return (await res.json()) as ToolRecord;
  }

  /**
   * Fetch all first-party canonical AUS micro-utilities.
   */
  public async listCanonical(): Promise<ToolRecord[]> {
    const url = `${this.baseUrl}/api/tools?limit=100`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-agent-id": this.agentId,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`AIPages listCanonical failed: ${await res.text()}`);
    }

    const data = await res.json();
    const list: ToolRecord[] = data.tools || [];
    return list.filter((t) => t.isFirstParty);
  }

  /**
   * Execute a tool by namespace or slug.
   * If the tool requires payment (HTTP 402), this method automatically handles:
   * 1. Budget verification (maxCostPerCallUsdc, budgetCapUsdc).
   * 2. Payment proof generation via private key or custom signer.
   * 3. Seamless retry and verified output delivery.
   */
  public async invoke<T = unknown>(
    namespaceOrSlug: string,
    payload: Record<string, unknown>,
    options: InvokeOptions = {}
  ): Promise<InvokeResult<T>> {
    const startTime = Date.now();
    const endpoint = `${this.baseUrl}/tool/${encodeURIComponent(namespaceOrSlug)}`;
    const agentId = options.agentId || this.agentId;

    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-agent-id": agentId,
    };

    if (options.playgroundTest) {
      baseHeaders["x-playground-test"] = "true";
    }

    if (options.paymentProof) {
      baseHeaders["X-Payment"] = options.paymentProof;
    }

    // Step 1: Initial invocation attempt
    let res = await fetch(endpoint, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    // Step 2: Handle x402 Payment Required challenge
    if (res.status === 402 && !options.playgroundTest) {
      const challenge = (await res.json()) as PaymentChallenge;
      const costUsdc = parseFloat(challenge.price?.replace(/[^\d.]/g, "") || "0.01");

      // Guardrail: Check budget limits
      if (costUsdc > this.maxCostPerCallUsdc) {
        throw new AIPagesBudgetExceededError(
          `Invocation cost (${costUsdc} USDC) exceeds maxPerCall limit (${this.maxCostPerCallUsdc} USDC).`
        );
      }

      if (this.cumulativeSpentUsdc + costUsdc > this.budgetCapUsdc) {
        throw new AIPagesBudgetExceededError(
          `Cumulative spend (${this.cumulativeSpentUsdc + costUsdc} USDC) would exceed session budget cap (${this.budgetCapUsdc} USDC).`
        );
      }

      // Generate payment proof
      let proof = options.paymentProof;
      if (!proof && this.customPaymentSigner) {
        proof = await this.customPaymentSigner(challenge);
      } else if (!proof && this.walletPrivateKey) {
        proof = await this.signPaymentWithWallet(challenge);
      }

      if (!proof) {
        throw new AIPagesPaymentError(
          `HTTP 402 Payment Required: Tool ${namespaceOrSlug} requires ${costUsdc} USDC on Base Mainnet. Provide walletPrivateKey, customPaymentSigner, or pass playgroundTest: true.`
        );
      }

      // Retry request with payment proof
      const retryHeaders = {
        ...baseHeaders,
        "X-Payment": proof,
        "x-payment-receipt": proof,
      };

      res = await fetch(endpoint, {
        method: "POST",
        headers: retryHeaders,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (res.ok) {
        this.cumulativeSpentUsdc += costUsdc;
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AIPages invocation failed with status ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as T;
    return {
      success: true,
      data,
      namespace: namespaceOrSlug,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Internal helper to sign transaction or payment voucher on Base Mainnet.
   */
  private async signPaymentWithWallet(challenge: PaymentChallenge): Promise<string> {
    try {
      // Dynamically import viem
      const { createWalletClient, http, parseAbiItem } = await import("viem");
      const { privateKeyToAccount } = await import("viem/accounts");
      const { base } = await import("viem/chains");

      if (!this.walletPrivateKey) {
        throw new Error("Missing walletPrivateKey");
      }

      const account = privateKeyToAccount(this.walletPrivateKey);
      const client = createWalletClient({
        account,
        chain: base,
        transport: http(),
      });

      // Transfer USDC to recipient on Base
      const amountUnits = BigInt(challenge.amountMinorUnits || "10000"); // 0.01 USDC default
      const usdcAbi = [
        parseAbiItem("function transfer(address to, uint256 amount) returns (bool)"),
      ];

      const txHash = await client.writeContract({
        address: challenge.token as `0x${string}`,
        abi: usdcAbi,
        functionName: "transfer",
        args: [challenge.address as `0x${string}`, amountUnits],
      });

      return txHash;
    } catch (err: any) {
      throw new AIPagesPaymentError(`Failed to settle on-chain payment with wallet: ${err.message}`);
    }
  }
}
