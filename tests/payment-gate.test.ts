/**
 * Tests for the x402 payment gate.
 * Covers: 402 response with payment requirements when payment header absent,
 * free tool bypass, invalid payload handling.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

// Set wallet BEFORE import — config.ts reads env at module load time.
process.env.X402_WALLET_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const { default: ingressRouter, setStore } = await import("../src/invocation");
const { InMemoryToolStore } = await import("../src/db");

type ToolSchema = { type?: string; properties?: Record<string, unknown>; required?: string[] };

interface Tool {
  namespace: string;
  name: string;
  description: string;
  schema: ToolSchema;
  connectionType: "http";
  endpointUrl?: string;
  healthStatus: "active" | "inactive" | "unknown";
  status: "active" | "inactive" | "pending" | "rejected";
  updatedAt: Date;
  pricing?: { model: "free" | "freemium" | "paid"; costPerCall: number };
}

const testTool: Tool = {
  namespace: "test:premium",
  name: "PremiumTest",
  description: "A premium test tool",
  schema: { type: "object", properties: {}, required: [] },
  connectionType: "http",
  endpointUrl: undefined,
  healthStatus: "active",
  status: "active",
  updatedAt: new Date(),
  pricing: { model: "paid", costPerCall: 0.25 },
};

const freeTool: Tool = {
  ...testTool,
  namespace: "test:free",
  name: "FreeTest",
  pricing: { model: "free", costPerCall: 0 },
};

const invalidPayloadTool: Tool = {
  ...testTool,
  namespace: "test:invalid",
  name: "InvalidPayload",
};

describe("x402 payment gate", () => {
  let server: ReturnType<typeof serve>;
  const baseUrl = "http://localhost:4001";

  before(async () => {
    const store = new InMemoryToolStore();
    await store.upsert(testTool);
    await store.upsert(freeTool);
    await store.upsert(invalidPayloadTool);
    setStore(store, undefined);

    const app = new Hono();
    app.route("/api/invoke", ingressRouter);

    server = serve({ fetch: app.fetch, port: 4001 });
  });

  after(() => {
    server.close();
  });

  test("premium tool without payment header returns 402 with x402 payment requirements", async () => {
    const res = await fetch(`${baseUrl}/api/invoke/test:premium`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent-ID": "test-agent" },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 402);
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "Payment required");
    // x402 payment requirements in the response body
    const payment = body.payment as Record<string, unknown> | undefined;
    assert.ok(payment, "expected payment field in 402 response");
    assert.equal(payment.x402Version, 1);
    assert.ok(Array.isArray(payment.accepts), "accepts should be an array of payment requirements");

    // Verify the payment requirement structure
    const req = (payment.accepts as Array<Record<string, unknown>>)[0];
    assert.ok(req, "at least one payment requirement expected");
    assert.equal(req.scheme, "exact");
    assert.equal(req.payTo, "0x1234567890abcdef1234567890abcdef12345678");
    // amount is in atomic USDC units (6 decimals) → 0.25 * 1e6 = 250000
    assert.equal(req.amount, "250000");
    assert.equal(req.asset, "USDC");
  });

  test("premium tool with invalid payment payload returns 402", async () => {
    const res = await fetch(`${baseUrl}/api/invoke/test:premium`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-ID": "test-agent",
        "x-payment": "fake-payment-header",
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 402);
    const body = await res.json() as Record<string, unknown>;
    assert.equal(body.error, "Payment required");
  });

  test("free tool requires no payment header (502 — no endpoint)", async () => {
    const res = await fetch(`${baseUrl}/api/invoke/test:free`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent-ID": "test-agent" },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 502);
    const body = await res.json() as Record<string, unknown>;
    assert.match(body.error as string, /no endpointUrl/i);
  });
});
