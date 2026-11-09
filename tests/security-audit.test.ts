/**
 * Security & Input Hardening Verification Tests
 *
 * Validates fixes applied from the Comprehensive Code & Security Review:
 *  - VM prototype escape and sandbox containment
 *  - Cryptographic timing attack defense and algorithm allowlists
 *  - Schema prototype pollution and recursion depth limits
 *  - Geospatial coordinate boundary checks
 *  - Financial audit volume and array DoS limits
 *  - Media transcoder payload memory limits
 *  - In-process first-party tool dispatch
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeInSandbox } from "../src/services/sandboxExecution.js";
import { attestVerification } from "../src/services/verificationOracle.js";
import { sanitizeSchema } from "../src/services/schemaSanitizer.js";
import { verifyGeospatial } from "../src/services/geospatialVerifier.js";
import { auditFinancialTransactions } from "../src/services/financialAudit.js";
import { inspectMedia } from "../src/services/mediaTranscoder.js";
import { executeBrowserStealth } from "../src/services/browserStealth.js";
import { sanitizePayload } from "../src/sanitizer.js";

describe("Hardened Security & Service Layer Tests", () => {
  describe("Sandbox Execution (Node.js VM Hardening)", () => {
    it("blocks sandbox escape via constructor.constructor", () => {
      const escapeAttempt = "output = this.constructor.constructor('return process')()";
      const res = executeInSandbox({ code: escapeAttempt });
      assert.equal(res.success, false);
      assert.match(res.error || "", /forbidden keyword/i);
    });

    it("blocks process, child_process, and require imports", () => {
      const res1 = executeInSandbox({ code: "output = process.env" });
      assert.equal(res1.success, false);

      const res2 = executeInSandbox({ code: "output = require('fs')" });
      assert.equal(res2.success, false);
    });

    it("rejects code exceeding maximum length ceiling", () => {
      const hugeCode = "var a = 1;\n".repeat(1500);
      const res = executeInSandbox({ code: hugeCode });
      assert.equal(res.success, false);
      assert.match(res.error || "", /exceeds maximum size limit/i);
    });

    it("safely executes legitimate arithmetic inside sandbox", () => {
      const res = executeInSandbox({
        code: "output = input.a + input.b",
        context_data: { a: 21, b: 21 },
      });
      assert.equal(res.success, true);
      assert.equal(res.result, 42);
    });
  });

  describe("Verification Oracle (Crypto Hardening)", () => {
    it("rejects unsupported hashing algorithms gracefully without crashing", () => {
      const res = attestVerification({
        data: "agent payload",
        algorithm: "unsupported-malicious-algo",
      });
      assert.equal(res.success, false);
      assert.match(res.error || "", /unsupported digest algorithm/i);
    });

    it("correctly matches hash using constant-time comparison", () => {
      const data = "autonomous execution state";
      const res = attestVerification({
        data,
        algorithm: "sha256",
        expected_hash: "wrong_hash_length",
      });
      assert.equal(res.success, true);
      assert.equal(res.attestation?.matches_expected, false);
    });
  });

  describe("Schema Sanitizer (Prototype Pollution & Recursion Depth)", () => {
    it("strips prototype pollution keys (__proto__, constructor, prototype)", () => {
      const payload = {
        normal_key: "hello",
        __proto__: { admin: true },
        constructor: { evil: true },
        nested: {
          prototype: { hacked: true },
          user: "agent-007",
        },
      };

      const res = sanitizeSchema({ data: payload as any });
      assert.equal(res.success, true);
      assert.equal(Object.prototype.hasOwnProperty.call(res.data, "__proto__"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(res.data, "constructor"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(res.data.nested || {}, "prototype"), false);
      assert.equal(res.data.normal_key, "hello");
    });

    it("prevents stack overflow on deeply nested JSON structures", () => {
      let deeplyNested: any = { value: "core" };
      for (let i = 0; i < 50; i++) {
        deeplyNested = { level: deeplyNested };
      }

      const res = sanitizeSchema({ data: deeplyNested });
      assert.equal(res.success, true);
      // Recursion depth was bounded without RangeError
    });
  });

  describe("Geospatial Verifier (Coordinate Boundary Hardening)", () => {
    it("rejects invalid out-of-range coordinates", () => {
      const res = verifyGeospatial({
        origin: { lat: 105.0, lng: -73.985 }, // Invalid latitude > 90
        destination: { lat: 34.052, lng: -118.243 },
      });
      assert.equal(res.success, false);
      assert.match(res.error || "", /Invalid or missing 'origin' coordinates/i);
    });

    it("rejects non-numeric coordinates", () => {
      const res = verifyGeospatial({
        origin: { lat: NaN, lng: 0 } as any,
        destination: { lat: 0, lng: 0 },
      });
      assert.equal(res.success, false);
    });

    it("calculates distance accurately for valid GPS coordinates", () => {
      const res = verifyGeospatial({
        origin: { lat: 40.7128, lng: -74.006 },
        destination: { lat: 40.7589, lng: -73.9851 },
      });
      assert.equal(res.success, true);
      assert.ok(typeof res.calculation?.distance_km === "number");
    });
  });

  describe("Financial Audit (Batch & Amount Hardening)", () => {
    it("rejects non-array payloads", () => {
      const res = auditFinancialTransactions({ transactions: null as any });
      assert.equal(res.success, false);
      assert.match(res.error || "", /must be a valid array/i);
    });

    it("sanitizes negative or NaN amounts safely", () => {
      const res = auditFinancialTransactions({
        transactions: [
          { id: "tx_1", amount: -500 },
          { id: "tx_2", amount: NaN as any },
          { id: "tx_3", amount: 150 },
        ],
      });
      assert.equal(res.success, true);
      assert.equal(res.audit_summary?.total_volume, 150); // Negative and NaN treated as 0
    });
  });

  describe("Media Transcoder (Memory DoS Protection)", () => {
    it("rejects payloads exceeding the base64 size ceiling", () => {
      const oversizedPayload = "A".repeat(15 * 1024 * 1024);
      const res = inspectMedia({ base64_data: oversizedPayload });
      assert.equal(res.success, false);
      assert.match(res.error || "", /exceeds maximum size limit/i);
    });

    it("analyzes valid base64 payload cleanly", () => {
      const validBase64 = Buffer.from("Agent Utility Services").toString("base64");
      const res = inspectMedia({ base64_data: validBase64, mime_type: "text/plain" });
      assert.equal(res.success, true);
      assert.equal(res.media_analysis?.is_valid_binary, true);
    });
  });

  describe("Browser Stealth Engine (Anti-Bot & SSRF Hardening)", () => {
    it("blocks SSRF attempts targeting private or loopback networks", async () => {
      const res = await executeBrowserStealth({ url: "http://127.0.0.1:8080/internal-admin" });
      assert.equal(res.success, false);
      assert.match(res.error || "", /SSRF blocked/i);
    });

    it("rejects non-http protocols (e.g. file:// or ftp://)", async () => {
      const res = await executeBrowserStealth({ url: "file:///etc/passwd" });
      assert.equal(res.success, false);
      assert.match(res.error || "", /only HTTP and HTTPS are permitted/i);
    });

    it("successfully returns stealth-extracted markdown for valid public URL", async () => {
      const res = await executeBrowserStealth({
        url: "https://example.com/products/agent-kit",
        extractMode: "markdown",
      });
      assert.equal(res.success, true);
      assert.equal(res.utility, "browser-stealth");
      assert.equal(res.anti_bot_bypassed, true);
      assert.ok(res.content.includes("https://example.com/products/agent-kit"));
      assert.ok(res.token_count > 0);
    });
  });

  describe("Sanitizer Payload Scanner (Cycle & Depth Protection)", () => {
    it("handles deeply nested payloads without RangeError call stack overflow", () => {
      let nested: any = { prompt: "legitimate agent input" };
      for (let i = 0; i < 40; i++) {
        nested = { child: nested };
      }
      const scanResult = sanitizePayload(nested);
      assert.equal(scanResult.ok, true);
    });
  });

  describe("In-Process First-Party Tool Dispatch", () => {
    it("dispatches net.2xcel.aus.schema-sanitizer directly in-process with execution results", async () => {
      const { default: ingressRouter, setStore } = await import("../src/invocation.js");
      const { InMemoryToolStore } = await import("../src/db.js");
      const { CANONICAL_AUS_TOOLS } = await import("../src/data/ausTools.js");
      const { Hono } = await import("hono");

      const store = new InMemoryToolStore();
      for (const t of CANONICAL_AUS_TOOLS) {
        // Mark as free for unit test execution bypass
        await store.upsert({
          ...t,
          pricing: { model: "free", costPerCall: 0 },
          updatedAt: new Date(),
        } as any);
      }
      setStore(store, undefined);

      const app = new Hono();
      app.route("/api/invoke", ingressRouter);

      const res = await app.request("/api/invoke/net.2xcel.aus.schema-sanitizer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-ID": "test-agent",
        },
        body: JSON.stringify({
          data: {
            user_input: "<b>John Doe</b>",
            api_key: "secret_12345",
          },
          rules: {
            stripHtml: true,
            maskFields: ["api_key"],
          },
        }),
      });

      assert.equal(res.status, 200);
      const body = (await res.json()) as any;
      assert.equal(body.status, "success");
      assert.equal(body.statusCode, 200);
      assert.ok(body.result, "expected execution result in response");
      assert.equal(body.result.utility, "schema-sanitizer");
      assert.equal(body.result.data.user_input, "John Doe");
      assert.equal(body.result.data.api_key, "********");
    });
  });
});
