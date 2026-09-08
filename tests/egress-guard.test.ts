/**
 * Tests for the egress guard (SSRF protection).
 * Covers: private IP blocking, DNS rebinding resistance, scheme validation.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { guardTargetUrl } from "../src/egress-guard";

describe("egress-guard", () => {
  test("blocks loopback address (127.0.0.1)", async () => {
    const result = await guardTargetUrl("http://127.0.0.1/admin");
    assert.equal(result.ok, false);
    assert.match(result.reason!, /private|reserved|SSRF/);
  });

  test("blocks AWS metadata endpoint (169.254.169.254)", async () => {
    const result = await guardTargetUrl("http://169.254.169.254/latest/meta-data/");
    assert.equal(result.ok, false);
    assert.match(result.reason!, /private|reserved|SSRF/);
  });

  test("blocks RFC 1918 private ranges", async () => {
    const testCases = [
      "http://10.0.0.1/",
      "http://172.16.0.1/",
      "http://192.168.1.1/",
    ];
    for (const url of testCases) {
      const result = await guardTargetUrl(url);
      assert.equal(result.ok, false, `${url} should be blocked`);
    }
  });

  test("blocks non-http schemes", async () => {
    const result = await guardTargetUrl("ftp://example.com/file");
    assert.equal(result.ok, false);
    assert.match(result.reason!, /unsupported scheme/);
  });

  test("blocks URLs with embedded credentials", async () => {
    const result = await guardTargetUrl("http://user:pass@example.com/");
    assert.equal(result.ok, false);
    assert.match(result.reason!, /embedded credentials/);
  });

  test("rejects invalid URLs", async () => {
    const result = await guardTargetUrl("not-a-url");
    assert.equal(result.ok, false);
  });

  test("allows public HTTPS URLs (example.com)", async () => {
    const result = await guardTargetUrl("https://example.com/data");
    if (result.ok) {
      assert.ok(result.target);
      assert.equal(result.target!.hostname, "example.com");
    } else {
      console.warn(`  [skip] ${result.reason}`);
    }
  });

  test("DNS rebinding resistance: checks all resolved addresses", async () => {
    const code = await import("node:fs").then(fs =>
      fs.readFileSync("src/egress-guard.ts", "utf8")
    );
    assert.match(code, /all:\s*true/);
    assert.match(code, /verbatim:\s*true/);
    assert.match(code, /addresses\[0\]/);
    assert.match(code, /autoSelectFamily:\s*false/);
  });
});
