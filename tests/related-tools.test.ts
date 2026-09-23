import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { InMemoryToolStore } from "../src/db.js";
import { type Tool } from "../src/types.js";
import { findRelatedTools, renderToolPage, findToolBySlug } from "../src/views/toolPage.js";

describe("Related Tools by Shared Capabilities", () => {
  let store: InMemoryToolStore;
  let app: Hono;

  const now = new Date();

  const auditToolA: Tool = {
    namespace: "net.2xcel.aus.financial-audit",
    name: "financial_audit",
    description: "Financial ledger auditing and compliance checking.",
    connectionType: "http",
    endpointUrl: "https://aus.2xcel.net/tools/financial-audit",
    healthStatus: "unknown",
    status: "active",
    capabilities: ["financial-audit", "compliance", "ledger-verification", "agent-eval"],
    pricing: { model: "paid", costPerCall: 0.2 },
    updatedAt: now,
  };

  const auditToolB: Tool = {
    namespace: "net.2xcel.aus.agentic-audit",
    name: "agentic_audit",
    description: "Autonomous agent behavior trace analysis and auditing.",
    connectionType: "http",
    endpointUrl: "https://aus.2xcel.net/tools/agentic-audit",
    healthStatus: "unknown",
    status: "active",
    capabilities: ["agentic-audit", "compliance", "agent-eval", "behavior-trace"],
    pricing: { model: "paid", costPerCall: 0.25 },
    updatedAt: now,
  };

  const complianceToolC: Tool = {
    namespace: "com.example.compliance-checker",
    name: "compliance_checker",
    description: "Regulatory compliance validation for enterprise payloads.",
    connectionType: "http",
    endpointUrl: "https://api.example.com/compliance",
    healthStatus: "unknown",
    status: "active",
    capabilities: ["compliance"],
    pricing: { model: "free", costPerCall: 0 },
    updatedAt: now,
  };

  const unrelatedTool: Tool = {
    namespace: "io.github.isolated.calc",
    name: "calculator",
    description: "Pure math evaluator without any shared capabilities.",
    connectionType: "stdio",
    healthStatus: "unknown",
    status: "active",
    capabilities: ["math", "arithmetic"],
    pricing: { model: "free", costPerCall: 0 },
    updatedAt: now,
  };

  const noCapsTool: Tool = {
    namespace: "org.example.no-caps",
    name: "legacy_tool",
    description: "A tool without capabilities defined.",
    connectionType: "http",
    healthStatus: "unknown",
    status: "active",
    capabilities: [],
    pricing: { model: "free", costPerCall: 0 },
    updatedAt: now,
  };

  const inactiveTool: Tool = {
    namespace: "net.2xcel.disabled.audit",
    name: "disabled_audit",
    description: "An inactive tool sharing capabilities that should not appear.",
    connectionType: "http",
    healthStatus: "inactive",
    status: "inactive",
    capabilities: ["compliance", "financial-audit"],
    pricing: { model: "free", costPerCall: 0 },
    updatedAt: now,
  };

  before(async () => {
    store = new InMemoryToolStore();
    await store.upsert(auditToolA);
    await store.upsert(auditToolB);
    await store.upsert(complianceToolC);
    await store.upsert(unrelatedTool);
    await store.upsert(noCapsTool);
    await store.upsert(inactiveTool);

    app = new Hono();
    app.get("/tools/:slug", async (c) => {
      const slug = c.req.param("slug");
      const tool = await findToolBySlug(store, slug);
      if (!tool) return c.json({ error: "Not found" }, 404);

      const relatedTools = await findRelatedTools(store, tool, 3);
      return c.html(renderToolPage(tool, relatedTools));
    });
  });

  describe("findRelatedTools Logic", () => {
    it("finds related tools sharing capability tags and orders by highest overlap", async () => {
      const related = await findRelatedTools(store, auditToolA, 5);

      // auditToolB shares 2 capabilities: "compliance" and "agent-eval"
      // complianceToolC shares 1 capability: "compliance"
      assert.equal(related.length, 2, "Should return exactly the 2 active matching tools");
      assert.equal(related[0].namespace, "net.2xcel.aus.agentic-audit", "Tool with 2 shared capabilities should rank first");
      assert.equal(related[1].namespace, "com.example.compliance-checker", "Tool with 1 shared capability should rank second");
    });

    it("strictly excludes the current tool itself", async () => {
      const related = await findRelatedTools(store, auditToolA, 5);
      const selfMatch = related.some((t) => t.namespace === auditToolA.namespace);
      assert.equal(selfMatch, false, "Current tool must never be returned in its own related list");
    });

    it("excludes inactive/disabled tools even if they share capabilities", async () => {
      const related = await findRelatedTools(store, auditToolA, 5);
      const inactiveMatch = related.some((t) => t.namespace === inactiveTool.namespace);
      assert.equal(inactiveMatch, false, "Inactive tools must be excluded from public related listings");
    });

    it("returns empty array for tools without capabilities", async () => {
      const related = await findRelatedTools(store, noCapsTool, 3);
      assert.deepEqual(related, [], "Tool without capabilities should return empty array");
    });

    it("returns empty array when no other tools share any capabilities", async () => {
      const related = await findRelatedTools(store, unrelatedTool, 3);
      assert.deepEqual(related, [], "Isolated tool should return empty array");
    });

    it("respects the limit argument", async () => {
      const related = await findRelatedTools(store, auditToolA, 1);
      assert.equal(related.length, 1, "Should respect requested limit of 1");
      assert.equal(related[0].namespace, "net.2xcel.aus.agentic-audit");
    });
  });

  describe("UI Rendering in renderToolPage", () => {
    it("renders Related Tools section with cards, shared capability stars, and detail links", () => {
      const html = renderToolPage(auditToolA, [auditToolB, complianceToolC]);

      assert.ok(html.includes("Related Tools by Shared Capabilities"), "Should render section heading");
      assert.ok(html.includes("related-tools-grid"), "Should render related tools grid");
      assert.ok(html.includes("agentic_audit"), "Should render related tool name");
      assert.ok(html.includes("net.2xcel.aus.agentic-audit"), "Should render related tool namespace");
      assert.ok(html.includes("/tools/net.2xcel.aus.agentic-audit"), "Should link to related tool detail page");
      assert.ok(html.includes("cap-shared"), "Should highlight shared capability tags");
      assert.ok(html.includes("★ compliance"), "Should mark shared capability with star");
    });

    it("renders clean fallback when relatedTools is empty", () => {
      const html = renderToolPage(unrelatedTool, []);

      assert.ok(html.includes("Related Tools by Shared Capabilities"), "Should render section heading");
      assert.ok(html.includes("related-tools-empty"), "Should render empty fallback container");
      assert.ok(html.includes("No other public tools currently share capability tags"), "Should show clean fallback copy");
      assert.ok(html.includes("/tools"), "Should provide link to browse full directory");
    });
  });

  describe("HTTP Route Integration (GET /tools/:slug)", () => {
    it("returns 200 HTML with populated related tools for a tool with shared capabilities", async () => {
      const res = await app.request("http://localhost/tools/net.2xcel.aus.financial-audit");
      assert.equal(res.status, 200);
      const body = await res.text();

      assert.ok(body.includes("Related Tools by Shared Capabilities"));
      assert.ok(body.includes("agentic_audit"));
      assert.ok(body.includes("/tools/net.2xcel.aus.agentic-audit"));
    });

    it("returns 200 HTML with clean fallback for an isolated tool without shared capabilities", async () => {
      const res = await app.request("http://localhost/tools/io.github.isolated.calc");
      assert.equal(res.status, 200);
      const body = await res.text();

      assert.ok(body.includes("Related Tools by Shared Capabilities"));
      assert.ok(body.includes("related-tools-empty"));
      assert.ok(body.includes("No other public tools currently share capability tags"));
    });
  });
});
