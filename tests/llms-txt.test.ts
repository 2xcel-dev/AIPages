import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateLlmsTxt } from "../src/views/llmsTxt.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import type { Tool } from "../src/types.js";

describe("llms.txt Machine Manifest for AI Crawlers", () => {
  const tools: Tool[] = CANONICAL_AUS_TOOLS.map((t) => ({
    ...t,
    updatedAt: new Date(),
  }));

  it("generates valid standard markdown starting with title and summary blockquote", () => {
    const markdown = generateLlmsTxt(tools);
    assert.ok(markdown.startsWith("# AIPages\n\n> Machine-native discovery registry"));
    assert.ok(markdown.includes("## Core Machine Endpoints"));
    assert.ok(markdown.includes("## Payment & Execution Protocol (x402)"));
    assert.ok(markdown.includes("## First-Party Agent Utility Services (AUS) Fleet"));
  });

  it("indexes core machine-readable routes", () => {
    const markdown = generateLlmsTxt(tools);
    assert.ok(markdown.includes("/search"));
    assert.ok(markdown.includes("/api/tools"));
    assert.ok(markdown.includes("/capabilities"));
    assert.ok(markdown.includes("/mcp.json"));
    assert.ok(markdown.includes("/api/feed.json"));
    assert.ok(markdown.includes("/openapi.json"));
    assert.ok(markdown.includes("/api/invoke/:namespace"));
  });

  it("lists all first-party AUS fleet tools with pricing and capability tags", () => {
    const markdown = generateLlmsTxt(tools);
    for (const tool of CANONICAL_AUS_TOOLS) {
      assert.ok(markdown.includes(tool.name), `Must include tool name: ${tool.name}`);
      assert.ok(markdown.includes(`/tool/${tool.namespace}`), `Must link to tool: ${tool.namespace}`);
    }
  });

  it("excludes rejected or pending tools from the llms.txt index", () => {
    const pendingTool: Tool = {
      namespace: "net.2xcel.pending.tool",
      name: "pending_tool",
      description: "Should not be visible to LLMs yet.",
      connectionType: "http",
      healthStatus: "unknown",
      status: "pending",
      schema: {},
      updatedAt: new Date(),
    };

    const markdown = generateLlmsTxt([...tools, pendingTool]);
    assert.ok(!markdown.includes("net.2xcel.pending.tool"));
  });
});
