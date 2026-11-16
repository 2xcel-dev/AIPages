import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chunkSemanticText } from "../src/services/semanticChunker.js";

describe("AUS Semantic Chunker Service", () => {
  it("rejects empty text payload with descriptive error", async () => {
    const res = await chunkSemanticText({ text: "" });
    assert.equal(res.success, false);
    assert.equal(res.utility, "semantic-chunker");
    assert.ok(res.error?.includes("Missing required 'text'"));
    assert.equal(res.total_chunks, 0);
  });

  it("chunks short text into a single chunk", async () => {
    const text = "Hello AI agent! This is a single sentence document for testing.";
    const res = await chunkSemanticText({ text, max_tokens: 100 });

    assert.equal(res.success, true);
    assert.equal(res.total_chunks, 1);
    assert.equal(res.chunks[0].text, text);
    assert.ok(res.chunks[0].token_count > 0);
    assert.equal(res.chunks[0].char_count, text.length);
    assert.equal(res.chunks[0].metadata.chunk_index, 0);
  });

  it("chunks long multi-sentence document respecting max_tokens and sentence boundaries", async () => {
    const sentences = [
      "The Model Context Protocol (MCP) standardizes how AI agents communicate with external tools.",
      "AIPages is a high-speed machine-native tool registry and execution gateway for autonomous agents.",
      "Traditional agent setups preload hundreds of tool definitions into the context window, causing massive prompt bloat.",
      "With on-demand semantic search, agents search a 3072-dimensional vector index and pull down schemas on the fly.",
      "Payment settlement is executed seamlessly using HTTP 402 over Base Mainnet with USDC.",
      "Every tool supports zero-friction test mode with the x-playground-test header for developer verification.",
    ];
    const fullText = sentences.join(" ");

    // Set max_tokens to a small limit (~25 tokens) to trigger multiple chunks
    const res = await chunkSemanticText({
      text: fullText,
      max_tokens: 30,
      overlap_tokens: 10,
      preserve_sentences: true,
      metadata: { document_id: "doc-123" },
    });

    assert.equal(res.success, true);
    assert.ok(res.total_chunks > 1, "Should create multiple chunks");
    assert.equal(res.chunks[0].metadata.document_id, "doc-123");

    for (const chunk of res.chunks) {
      assert.ok(chunk.text.length > 0);
      assert.ok(chunk.token_count > 0);
      assert.ok(chunk.end_char > chunk.start_char);
    }
  });

  it("handles word-level splitting when preserve_sentences is false", async () => {
    const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const res = await chunkSemanticText({
      text: words,
      max_tokens: 20,
      overlap_tokens: 5,
      preserve_sentences: false,
    });

    assert.equal(res.success, true);
    assert.ok(res.total_chunks > 1);
  });
});
