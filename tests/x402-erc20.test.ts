import fs from "node:fs";
import path from "node:path";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  encodeEventTopics,
  encodeAbiParameters,
  parseUnits,
  parseAbiItem,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  x402PaymentMiddleware,
  USDC_CONTRACT_BASE,
  EXPECTED_RECIPIENT,
  MIN_AMOUNT_USDC,
  MIN_AMOUNT_UNITS,
  X402_PAYMENT_DOMAIN,
  X402_VOUCHER_TYPES,
  setReceiptGetterForTesting,
  resetReplayCache,
  FileBackedReplayStore,
} from "../src/middleware/x402.js";

describe("Strict x402 Base ERC-20 Payment Middleware", () => {
  const app = new Hono();

  app.post("/test-protected", x402PaymentMiddleware, (c) => {
    return c.json({
      success: true,
      verified: c.get("x402.verified"),
      txHash: c.get("x402.txHash"),
    });
  });

  test("missing X-Payment header returns 402 challenge with token and recipient details", async () => {
    const res = await app.request("http://localhost/test-protected", {
      method: "POST",
    });

    assert.equal(res.status, 402);
    assert.equal(res.headers.get("x-payment-required"), "true");
    assert.equal(res.headers.get("x-payment-price"), `${MIN_AMOUNT_USDC} USDC`);
    assert.equal(res.headers.get("x-payment-amount-units"), MIN_AMOUNT_UNITS.toString());
    assert.equal(res.headers.get("x-payment-network"), "base");
    assert.equal(res.headers.get("x-payment-token"), USDC_CONTRACT_BASE);
    assert.match(res.headers.get("www-authenticate") || "", /^X402 /);

    const body = (await res.json()) as any;
    assert.equal(body.error, "Payment Required");
    assert.equal(body.token, USDC_CONTRACT_BASE);
    assert.equal(body.amountMinorUnits, MIN_AMOUNT_UNITS.toString());
    assert.equal(body.network, "base");
  });

  test("malformed transaction hash returns 402 format error", async () => {
    const res = await app.request("http://localhost/test-protected", {
      method: "POST",
      headers: {
        "x-payment": "not-a-valid-hash",
      },
    });

    assert.equal(res.status, 402);
    assert.equal(res.headers.get("x-payment-required"), "true");

    const body = (await res.json()) as any;
    assert.equal(body.error, "Payment Required");
    assert.match(body.message, /Invalid transaction hash format/i);
  });

  test("non-existent hash fails Base receipt lookup and returns 402", async () => {
    const res = await app.request("http://localhost/test-protected", {
      method: "POST",
      headers: {
        "x-payment": "0x0000000000000000000000000000000000000000000000000000000000000001",
      },
    });

    assert.equal(res.status, 402);
    assert.equal(res.headers.get("x-payment-required"), "true");

    const body = (await res.json()) as any;
    assert.equal(body.error, "Payment Required");
    assert.match(body.message, /Unable to verify transaction receipt/i);
  });

  test("confirmed Base transaction without USDC transfer to recipient returns 402", async () => {
    // Confirmed transaction on Base that is not a USDC transfer to EXPECTED_RECIPIENT
    const res = await app.request("http://localhost/test-protected", {
      method: "POST",
      headers: {
        "x-payment": "0x018cfa1e9fc5053f93e9cd657ca66bcba9053d2dd9cb3056b9074c8759d06ffc",
      },
    });

    assert.equal(res.status, 402);
    assert.equal(res.headers.get("x-payment-required"), "true");

    const body = (await res.json()) as any;
    assert.equal(body.error, "Payment Required");
    assert.match(body.message, /No valid ERC-20 USDC transfer/i);
  });

  test("submitting a valid transaction hash the first time succeeds (200 OK), but submitting the exact same hash a second time fails with 402 replay protection", async () => {
    resetReplayCache();

    const validHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    // Encode a real Transfer log for Base USDC to EXPECTED_RECIPIENT for 0.05 USDC
    const transferAbi = parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    );
    const topics = encodeEventTopics({
      abi: [transferAbi],
      eventName: "Transfer",
      args: {
        from: "0x1111111111111111111111111111111111111111",
        to: EXPECTED_RECIPIENT,
      },
    });
    const data = encodeAbiParameters([{ type: "uint256" }], [parseUnits("0.05", 6)]);

    const mockReceipt = {
      status: "success",
      blockNumber: 12345678n,
      logs: [
        {
          address: USDC_CONTRACT_BASE,
          topics,
          data,
        },
      ],
    };

    setReceiptGetterForTesting(async (hash) => {
      if (hash.toLowerCase() === validHash.toLowerCase()) {
        return mockReceipt;
      }
      throw new Error("Transaction not found");
    });

    try {
      // First submission: should succeed with 200 OK
      const firstRes = await app.request("http://localhost/test-protected", {
        method: "POST",
        headers: {
          "x-payment": validHash,
        },
      });

      assert.equal(firstRes.status, 200);
      const firstBody = (await firstRes.json()) as any;
      assert.equal(firstBody.success, true);
      assert.equal(firstBody.verified, true);
      assert.equal(firstBody.txHash, validHash);

      // Second submission with exact same hash: must fail with 402 replay protection
      const secondRes = await app.request("http://localhost/test-protected", {
        method: "POST",
        headers: {
          "x-payment": validHash,
        },
      });

      assert.equal(secondRes.status, 402);
      assert.equal(secondRes.headers.get("x-payment-required"), "true");
      const secondBody = (await secondRes.json()) as any;
      assert.equal(secondBody.error, "Payment Error");
      assert.equal(
        secondBody.message,
        "Transaction hash has already been used (replay protection).",
      );
    } finally {
      setReceiptGetterForTesting(null);
      resetReplayCache();
    }
  });

  test("FileBackedReplayStore survives restart (persists consumed hashes across store instances)", async () => {
    const testFile = path.join(process.cwd(), ".data", "test-replay-restart.json");
    try {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      const store1 = new FileBackedReplayStore(testFile);
      await store1.add("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

      // Simulate process restart by instantiating a new store instance reading from disk
      const store2 = new FileBackedReplayStore(testFile);
      const isReplayed = await store2.has("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
      assert.equal(isReplayed, true);
    } finally {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
  });

  test("valid EIP-712 PaymentVoucher succeeds (200 OK) and replay submission is blocked (402)", async () => {
    resetReplayCache();
    const testSigner = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );

    const channelId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const cumulativeAmountUnits = parseUnits("0.05", 6); // 50,000 units
    const nonce = 1n;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 7200);

    const signature = await testSigner.signTypedData({
      domain: X402_PAYMENT_DOMAIN,
      types: X402_VOUCHER_TYPES,
      primaryType: "PaymentVoucher",
      message: {
        channelId,
        cumulativeAmountUnits,
        nonce,
        recipient: EXPECTED_RECIPIENT,
        expiry,
      },
    });

    const voucherPayload = {
      channelId,
      cumulativeAmountUnits: cumulativeAmountUnits.toString(),
      nonce: Number(nonce),
      recipient: EXPECTED_RECIPIENT,
      expiry: Number(expiry),
      signature,
    };

    try {
      // First submission: should succeed with 200 OK
      const res1 = await app.request("http://localhost/test-protected", {
        method: "POST",
        headers: {
          "x-payment-voucher": JSON.stringify(voucherPayload),
        },
      });

      assert.equal(res1.status, 200);
      const body1 = (await res1.json()) as any;
      assert.equal(body1.success, true);
      assert.equal(body1.verified, true);

      // Second submission: exact same voucher nonce must fail with 402 replay error
      const res2 = await app.request("http://localhost/test-protected", {
        method: "POST",
        headers: {
          "x-payment-voucher": JSON.stringify(voucherPayload),
        },
      });

      assert.equal(res2.status, 402);
      assert.equal(res2.headers.get("x-payment-required"), "true");
      const body2 = (await res2.json()) as any;
      assert.equal(body2.error, "Payment Error");
      assert.match(body2.message, /Payment voucher nonce has already been used/i);
    } finally {
      resetReplayCache();
    }
  });

  test("expired EIP-712 PaymentVoucher returns 402 challenge", async () => {
    const testSigner = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );

    const channelId = "0x2222222222222222222222222222222222222222222222222222222222222222";
    const cumulativeAmountUnits = parseUnits("0.05", 6);
    const nonce = 1n;
    const pastExpiry = BigInt(Math.floor(Date.now() / 1000) - 3600); // 1 hour in the past

    const signature = await testSigner.signTypedData({
      domain: X402_PAYMENT_DOMAIN,
      types: X402_VOUCHER_TYPES,
      primaryType: "PaymentVoucher",
      message: {
        channelId,
        cumulativeAmountUnits,
        nonce,
        recipient: EXPECTED_RECIPIENT,
        expiry: pastExpiry,
      },
    });

    const voucherPayload = {
      channelId,
      cumulativeAmountUnits: cumulativeAmountUnits.toString(),
      nonce: Number(nonce),
      recipient: EXPECTED_RECIPIENT,
      expiry: Number(pastExpiry),
      signature,
    };

    const res = await app.request("http://localhost/test-protected", {
      method: "POST",
      headers: {
        "x-payment-voucher": JSON.stringify(voucherPayload),
      },
    });

    assert.equal(res.status, 402);
    const body = (await res.json()) as any;
    assert.equal(body.error, "Payment Required");
    assert.match(body.message, /expired/i);
  });

  test("two-phase commit: downstream failure (500) leaves voucher uncommitted allowing retry", async () => {
    resetReplayCache();
    const testSigner = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );

    const channelId = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const cumulativeAmountUnits = parseUnits("0.10", 6);
    const nonce = 999n;
    const futureExpiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const signature = await testSigner.signTypedData({
      domain: X402_PAYMENT_DOMAIN,
      types: X402_VOUCHER_TYPES,
      primaryType: "PaymentVoucher",
      message: {
        channelId,
        cumulativeAmountUnits,
        nonce,
        recipient: EXPECTED_RECIPIENT,
        expiry: futureExpiry,
      },
    });

    const voucherPayload = {
      channelId,
      cumulativeAmountUnits: cumulativeAmountUnits.toString(),
      nonce: Number(nonce),
      recipient: EXPECTED_RECIPIENT,
      expiry: Number(futureExpiry),
      signature,
    };

    // Route that simulates a downstream failure
    let shouldFail = true;
    const failApp = new Hono();
    failApp.post("/test-failover", x402PaymentMiddleware, async (c) => {
      if (shouldFail) {
        return c.json({ error: "Downstream service error" }, 500);
      }
      return c.json({ success: true, processed: true }, 200);
    });

    // Attempt 1: Returns 500 downstream error
    const firstRes = await failApp.request("http://localhost/test-failover", {
      method: "POST",
      headers: {
        "x-payment-voucher": JSON.stringify(voucherPayload),
      },
    });

    assert.equal(firstRes.status, 500);
    assert.equal(firstRes.headers.get("x-payment-settled"), "false");
    assert.equal(firstRes.headers.get("x-payment-refunded"), "true");

    // Attempt 2: Service recovers, exact same voucher payload is retried
    shouldFail = false;
    const secondRes = await failApp.request("http://localhost/test-failover", {
      method: "POST",
      headers: {
        "x-payment-voucher": JSON.stringify(voucherPayload),
      },
    });

    assert.equal(secondRes.status, 200);
    assert.equal(secondRes.headers.get("x-payment-settled"), "true");
    const secondBody = (await secondRes.json()) as any;
    assert.equal(secondBody.success, true);
  });

  test("UUID-bound nonces for parallel sub-agents are supported and verified", async () => {
    resetReplayCache();
    const testSigner = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );

    const channelId = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    const cumulativeAmountUnits = parseUnits("0.25", 6);
    const uuidNonce = "123e4567-e89b-12d3-a456-426614174000";
    const futureExpiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const { parseNonceToBigInt } = await import("../src/middleware/x402.js");
    const parsedBigInt = parseNonceToBigInt(uuidNonce);

    const signature = await testSigner.signTypedData({
      domain: X402_PAYMENT_DOMAIN,
      types: X402_VOUCHER_TYPES,
      primaryType: "PaymentVoucher",
      message: {
        channelId,
        cumulativeAmountUnits,
        nonce: parsedBigInt,
        recipient: EXPECTED_RECIPIENT,
        expiry: futureExpiry,
      },
    });

    const voucherPayload = {
      channelId,
      cumulativeAmountUnits: cumulativeAmountUnits.toString(),
      nonce: uuidNonce,
      recipient: EXPECTED_RECIPIENT,
      expiry: Number(futureExpiry),
      signature,
    };

    const res = await app.request("http://localhost/test-protected", {
      method: "POST",
      headers: {
        "x-payment-voucher": JSON.stringify(voucherPayload),
      },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(res.headers.get("x-payment-settled"), "true");
  });
});
