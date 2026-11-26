import fs from "node:fs";
import path from "node:path";
import { Context, Next, MiddlewareHandler } from "hono";
import type { Collection, Document } from "mongodb";
import {
  createPublicClient,
  fallback,
  http,
  parseAbiItem,
  decodeEventLog,
  parseUnits,
  recoverTypedDataAddress,
  type TypedDataDomain,
} from "viem";
import { base } from "viem/chains";
import { config } from "../config.js";

export const USDC_CONTRACT_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const EXPECTED_RECIPIENT = "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C" as const;
export const MIN_AMOUNT_USDC = "0.01";
export const USDC_DECIMALS = 6;
export const MIN_AMOUNT_UNITS = parseUnits(MIN_AMOUNT_USDC, USDC_DECIMALS);

// ── EIP-712 Payment Voucher Domain & Types for Micro-Escrow Channels ──
export const X402_PAYMENT_DOMAIN: TypedDataDomain = {
  name: "AIPagesX402PaymentChannel",
  version: "1",
  chainId: BigInt(8453),
};

export const X402_VOUCHER_TYPES = {
  PaymentVoucher: [
    { name: "channelId", type: "bytes32" },
    { name: "cumulativeAmountUnits", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "recipient", type: "address" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

export interface PaymentVoucher {
  channelId: string;
  cumulativeAmountUnits: string;
  nonce: number | string;
  recipient: string;
  expiry: number | string;
  signature: string;
}

export function parseNonceToBigInt(nonce: string | number): bigint {
  if (typeof nonce === "number") return BigInt(nonce);
  const s = String(nonce).trim();
  if (/^[0-9]+$/.test(s)) return BigInt(s);
  if (/^0x[0-9a-fA-F]+$/i.test(s)) return BigInt(s);
  const cleanHex = s.replace(/[^0-9a-fA-F]/g, "");
  if (cleanHex.length > 0) return BigInt("0x" + cleanHex);
  throw new Error("Invalid nonce format for uint256");
}

const transferEventAbi = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

const baseRpcEndpoints = [
  process.env.BASE_RPC_URL,
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
  "https://1rpc.io/base",
].filter(Boolean) as string[];

const publicClient = createPublicClient({
  chain: base,
  transport: fallback(
    baseRpcEndpoints.map((url) => http(url, { timeout: 8000, retryCount: 2 })),
  ),
});

// ── Replay Protection Stores (Persistent Across Restarts & Multi-Instance) ──
export interface ReplayStore {
  has(txHash: string): Promise<boolean>;
  add(txHash: string, metadata?: Record<string, unknown>): Promise<void>;
  clear(): Promise<void>;
}

export class FileBackedReplayStore implements ReplayStore {
  private filePath: string;
  private memorySet: Set<string>;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.memorySet = new Set<string>();
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.memorySet = new Set(arr.map((h: string) => h.toLowerCase()));
        }
      }
    } catch (err: any) {
      console.warn("[replay-cache] Could not read cache file:", err?.message || err);
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(Array.from(this.memorySet), null, 2),
        "utf-8",
      );
    } catch (err: any) {
      console.warn("[replay-cache] Could not write cache file:", err?.message || err);
    }
  }

  async has(txHash: string): Promise<boolean> {
    return this.memorySet.has(txHash.toLowerCase());
  }

  async add(txHash: string): Promise<void> {
    this.memorySet.add(txHash.toLowerCase());
    this.persist();
  }

  async clear(): Promise<void> {
    this.memorySet.clear();
    this.persist();
  }
}

export class MongoReplayStore implements ReplayStore {
  private collection: Collection<Document>;

  constructor(collection: Collection<Document>) {
    this.collection = collection;
  }

  async ensureIndexes(): Promise<void> {
    try {
      await this.collection.createIndex({ txHash: 1 }, { unique: true });
      await this.collection.createIndex({ consumedAt: 1 }, { expireAfterSeconds: 90 * 86400 });
    } catch (err: any) {
      console.warn("[replay-cache] Index creation error:", err?.message || err);
    }
  }

