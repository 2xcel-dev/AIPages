import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";
import {
  validateToolRecord,
  validateFirstPartyToolRecord,
  assertValidFirstPartyTools,
  validateCatalog,
} from "../src/validation/toolValidator.js";
import { deriveReliability, type Tool } from "../src/types.js";

describe("Tool Validation Guardrail & First-Party AUS Compliance", () => {
  describe("Authoritative First-Party AUS Fleet", () => {
    it("verifies all 8 canonical AUS tools exist and pass strict assertion check", () => {
      assert.equal(CANONICAL_AUS_TOOLS.length, 8);
      assert.doesNotThrow(() => {
        assertValidFirstPartyTools(CANONICAL_AUS_TOOLS as unknown as Tool[]);
      });
    });

    it("verifies each canonical AUS tool resolves strictly to reliability 'unchecked'", () => {
      for (const tool of CANONICAL_AUS_TOOLS) {
        assert.equal(tool.healthStatus, "unknown");
        assert.equal(tool.lastChecked, undefined);

        const reliability = deriveReliability(tool as unknown as Tool);
        assert.equal(
          reliability.reliability,
          "unchecked",
          `Tool ${tool.namespace} must have reliability 'unchecked'`,
        );
        assert.equal(reliability.lastCheckedIso, null);
        assert.equal(reliability.failureReason, null);
      }
    });

    it("verifies canonical AUS tools meet all mandatory first-party criteria", () => {
      for (const tool of CANONICAL_AUS_TOOLS) {
        const res = validateFirstPartyToolRecord(tool);
        assert.equal(res.valid, true, `Tool ${tool.namespace} failed: ${res.errors.join(", ")}`);
        assert.equal(res.errors.length, 0);

        // Required specifications
        assert.ok(tool.endpointUrl?.startsWith("https://aipages.tech/tool/"));
        assert.ok(tool.capabilities && tool.capabilities.length >= 1);
        assert.equal(tool.pricing?.model, "paid");
        assert.ok(tool.pricing && tool.pricing.costPerCall > 0);
        assert.ok(tool.authentication && tool.authentication.includes("x402"));
        assert.equal(tool.rateLimit, "100 requests per 60 seconds per IP");
      }
    });
  });

  describe("Namespace Validation Guardrails", () => {
    it("rejects records with missing or empty namespace", () => {
      const res = validateToolRecord({
        name: "test_tool",
        description: "A valid tool description with sufficient length.",
        connectionType: "http",
        healthStatus: "unknown",
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("Missing required field: namespace")));
    });

    it("rejects non-reverse-domain namespace format (spaces, uppercase, symbols)", () => {
      const invalidNamespaces = [
        "invalid namespace with spaces",
        "UPPERCASE.NAMESPACE",
        "net.2xcel..double_dot",
        "net/slash/namespace",
        ".leading.dot",
        "trailing.dot.",
      ];

      for (const ns of invalidNamespaces) {
        const res = validateToolRecord({
          namespace: ns,
          name: "test_tool",
          description: "A valid tool description with sufficient length.",
          connectionType: "http",
          healthStatus: "unknown",
        });
        assert.equal(res.valid, false, `Expected namespace "${ns}" to be invalid`);
        assert.ok(res.errors.some((e) => e.includes("Invalid namespace format")));
      }
    });

    it("rejects non-canonical namespace for first-party tools", () => {
      const res = validateFirstPartyToolRecord({
        namespace: "com.thirdparty.tool",
        name: "third_party",
        description: "First-party claims with external namespace.",
        connectionType: "http",
        endpointUrl: "https://aipages.tech/tool/third_party",
        healthStatus: "unknown",
        capabilities: ["test"],
        pricing: { model: "paid", costPerCall: 0.1 },
        authentication: "x402",
        rateLimit: "100 req/60s",
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("First-party AUS tool namespace")));
    });
  });

  describe("Endpoint & Network Protocol Guardrails", () => {
    it("rejects first-party tool with non-HTTPS endpoint", () => {
      const res = validateFirstPartyToolRecord({
        namespace: "net.2xcel.aus.insecure-test",
        name: "insecure_tool",
        description: "Valid description for insecure testing tool.",
        connectionType: "http",
        endpointUrl: "http://aipages.tech/tool/insecure-test",
        healthStatus: "unknown",
        capabilities: ["testing"],
        pricing: { model: "paid", costPerCall: 0.1 },
        authentication: "x402",
        rateLimit: "100 req/60s",
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("First-party AUS endpoint must use HTTPS")));
    });

    it("rejects first-party tool with non-canonical host", () => {
      const res = validateFirstPartyToolRecord({
        namespace: "net.2xcel.aus.wrong-host",
        name: "wrong_host",
        description: "Valid description for wrong host testing tool.",
        connectionType: "http",
        endpointUrl: "https://other-service.com/tools/wrong-host",
        healthStatus: "unknown",
        capabilities: ["testing"],
        pricing: { model: "paid", costPerCall: 0.1 },
        authentication: "x402",
        rateLimit: "100 req/60s",
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("must reside on canonical host \"aipages.tech\"")));
    });

    it("rejects completely malformed endpoint URLs", () => {
      const res = validateToolRecord({
        namespace: "net.example.tool",
        name: "bad_url",
        description: "Valid description with broken endpoint URL.",
        connectionType: "http",
        endpointUrl: "not-a-valid-url",
        healthStatus: "unknown",
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("Endpoint URL is not a valid absolute URL")));
    });
  });

  describe("Capability, Pricing, & Authentication Guardrails", () => {
    it("rejects first-party tools with missing or empty capabilities array", () => {
      const baseTool = {
        namespace: "net.2xcel.aus.schema-sanitizer",
        name: "schema_sanitizer",
        description: "Valid tool description with sufficient length.",
        connectionType: "http" as const,
        endpointUrl: "https://aipages.tech/tool/schema-sanitizer",
        healthStatus: "unknown" as const,
        pricing: { model: "paid" as const, costPerCall: 0.1 },
        authentication: "x402",
        rateLimit: "100 req/60s",
      };

      const resMissing = validateFirstPartyToolRecord(baseTool);
      assert.equal(resMissing.valid, false);
      assert.ok(resMissing.errors.some((e) => e.includes("must define a non-empty 'capabilities' array")));

      const resEmpty = validateFirstPartyToolRecord({ ...baseTool, capabilities: [] });
      assert.equal(resEmpty.valid, false);
      assert.ok(resEmpty.errors.some((e) => e.includes("must define a non-empty 'capabilities' array")));

      const resInvalidItems = validateFirstPartyToolRecord({ ...baseTool, capabilities: ["", "  ", "BAD CAPS!"] });
      assert.equal(resInvalidItems.valid, false);
      assert.ok(resInvalidItems.errors.some((e) => e.includes("Invalid capability tags found")));
    });

    it("rejects invalid pricing models and cost structures", () => {
      const baseTool = {
        namespace: "net.2xcel.aus.schema-sanitizer",
        name: "schema_sanitizer",
        description: "Valid tool description with sufficient length.",
        connectionType: "http" as const,
        endpointUrl: "https://aipages.tech/tool/schema-sanitizer",
        healthStatus: "unknown" as const,
        capabilities: ["sanitization"],
        authentication: "x402",
        rateLimit: "100 req/60s",
      };

      // Negative cost
      const resNegative = validateFirstPartyToolRecord({
        ...baseTool,
        pricing: { model: "paid", costPerCall: -0.05 },
      });
      assert.equal(resNegative.valid, false);
      assert.ok(resNegative.errors.some((e) => e.includes("must be a non-negative number")));

      // Paid with 0 cost
      const resZeroPaid = validateFirstPartyToolRecord({
        ...baseTool,
        pricing: { model: "paid", costPerCall: 0 },
      });
      assert.equal(resZeroPaid.valid, false);
      assert.ok(resZeroPaid.errors.some((e) => e.includes("Paid pricing model requires costPerCall > 0")));

      // Free with non-zero cost
      const resNonZeroFree = validateFirstPartyToolRecord({
        ...baseTool,
        pricing: { model: "free", costPerCall: 5.0 },
      });
      assert.equal(resNonZeroFree.valid, false);
      assert.ok(resNonZeroFree.errors.some((e) => e.includes("Free pricing model requires costPerCall === 0")));
    });

    it("rejects first-party tool with missing authentication or rateLimit", () => {
      const baseTool = {
        namespace: "net.2xcel.aus.schema-sanitizer",
        name: "schema_sanitizer",
        description: "Valid tool description with sufficient length.",
        connectionType: "http" as const,
        endpointUrl: "https://aipages.tech/tool/schema-sanitizer",
        healthStatus: "unknown" as const,
        capabilities: ["sanitization"],
        pricing: { model: "paid" as const, costPerCall: 0.1 },
      };

      const resNoAuth = validateFirstPartyToolRecord({ ...baseTool, rateLimit: "100 req/60s" });
      assert.equal(resNoAuth.valid, false);
      assert.ok(resNoAuth.errors.some((e) => e.includes("Authentication specification is required")));

      const resNoRate = validateFirstPartyToolRecord({ ...baseTool, authentication: "x402" });
      assert.equal(resNoRate.valid, false);
      assert.ok(resNoRate.errors.some((e) => e.includes("Rate limit specification (rateLimit) is required")));
    });
  });

  describe("Anti-Falsification Rule: Preserving 'unchecked' for Unverified Health", () => {
    it("REJECTS records asserting active healthStatus without a recorded lastChecked probe timestamp", () => {
      const falsifiedTool = {
        namespace: "net.2xcel.aus.schema-sanitizer",
        name: "schema_sanitizer",
        description: "Valid tool description with sufficient length.",
        connectionType: "http" as const,
        endpointUrl: "https://aipages.tech/tool/schema-sanitizer",
        healthStatus: "active" as const, // Falsified: claiming active without probe!
        lastChecked: undefined,
        capabilities: ["sanitization"],
        pricing: { model: "paid" as const, costPerCall: 0.1 },
        authentication: "x402",
        rateLimit: "100 req/60s",
      };

      const res = validateToolRecord(falsifiedTool);
      assert.equal(res.valid, false);
      assert.ok(
        res.errors.some((e) =>
          e.includes("Anti-Falsification violation: tool cannot assert healthStatus 'active' without a recorded lastChecked"),
        ),
      );
    });

    it("allows valid active tools when a legitimate lastChecked probe timestamp exists", () => {
      const legitimateTool = {
        namespace: "net.2xcel.aus.schema-sanitizer",
        name: "schema_sanitizer",
        description: "Valid tool description with sufficient length.",
        connectionType: "http" as const,
        endpointUrl: "https://aipages.tech/tool/schema-sanitizer",
        healthStatus: "active" as const,
        lastChecked: new Date(Date.now() - 3600000), // 1 hour ago
        capabilities: ["sanitization"],
        pricing: { model: "paid" as const, costPerCall: 0.1 },
        authentication: "x402",
        rateLimit: "100 req/60s",
      };

      const res = validateToolRecord(legitimateTool);
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);

      const health = deriveReliability(legitimateTool);
      assert.equal(health.reliability, "high");
    });

    it("rejects probe timestamps set in the future", () => {
      const futureTool = {
        namespace: "net.2xcel.aus.schema-sanitizer",
        name: "schema_sanitizer",
        description: "Valid tool description with sufficient length.",
        connectionType: "http" as const,
        endpointUrl: "https://aipages.tech/tool/schema-sanitizer",
        healthStatus: "active" as const,
        lastChecked: new Date(Date.now() + 86400000), // Tomorrow
        capabilities: ["sanitization"],
        pricing: { model: "paid" as const, costPerCall: 0.1 },
        authentication: "x402",
        rateLimit: "100 req/60s",
      };

      const res = validateToolRecord(futureTool);
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes("lastChecked timestamp cannot be in the future")));
    });
  });

  describe("assertValidFirstPartyTools & Catalog Report", () => {
    it("throws descriptive error when assertion fails on malformed fleet", () => {
      const badFleet = [
        ...CANONICAL_AUS_TOOLS,
        {
          namespace: "invalid.bad.tool",
          name: "bad_tool",
          description: "Too short",
          connectionType: "http",
          healthStatus: "unknown",
        },
      ];

      assert.throws(
        () => assertValidFirstPartyTools(badFleet as unknown as Tool[]),
        (err: Error) => {
          assert.ok(err.message.includes("First-party tool validation guardrail failed"));
          assert.ok(err.message.includes("[invalid.bad.tool]"));
          return true;
        },
      );
    });

    it("generates structured catalog validation report with failure diagnostics", () => {
      const mixedCatalog = [
        ...CANONICAL_AUS_TOOLS,
        {
          namespace: "bad.unnamed",
          name: "",
          description: "Missing name field entirely",
          connectionType: "http" as const,
          healthStatus: "unknown" as const,
        },
      ];

      const report = validateCatalog(mixedCatalog as unknown as Tool[]);
      assert.equal(report.valid, false);
      assert.equal(report.totalChecked, 9);
      assert.equal(report.validCount, 8);
      assert.equal(report.invalidCount, 1);
      assert.equal(report.failures[0].namespace, "bad.unnamed");
    });
  });
});
