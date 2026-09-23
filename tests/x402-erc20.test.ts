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
import {
  x402PaymentMiddleware,
  USDC_CONTRACT_BASE,
  EXPECTED_RECIPIENT,
  MIN_AMOUNT_USDC,
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
    assert.equal(res.headers.get("x-payment-network"), "base");
    assert.equal(res.headers.get("x-payment-token"), USDC_CONTRACT_BASE);

    const body = (await res.json()) as any;
    assert.equal(body.error, "Payment Required");
    assert.equal(body.token, USDC_CONTRACT_BASE);
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
});