  async has(txHash: string): Promise<boolean> {
    const doc = await this.collection.findOne({ txHash: txHash.toLowerCase() });
    return doc !== null;
  }

  async add(txHash: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.collection.updateOne(
      { txHash: txHash.toLowerCase() },
      {
        $setOnInsert: {
          txHash: txHash.toLowerCase(),
          consumedAt: new Date(),
          ...metadata,
        },
      },
      { upsert: true },
    );
  }

  async clear(): Promise<void> {
    await this.collection.deleteMany({});
  }
}

const defaultStorePath = path.join(process.cwd(), ".data", "consumed-tx-hashes.json");
let activeReplayStore: ReplayStore = new FileBackedReplayStore(defaultStorePath);
const inFlightHashes = new Set<string>();

export function setReplayStore(store: ReplayStore): void {
  activeReplayStore = store;
}

export function getReplayStore(): ReplayStore {
  return activeReplayStore;
}

export async function resetReplayCache(): Promise<void> {
  await activeReplayStore.clear();
}

// ── Test hook for receipt mocking ─────────────────────────────────────────
type ReceiptGetter = (hash: `0x${string}`) => Promise<any>;
let customReceiptGetter: ReceiptGetter | null = null;

export function setReceiptGetterForTesting(getter: ReceiptGetter | null): void {
  customReceiptGetter = getter;
}

async function fetchReceipt(hash: `0x${string}`) {
  if (customReceiptGetter) {
    return customReceiptGetter(hash);
  }
  return publicClient.getTransactionReceipt({ hash });
}

function returnPaymentChallenge(
  c: Context,
  message: string,
  details?: unknown,
) {
  const configuredRecipient =
    config.x402WalletAddress || process.env.EVM_WALLET_ADDRESS || EXPECTED_RECIPIENT;

  const challengeParam = [
    `realm="AIPages x402 Settlement"`,
    `network="eip155:8453"`,
    `token="${USDC_CONTRACT_BASE}"`,
    `recipient="${configuredRecipient}"`,
    `amount="${MIN_AMOUNT_UNITS.toString()}"`,
    `decimals="${USDC_DECIMALS}"`,
    `price="${MIN_AMOUNT_USDC} USDC"`,
  ].join(", ");

  c.header("WWW-Authenticate", `X402 ${challengeParam}`);
  c.header("X-Payment-Required", "true");
  c.header("X-Payment-Price", `${MIN_AMOUNT_USDC} USDC`);
  c.header("X-Payment-Amount-Units", MIN_AMOUNT_UNITS.toString());
  c.header("X-Payment-Address", configuredRecipient);
  c.header("X-Payment-Network", "base");
  c.header("X-Payment-Token", USDC_CONTRACT_BASE);

  return c.json(
    {
      error: "Payment Required",
      message,
      ...(details !== undefined ? { details } : {}),
      price: `${MIN_AMOUNT_USDC} USDC`,
      amountMinorUnits: MIN_AMOUNT_UNITS.toString(),
      token: USDC_CONTRACT_BASE,
      address: configuredRecipient,
      network: "base",
    },
    402,
  );
}

