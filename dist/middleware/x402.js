import fs from "node:fs";
import path from "node:path";
import { createPublicClient, http, parseAbiItem, decodeEventLog, parseUnits, } from "viem";
import { base } from "viem/chains";
import { config } from "../config.js";
export const USDC_CONTRACT_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const EXPECTED_RECIPIENT = "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C";
export const MIN_AMOUNT_USDC = "0.01";
export const USDC_DECIMALS = 6;
export const MIN_AMOUNT_UNITS = parseUnits(MIN_AMOUNT_USDC, USDC_DECIMALS);
const transferEventAbi = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
});
export class FileBackedReplayStore {
    filePath;
    memorySet;
    constructor(filePath) {
        this.filePath = filePath;
        this.memorySet = new Set();
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, "utf-8");
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    this.memorySet = new Set(arr.map((h) => h.toLowerCase()));
                }
            }
        }
        catch (err) {
            console.warn("[replay-cache] Could not read cache file:", err?.message || err);
        }
    }
    persist() {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.memorySet), null, 2), "utf-8");
        }
        catch (err) {
            console.warn("[replay-cache] Could not write cache file:", err?.message || err);
        }
    }
    async has(txHash) {
        return this.memorySet.has(txHash.toLowerCase());
    }
    async add(txHash) {
        this.memorySet.add(txHash.toLowerCase());
        this.persist();
    }
    async clear() {
        this.memorySet.clear();
        this.persist();
    }
}
export class MongoReplayStore {
    collection;
    constructor(collection) {
        this.collection = collection;
    }
    async ensureIndexes() {
        try {
            await this.collection.createIndex({ txHash: 1 }, { unique: true });
            await this.collection.createIndex({ consumedAt: 1 }, { expireAfterSeconds: 90 * 86400 });
        }
        catch (err) {
            console.warn("[replay-cache] Index creation error:", err?.message || err);
        }
    }
    async has(txHash) {
        const doc = await this.collection.findOne({ txHash: txHash.toLowerCase() });
        return doc !== null;
    }
    async add(txHash, metadata) {
        await this.collection.updateOne({ txHash: txHash.toLowerCase() }, {
            $setOnInsert: {
                txHash: txHash.toLowerCase(),
                consumedAt: new Date(),
                ...metadata,
            },
        }, { upsert: true });
    }
    async clear() {
        await this.collection.deleteMany({});
    }
}
const defaultStorePath = path.join(process.cwd(), ".data", "consumed-tx-hashes.json");
let activeReplayStore = new FileBackedReplayStore(defaultStorePath);
export function setReplayStore(store) {
    activeReplayStore = store;
}
export function getReplayStore() {
    return activeReplayStore;
}
export async function resetReplayCache() {
    await activeReplayStore.clear();
}
let customReceiptGetter = null;
export function setReceiptGetterForTesting(getter) {
    customReceiptGetter = getter;
}
async function fetchReceipt(hash) {
    if (customReceiptGetter) {
        return customReceiptGetter(hash);
    }
    return publicClient.getTransactionReceipt({ hash });
}
function returnPaymentChallenge(c, message, details) {
    const configuredRecipient = config.x402WalletAddress || process.env.EVM_WALLET_ADDRESS || EXPECTED_RECIPIENT;
    c.header("X-Payment-Required", "true");
    c.header("X-Payment-Price", `${MIN_AMOUNT_USDC} USDC`);
    c.header("X-Payment-Address", configuredRecipient);
    c.header("X-Payment-Network", "base");
    c.header("X-Payment-Token", USDC_CONTRACT_BASE);
    return c.json({
        error: "Payment Required",
        message,
        ...(details !== undefined ? { details } : {}),
        price: `${MIN_AMOUNT_USDC} USDC`,
        token: USDC_CONTRACT_BASE,
        address: configuredRecipient,
        network: "base",
    }, 402);
}
async function handleX402(c, next) {
    if (c.req.method === "OPTIONS") {
        return next();
    }
    const paymentHeader = c.req.header("x-payment") || c.req.header("X-Payment");
    if (!paymentHeader) {
        return returnPaymentChallenge(c, "Please provide valid USDC payment proof on Base via X-Payment header.");
    }
    const txHash = paymentHeader.trim();
    // Validate format of transaction hash: 0x-prefixed 64-hex-character string
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return returnPaymentChallenge(c, "Invalid transaction hash format. Expected 0x-prefixed 64-character hex string.");
    }
    // 1. Replay Protection: reject if hash has already been consumed
    const normalizedHash = txHash.toLowerCase();
    if (await activeReplayStore.has(normalizedHash)) {
        c.header("X-Payment-Required", "true");
        return c.json({
            error: "Payment Error",
            message: "Transaction hash has already been used (replay protection).",
        }, 402);
    }
    let receipt;
    try {
        receipt = await fetchReceipt(txHash);
    }
    catch (err) {
        console.warn("[x402] Failed to fetch transaction receipt on Base:", err?.message || err);
        return returnPaymentChallenge(c, "Unable to verify transaction receipt on Base mainnet. Transaction may be unconfirmed or invalid.", err?.message);
    }
    // 2. Transaction Status Check
    if (!receipt || receipt.status !== "success") {
        return returnPaymentChallenge(c, "Transaction on Base has not succeeded or receipt status is not success.", receipt ? { status: receipt.status, blockNumber: receipt.blockNumber?.toString() } : undefined);
    }
    // 3. Log Filtering & Decoding for ERC-20 USDC Transfer
    const configuredRecipient = config.x402WalletAddress || process.env.EVM_WALLET_ADDRESS || EXPECTED_RECIPIENT;
    let validTransferFound = false;
    let transferDetails = null;
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
                const { from, to, value } = decoded.args;
                const recipientMatches = to.toLowerCase() === EXPECTED_RECIPIENT.toLowerCase() ||
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
        }
        catch {
            // Continue inspecting subsequent logs
            continue;
        }
    }
    if (!validTransferFound) {
        return returnPaymentChallenge(c, `No valid ERC-20 USDC transfer to ${EXPECTED_RECIPIENT} of at least ${MIN_AMOUNT_USDC} USDC found in transaction logs.`);
    }
    // Record transaction hash in replay protection store upon successful verification
    await activeReplayStore.add(normalizedHash, {
        from: transferDetails?.from,
        to: transferDetails?.to,
        value: transferDetails?.value,
        blockNumber: receipt.blockNumber?.toString(),
    });
    // Mark payment verified on context for downstream route handlers
    c.set("x402.verified", true);
    c.set("x402.txHash", txHash);
    if (transferDetails) {
        c.set("x402.transfer", transferDetails);
    }
    console.log(`[x402] Verified Base USDC transfer: ${txHash} from ${transferDetails?.from} to ${transferDetails?.to} (amount: ${transferDetails?.value}, block: ${receipt.blockNumber})`);
    await next();
}
// Export typed Hono middleware handler
export const x402PaymentMiddleware = async (c, next) => {
    return handleX402(c, next);
};
export const x402Middleware = x402PaymentMiddleware;
//# sourceMappingURL=x402.js.map