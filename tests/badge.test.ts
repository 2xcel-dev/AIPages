import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";
import { generateBadgeSvg } from "../src/views/badge.js";

describe("Viral GitHub Verification Badge System", () => {
  describe("generateBadgeSvg unit helper", () => {
    it("generates valid SVG string with AIPages brand and default status", () => {
      const svg = generateBadgeSvg("net.2xcel.aus.browser-stealth");
      assert.ok(svg.startsWith("<svg"));
      assert.ok(svg.endsWith("</svg>"));
      assert.ok(svg.includes("AIPages"));
      assert.ok(svg.includes("Verified x402"));
      assert.ok(svg.includes("width="));
      assert.ok(svg.includes("height=\"20\""));
    });

    it("supports custom status and color overrides", () => {
      const svg = generateBadgeSvg("my-custom-tool", {
        label: "AIPages",
        status: "Active 99.9%",
        color: "#22c55e",
      });
      assert.ok(svg.includes("Active 99.9%"));
      assert.ok(svg.includes("#22c55e"));
    });
  });

  describe("Badge HTTP Routes (/badge/:slug & /badge/:slug.svg)", () => {
    it("GET /badge/:slug.svg returns 200 with image/svg+xml", async () => {
      const res = await app.request("/badge/net.2xcel.aus.schema-sanitizer.svg");
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("image/svg+xml"));
      assert.ok(res.headers.get("cache-control")?.includes("public"));

      const body = await res.text();
      assert.ok(body.includes("<svg"));
      assert.ok(body.includes("AIPages"));
    });

    it("GET /badge/:slug without .svg extension returns valid SVG", async () => {
      const res = await app.request("/badge/browser-stealth");
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("image/svg+xml"));

      const body = await res.text();
      assert.ok(body.includes("<svg"));
    });

    it("GET /api/badge/:slug.svg alias returns valid SVG", async () => {
      const res = await app.request("/api/badge/financial-audit.svg");
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get("content-type")?.includes("image/svg+xml"));
    });
  });
});