async function handleX402(c: Context, next: Next) {
  if (c.req.method === "OPTIONS") {
    return next();
  }

  const paymentHeader = c.req.header("x-payment") || c.req.header("X-Payment");
  const voucherHeader = c.req.header("x-payment-voucher") || c.req.header("X-Payment-Voucher");

  if (!paymentHeader && !voucherHeader) {
    return returnPaymentChallenge(
      c,
      "Please provide valid USDC payment proof on Base via X-Payment header or X-Payment-Voucher.",
    );
  }

  // ── Route A: EIP-712 Micro-Escrow Voucher Verification ──
  if (voucherHeader) {
    let voucher: PaymentVoucher;
    try {
      const raw = voucherHeader.trim();
      voucher = raw.startsWith("{")
        ? JSON.parse(raw)
        : JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    } catch {
      return returnPaymentChallenge(
        c,
        "Invalid voucher format. Expected JSON or base64-encoded JSON PaymentVoucher.",
      );
    }

    if (
      !voucher.channelId ||
      !voucher.cumulativeAmountUnits ||
      voucher.nonce === undefined ||
      !voucher.recipient ||
      !voucher.expiry ||
      !voucher.signature
    ) {
      return returnPaymentChallenge(
        c,
        "Malformed PaymentVoucher. Required fields: channelId, cumulativeAmountUnits, nonce, recipient, expiry, signature.",
      );
    }

    const configuredRecipient =
      config.x402WalletAddress || process.env.EVM_WALLET_ADDRESS || EXPECTED_RECIPIENT;

    if (
      voucher.recipient.toLowerCase() !== configuredRecipient.toLowerCase() &&
      voucher.recipient.toLowerCase() !== EXPECTED_RECIPIENT.toLowerCase()
    ) {
      return returnPaymentChallenge(
        c,
        `Voucher recipient does not match required address (${configuredRecipient}).`,
      );
    }

    const amountUnits = BigInt(voucher.cumulativeAmountUnits);
    if (amountUnits < MIN_AMOUNT_UNITS) {
      return returnPaymentChallenge(
        c,
        `Voucher cumulative amount (${amountUnits.toString()}) is less than required minimum (${MIN_AMOUNT_UNITS.toString()}).`,
      );
    }

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    if (BigInt(voucher.expiry) <= nowSec) {
      return returnPaymentChallenge(c, "Payment voucher has expired.");
    }

    const replayKey = `voucher:${voucher.channelId.toLowerCase()}:${voucher.nonce.toString()}`;
    if (inFlightHashes.has(replayKey) || (await activeReplayStore.has(replayKey))) {
      c.header("X-Payment-Required", "true");
      return c.json(
        {
          error: "Payment Error",
          message: "Payment voucher nonce has already been used (replay protection).",
        },
        402,
      );
    }

    inFlightHashes.add(replayKey);
    try {
      let recoveredSigner: string;
      const parsedNonce = parseNonceToBigInt(voucher.nonce);
      try {
        recoveredSigner = await recoverTypedDataAddress({
          domain: X402_PAYMENT_DOMAIN,
          types: X402_VOUCHER_TYPES,
          primaryType: "PaymentVoucher",
          message: {
            channelId: voucher.channelId as `0x${string}`,
            cumulativeAmountUnits: amountUnits,
            nonce: parsedNonce,
            recipient: voucher.recipient as `0x${string}`,
            expiry: BigInt(voucher.expiry),
          },
          signature: voucher.signature as `0x${string}`,
        });
      } catch (err: any) {
        return returnPaymentChallenge(
          c,
          "Cryptographic voucher signature verification failed.",
          err?.message,
        );
      }

      c.set("x402.verified", true);
      c.set("x402.voucher", voucher);
      c.set("x402.signer", recoveredSigner);

      // Phase 2: Execute downstream handler
      await next();

      // Phase 3: Two-Phase Commit - Commit voucher consumption ONLY on successful 2xx response
      if (c.res && c.res.status >= 200 && c.res.status < 300) {
        await activeReplayStore.add(replayKey, {
          channelId: voucher.channelId,
          nonce: voucher.nonce.toString(),
          signer: recoveredSigner,
          amountUnits: amountUnits.toString(),
          recipient: voucher.recipient,
        });
        c.header("X-Payment-Settled", "true");
      } else {
        c.header("X-Payment-Settled", "false");
        c.header("X-Payment-Refunded", "true");
      }
      return;
    } finally {
      inFlightHashes.delete(replayKey);
    }
  }

  // ── Route B: Direct On-Chain Transaction Verification ──
  const txHash = paymentHeader!.trim();

  // Validate format of transaction hash: 0x-prefixed 64-hex-character string
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return returnPaymentChallenge(
      c,
      "Invalid transaction hash format. Expected 0x-prefixed 64-character hex string.",
    );
  }

  // 1. Replay Protection: reject if hash has already been consumed or is actively processing
  const normalizedHash = txHash.toLowerCase();
  if (inFlightHashes.has(normalizedHash) || (await activeReplayStore.has(normalizedHash))) {
    c.header("X-Payment-Required", "true");
    return c.json(
      {
        error: "Payment Error",
        message: "Transaction hash has already been used (replay protection).",
      },
      402,
    );
  }

  inFlightHashes.add(normalizedHash);

  let receipt;
  try {
    try {
      receipt = await fetchReceipt(txHash as `0x${string}`);
    } catch (err: any) {
      console.warn("[x402] Failed to fetch transaction receipt on Base:", err?.message || err);
      return returnPaymentChallenge(
        c,
        "Unable to verify transaction receipt on Base mainnet. Transaction may be unconfirmed or invalid.",
        err?.message,
      );
    }

    // 2. Transaction Status Check
    if (!receipt || receipt.status !== "success") {
      return returnPaymentChallenge(
        c,
        "Transaction on Base has not succeeded or receipt status is not success.",
        receipt ? { status: receipt.status, blockNumber: receipt.blockNumber?.toString() } : undefined,
      );
    }

    // 3. Log Filtering & Decoding for ERC-20 USDC Transfer
    const configuredRecipient =
      config.x402WalletAddress || process.env.EVM_WALLET_ADDRESS || EXPECTED_RECIPIENT;

    let validTransferFound = false;
    let transferDetails: { from: string; to: string; value: string } | null = null;

    for (const log of receipt.logs ?? []) {
      if (log.address.toLowerCase() !== USDC_CONTRACT_BASE.toLowerCase()) {
        continue;
      }

      try {
        const decoded = decodeEventLog({
          abi: [transferEventAbi],
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === "Transfer" && decoded.args) {
          const { from, to, value } = decoded.args as {
            from: string;
            to: string;
            value: bigint;
          };

          const recipientMatches =
            to.toLowerCase() === EXPECTED_RECIPIENT.toLowerCase() ||
            to.toLowerCase() === configuredRecipient.toLowerCase();

          if (recipientMatches && value >= MIN_AMOUNT_UNITS) {
            validTransferFound = true;
            transferDetails = {
              from,
              to,
              value: value.toString(),
            };
            break;
          }
        }
      } catch {
        // Continue inspecting subsequent logs
        continue;
      }
    }

    if (!validTransferFound) {
      return returnPaymentChallenge(
        c,
        `No valid ERC-20 USDC transfer to ${EXPECTED_RECIPIENT} of at least ${MIN_AMOUNT_USDC} USDC found in transaction logs.`,
      );
    }

    // Mark payment verified on context for downstream route handlers
    c.set("x402.verified", true);
    c.set("x402.txHash", txHash);
    if (transferDetails) {
      c.set("x402.transfer", transferDetails);
    }

    console.log(
      `[x402] Verified Base USDC transfer: ${txHash} from ${transferDetails?.from} to ${transferDetails?.to} (amount: ${transferDetails?.value}, block: ${receipt.blockNumber})`,
    );

    // Phase 2: Execute downstream handler
    await next();

    // Phase 3: Two-Phase Commit - Commit transaction hash ONLY upon successful 2xx response
    if (c.res && c.res.status >= 200 && c.res.status < 300) {
      await activeReplayStore.add(normalizedHash, {
        from: transferDetails?.from,
        to: transferDetails?.to,
        value: transferDetails?.value,
        blockNumber: receipt.blockNumber?.toString(),
      });
      c.header("X-Payment-Settled", "true");
    } else {
      c.header("X-Payment-Settled", "false");
      c.header("X-Payment-Refunded", "true");
    }
    return;
  } finally {
    inFlightHashes.delete(normalizedHash);
  }
}

// Export typed Hono middleware handler
export const x402PaymentMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  return handleX402(c, next);
};

export const x402Middleware = x402PaymentMiddleware;
