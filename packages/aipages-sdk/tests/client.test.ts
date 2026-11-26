import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AIPagesClient, AIPagesBudgetExceededError, AIPagesPaymentError } from "../src/client.js";
import { createAIPagesActionProvider } from "../src/agentkit.js";

describe("AIPagesClient SDK Unit Tests", () => {
  it("initializes with default options", () => {
    const client = new AIPagesClient();
    assert.equal(client.totalSpentUsdc, 0);
  });

  it("enforces maxCostPerCall budget limit", async () => {
    // Custom mock fetch that returns a 402 challenge with 1.00 USDC price
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return {
        status: 402,
        ok: false,
        json: async () => ({
          error: "Payment Required",
          price: "1.00 USDC",
          amountMinorUnits: "1000000",
          token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          address: "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
          network: "base",
        }),
      } as any;
    };

    try {
      const client = new AIPagesClient({
        maxCostPerCallUsdc: 0.10, // Max 0.10, tool costs 1.00
      });

      await assert.rejects(
        async () => {
          await client.invoke("net.2xcel.aus.expensive-tool", { foo: "bar" });
        },
        (err: Error) => {
          assert.match(err.message, /exceeds maxPerCall limit/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles free sandbox testing mode without payment", async () => {
    const originalFetch = globalThis.fetch;
    let sentPlaygroundHeader = false;

    globalThis.fetch = async (url: any, init: any) => {
      if (init?.headers?.["x-playground-test"] === "true") {
        sentPlaygroundHeader = true;
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({
          success: true,
          output: "sanitized",
        }),
      } as any;
    };

    try {
      const client = new AIPagesClient();
      const res = await client.invoke(
        "net.2xcel.aus.schema-sanitizer",
        { data: { raw: "test" } },
        { playgroundTest: true }
      );

      assert.equal(sentPlaygroundHeader, true);
      assert.equal(res.success, true);
      assert.equal((res.data as any).output, "sanitized");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("creates valid Coinbase AgentKit Action Provider", () => {
    const provider = createAIPagesActionProvider();
    assert.equal(provider.name, "aipages_tool_discovery_and_execution");
    assert.equal(provider.actions.length, 3);

    const actionNames = provider.actions.map((a) => a.name);
    assert.ok(actionNames.includes("search_aipages_tools"));
    assert.ok(actionNames.includes("invoke_aipages_tool"));
    assert.ok(actionNames.includes("list_aipages_canonical_fleet"));
  });
});
