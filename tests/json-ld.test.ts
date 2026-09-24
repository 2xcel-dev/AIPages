import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createStore, type ToolStore } from "../src/db.js";
import { type Tool } from "../src/types.js";
import {
  findToolBySlug,
  renderToolPage,
  renderNotFoundPage,
  generateToolJsonLd,
} from "../src/views/toolPage.js";
import { CANONICAL_AUS_TOOLS } from "../src/data/ausTools.js";

describe("Task 8: Schema.org JSON-LD Metadata on Tool Detail Pages", () => {
  let store: ToolStore;
  let app: Hono;

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const testHealthyTool: Tool = {
    namespace: "net.2xcel.test.schema-linter",
    name: "schema_linter",
    description: "Enterprise JSON schema linter and structural validator for autonomous workflows.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/lint",
    healthStatus: "active",
    lastChecked: oneHourAgo,
    failureReason: null,
    status: "active",
    capabilities: ["validation", "schema-linting", "json-schema"],
    pricing: { model: "paid", costPerCall: 0.05 },
    authentication: "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet)",
    rateLimit: "120 req/min",
    developer: {
      address: "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
      name: "2xcel Dev",
      isFirstParty: true,
      listingFeePaid: true,
      listingFeeAmount: 0,
    },
    updatedAt: now,
  };

  const testUncheckedTool: Tool = {
    namespace: "net.2xcel.test.unchecked-agent",
    name: "unchecked_agent",
    description: "New agent tool with unverified probe status.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/agent",
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    capabilities: ["agent-task"],
    pricing: { model: "free", costPerCall: 0 },
    developer: {
      address: "0x1111111111111111111111111111111111111111",
      listingFeePaid: true,
      listingFeeAmount: 0,
    },
    updatedAt: now,
  };

  const testFailingTool: Tool = {
    namespace: "net.2xcel.test.failing-tool",
    name: "failing_tool",
    description: "A tool experiencing downtime.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/v1/failing",
    healthStatus: "inactive",
    lastChecked: oneHourAgo,
    failureReason: "HTTP 503 Service Unavailable",
    status: "active",
    pricing: { model: "paid", costPerCall: 0.02 },
    updatedAt: now,
  };

  before(async () => {
    store = await createStore();
    await store.upsert(testHealthyTool);
    await store.upsert(testUncheckedTool);
    await store.upsert(testFailingTool);

    app = new Hono();
    app.get("/tools/:slug", async (c) => {
      const slug = c.req.param("slug");
      if (!slug) return c.html(renderNotFoundPage(""), 404);

      const tool = await findToolBySlug(store, slug);
      if (!tool) return c.html(renderNotFoundPage(slug), 404);

      return c.html(renderToolPage(tool));
    });
  });

  describe("Structured Data Generation (generateToolJsonLd)", () => {
    it("generates standard Schema.org SoftwareApplication structure", () => {
      const jsonLd = generateToolJsonLd(testHealthyTool);

      assert.equal(jsonLd["@context"], "https://schema.org");
      assert.equal(jsonLd["@type"], "SoftwareApplication");
      assert.equal(jsonLd.name, "schema_linter");
      assert.equal(jsonLd.identifier, "net.2xcel.test.schema-linter");
      assert.equal(jsonLd.description, testHealthyTool.description);
      assert.equal(jsonLd.applicationCategory, "AutonomousAgentTool");
      assert.equal(jsonLd.operatingSystem, "Any");
      assert.equal(
        jsonLd.url,
        "https://aipages.tech/tool/net.2xcel.test.schema-linter",
      );
      assert.equal(jsonLd.installUrl, "https://api.example.com/v1/lint");
      assert.equal(jsonLd.keywords, "validation, schema-linting, json-schema");
      assert.deepEqual(jsonLd.featureList, ["validation", "schema-linting", "json-schema"]);
    });

    it("maps pricing and offers accurately with currency", () => {
      const paidLd = generateToolJsonLd(testHealthyTool);
      const paidOffer = paidLd.offers as Record<string, unknown>;
      assert.equal(paidOffer["@type"], "Offer");
      assert.equal(paidOffer.price, "0.05");
      assert.equal(paidOffer.priceCurrency, "USDC");
      assert.ok(String(paidOffer.description).includes("paid pricing"));

      const freeLd = generateToolJsonLd(testUncheckedTool);
      const freeOffer = freeLd.offers as Record<string, unknown>;
      assert.equal(freeOffer["@type"], "Offer");
      assert.equal(freeOffer.price, "0");
    });

    it("adheres strictly to Anti-Falsification rule: unchecked remains unchecked", () => {
      const uncheckedLd = generateToolJsonLd(testUncheckedTool);
      const props = uncheckedLd.additionalProperty as Array<{ name: string; value: unknown }>;
      assert.ok(Array.isArray(props));

      const relProp = props.find((p) => p.name === "reliabilityStatus");
      assert.ok(relProp, "Must include reliabilityStatus");
      assert.equal(relProp.value, "unchecked");

      const healthProp = props.find((p) => p.name === "healthStatus");
      assert.ok(healthProp, "Must include healthStatus");
      assert.equal(healthProp.value, "unknown");

      // Must not include a lastChecked timestamp if never probed
      const lastCheckedProp = props.find((p) => p.name === "lastChecked");
      assert.equal(lastCheckedProp, undefined);
    });

    it("records failing status and failureReason without inventing claims", () => {
      const failingLd = generateToolJsonLd(testFailingTool);
      const props = failingLd.additionalProperty as Array<{ name: string; value: unknown }>;

      const relProp = props.find((p) => p.name === "reliabilityStatus");
      assert.equal(relProp?.value, "failing");

      const failReasonProp = props.find((p) => p.name === "failureReason");
      assert.equal(failReasonProp?.value, "HTTP 503 Service Unavailable");
    });

    it("records healthy operational status and lastChecked timestamp", () => {
      const healthyLd = generateToolJsonLd(testHealthyTool);
      const props = healthyLd.additionalProperty as Array<{ name: string; value: unknown }>;

      const relProp = props.find((p) => p.name === "reliabilityStatus");
      assert.equal(relProp?.value, "high");

      const lastCheckedProp = props.find((p) => p.name === "lastChecked");
      assert.equal(lastCheckedProp?.value, oneHourAgo.toISOString());
    });

    it("does not expose private keys or credentials", () => {
      const toolWithPrivateAttempt: Tool = {
        ...testHealthyTool,
        authentication: "Bearer 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      };
      const jsonLd = generateToolJsonLd(toolWithPrivateAttempt);
      const props = jsonLd.additionalProperty as Array<{ name: string; value: unknown }>;
      const authProp = props.find((p) => p.name === "authentication");

      assert.ok(!String(authProp?.value).includes("0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"));
      assert.ok(String(authProp?.value).includes("[REDACTED]"));
    });

    it("accurately structures canonical AUS fleet tools", () => {
      for (const ausTool of CANONICAL_AUS_TOOLS) {
        const fullTool: Tool = {
          ...ausTool,
          updatedAt: new Date(),
        };
        const ld = generateToolJsonLd(fullTool);

        assert.equal(ld["@context"], "https://schema.org");
        assert.equal(ld["@type"], "SoftwareApplication");
        assert.equal(ld.name, ausTool.name);
        assert.equal(ld.identifier, ausTool.namespace);
        assert.ok(String(ld.description).length > 10);
        assert.equal(ld.installUrl, ausTool.endpointUrl);

        const props = ld.additionalProperty as Array<{ name: string; value: unknown }>;
        const relProp = props.find((p) => p.name === "reliabilityStatus");
        // Canonical AUS tools are initialized as unverified until background worker probes them
        assert.equal(relProp?.value, "unchecked");

        const authProp = props.find((p) => p.name === "authentication");
        assert.ok(String(authProp?.value).includes("x402 payment protocol"));
      }
    });
  });

  describe("Server-Rendered HTML Verification", () => {
    it("embeds valid application/ld+json script tag in renderToolPage output", () => {
      const html = renderToolPage(testHealthyTool);
      assert.ok(html.includes('<script type="application/ld+json">'));

      const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(match, "Must find JSON-LD script block");

      const parsed = JSON.parse(match[1]);
      assert.equal(parsed["@context"], "https://schema.org");
      assert.equal(parsed["@type"], "SoftwareApplication");
      assert.equal(parsed.name, "schema_linter");
      assert.equal(parsed.identifier, "net.2xcel.test.schema-linter");
      assert.equal(parsed.offers.price, "0.05");
      assert.equal(parsed.offers.priceCurrency, "USDC");
    });

    it("GET /tools/:slug returns 200 with server-rendered JSON-LD metadata", async () => {
      const res = await app.request("http://localhost/tools/schema_linter");
      assert.equal(res.status, 200);

      const body = await res.text();
      assert.ok(body.includes('<script type="application/ld+json">'));

      const match = body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(match, "JSON-LD script block must be present in HTTP response");

      const parsed = JSON.parse(match[1]);
      assert.equal(parsed.name, "schema_linter");
      assert.equal(parsed.identifier, "net.2xcel.test.schema-linter");
      assert.equal(parsed.applicationCategory, "AutonomousAgentTool");

      const props = parsed.additionalProperty as Array<{ name: string; value: unknown }>;
      const relProp = props.find((p) => p.name === "reliabilityStatus");
      assert.equal(relProp?.value, "high");
    });
  });
});
