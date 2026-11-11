import test from "node:test";
import assert from "node:assert/strict";
import { compressContext } from "../src/services/contextCompressor.js";

test("Context Compressor Service - Unit Test Suite", async (t) => {
  await t.test("rejects invalid input content", () => {
    const res = compressContext({ content: null as any });
    assert.equal(res.success, false);
    assert.match(res.error || "", /Invalid input/);
  });

  await t.test("passes through short content within token budget without alteration", () => {
    const shortText = "The quick brown fox jumps over the lazy dog.";
    const res = compressContext({ content: shortText, budget_tokens: 500 });
    assert.equal(res.success, true);
    assert.equal(res.compressed_content, shortText);
    assert.equal(res.metrics.compression_ratio_pct, 0);
  });

  await t.test("compresses oversized text payload within target token budget", () => {
    const repeatedText = Array(100)
      .fill("Enterprise AI agents require high performance context compression to minimize inference token bills on Base Mainnet https://aipages.tech with transaction id 0x1234567890abcdef.")
      .join(" ");

    const res = compressContext({
      content: repeatedText,
      budget_tokens: 200,
      format: "facts",
      preserve_entities: true,
    });

    assert.equal(res.success, true);
    assert.ok(res.metrics.compressed_estimated_tokens <= 220); // within bounded budget
    assert.ok(res.metrics.compression_ratio_pct > 50);
    assert.ok(typeof res.compressed_content === "string");
    assert.ok((res.compressed_content as string).startsWith("•"));
    assert.ok(res.extracted_entities && res.extracted_entities.length > 0);
  });

  await t.test("prunes and compresses deep JSON objects without crashing", () => {
    const deepObject = {
      user: "agent_42",
      metadata: {
        timestamp: "2026-11-11",
        empty_field: null,
        redundant_notes: "A".repeat(500),
      },
      items: Array(25).fill({ id: "item", status: "active" }),
    };

    const res = compressContext({
      content: deepObject,
      budget_tokens: 150,
      format: "json",
    });

    assert.equal(res.success, true);
    assert.ok(typeof res.compressed_content === "object");
    assert.ok((res.compressed_content as any).user === "agent_42");
  });
});
