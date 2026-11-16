import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { renderPlaygroundPage } from "../src/views/playgroundPage.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import type { Tool } from "../src/types.js";

describe("Interactive Tool Sandbox Playground (/playground)", () => {
  let app: Hono;
  const tools = CANONICAL_AUS_TOOLS as unknown as Tool[];

  before(() => {
    app = new Hono();
    app.get("/playground", (c) => {
      const selected = c.req.query("tool");
      return c.html(renderPlaygroundPage(tools, selected));
    });
  });

  it("renders /playground with HTTP 200 and interactive controls", async () => {
    const res = await app.request("/playground");
    assert.equal(res.status, 200);
    const html = await res.text();

    assert.ok(html.includes("Autonomous Tool Sandbox Playground"));
    assert.ok(html.includes("0-Friction Test Mode"));
    assert.ok(html.includes("Base x402 Settlement"));
    assert.ok(html.includes("Select Tool:"));
    assert.ok(html.includes("net.2xcel.aus.schema-sanitizer"));
    assert.ok(html.includes("net.2xcel.aus.semantic-chunker"));
    assert.ok(html.includes("btn-execute"));
    assert.ok(html.includes("Live Response Inspector"));
  });

  it("preselects specific tool when ?tool= query parameter is passed", async () => {
    const res = await app.request("/playground?tool=net.2xcel.aus.semantic-chunker");
    assert.equal(res.status, 200);
    const html = await res.text();

    assert.ok(html.includes('value="net.2xcel.aus.semantic-chunker" selected'));
    assert.ok(html.includes("POST /tool/net.2xcel.aus.semantic-chunker"));
  });

  it("has zero raw emoji characters in generated HTML", async () => {
    const res = await app.request("/playground");
    const html = await res.text();

    // Regex for common emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.equal(
      emojiRegex.test(html),
      false,
      "Playground page must contain strictly zero raw emojis (SVG vector icons only)",
    );
  });
});
