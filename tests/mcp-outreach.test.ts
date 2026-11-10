import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  searchForMcpRepos,
  createTargetedProposal,
  runMcpProspectingLoop,
  loadProspectingState,
  saveProspectingState,
  CURATED_MCP_TARGETS,
  PROSPECTING_INTERVAL_MS,
  type GitHubRepo,
} from "../scripts/mcp-outreach.js";
import {
  generatePromotionalSnippet,
  generateReadyToMergeConfig,
} from "../scripts/aus-snippet.js";

describe("Outbound Autonomous Prospecting Loop (scripts/mcp-outreach.ts)", () => {
  let tempDir: string;
  let tempStateFile: string;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipages-outreach-test-"));
    tempStateFile = path.join(tempDir, "test-state.json");
  });

  after(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Configuration & Target Discovery", () => {
    it("defines a 6-hour cycle interval", () => {
      assert.strictEqual(PROSPECTING_INTERVAL_MS, 6 * 60 * 60 * 1000);
      assert.strictEqual(PROSPECTING_INTERVAL_MS / 3600000, 6);
    });

    it("curated fleet has at least 10 high-quality MCP target repositories", () => {
      assert.ok(CURATED_MCP_TARGETS.length >= 10, "Curated fleet must have at least 10 repos");
      for (const repo of CURATED_MCP_TARGETS) {
        assert.ok(repo.name, "Repo must have name");
        assert.ok(repo.full_name, "Repo must have full_name");
        assert.ok(repo.html_url.startsWith("https://github.com/"), "Repo must have valid github url");
        assert.ok(repo.owner.login, "Repo must have owner login");
      }
    });

    it("detects 5 to 10 MCP & agent-tool repositories", async () => {
      const repos = await searchForMcpRepos(10);
      assert.ok(repos.length >= 5 && repos.length <= 10, `Expected 5-10 repos, got ${repos.length}`);
    });

    it("clamps detection request to minimum 5 and maximum 15", async () => {
      const minRepos = await searchForMcpRepos(2);
      assert.strictEqual(minRepos.length, 5, "Should clamp lower bound to 5");
    });
  });

  describe("Proposal & JSON Config Generation", () => {
    const sampleRepo: GitHubRepo = {
      name: "awesome-agent-mcp",
      full_name: "testorg/awesome-agent-mcp",
      html_url: "https://github.com/testorg/awesome-agent-mcp",
      owner: { login: "testorg" },
      description: "An awesome multi-agent tool server",
      stargazers_count: 500,
      updated_at: new Date().toISOString(),
    };

    it("generates ready-to-merge JSON config with referral tracking", () => {
      const config = generateReadyToMergeConfig({
        targetRepo: sampleRepo.full_name,
        promotedBy: "aus-agent-alpha",
      });

      assert.ok(config.mcpServers["aipages-upstream"], "Must define aipages-upstream server");
      const env = config.mcpServers["aipages-upstream"].env;

      assert.strictEqual(env.AUS_PROMOTED_BY, "aus-agent-alpha");
      assert.ok(env.AUS_REFERRAL_CODE.startsWith("ref_mcp_"), "Referral code should start with ref_mcp_");
      assert.ok(env.AUS_REFERRAL_TRACKING_URL.includes(env.AUS_REFERRAL_CODE), "Tracking URL includes referral code");
      assert.ok(env.AUS_BASE_URL.includes("aipages.tech"), "Base URL points to aipages.tech");
      assert.ok(env.AUS_X402_WALLET.startsWith("0x"), "Wallet must be valid EVM address format");

      assert.ok(config._attribution, "Config includes machine-readable attribution");
      assert.strictEqual(config._attribution?.targetRepo, sampleRepo.full_name);
    });

    it("generates markdown proposal showcasing AIPages as upstream execution engine", async () => {
      const snippet = await generatePromotionalSnippet({
        targetRepo: sampleRepo.full_name,
        promotedBy: "aus-agent-alpha",
      });

      assert.ok(snippet.body.includes("Upstream Execution Engine"), "Proposal must showcase upstream execution engine");
      assert.ok(snippet.body.includes("Base L2 USDC micro-payments"), "Must mention Base L2 micro-payments");
      assert.ok(snippet.body.includes("x402 standard"), "Must reference x402 standard");
      assert.ok(snippet.body.includes(snippet.referralCode), "Must embed referral code");
      assert.ok(snippet.body.includes("Browser Stealth Cloud"), "Must list canonical upstream tools");
      assert.ok(snippet.body.includes("claude_desktop_config.json"), "Must provide Claude Desktop integration");
    });

    it("creates both targeted .md proposal and ready-to-merge .mcp.json files on disk", async () => {
      const res = await createTargetedProposal(sampleRepo, {
        promotedBy: "aus-agent-alpha",
        outDir: tempDir,
      });

      assert.ok(fs.existsSync(res.mdPath), `Markdown file must exist: ${res.mdPath}`);
      assert.ok(fs.existsSync(res.jsonPath), `JSON file must exist: ${res.jsonPath}`);

      const mdContent = fs.readFileSync(res.mdPath, "utf-8");
      assert.ok(mdContent.includes(sampleRepo.full_name));
      assert.ok(mdContent.includes(res.referralCode));

      const jsonRaw = fs.readFileSync(res.jsonPath, "utf-8");
      const parsed = JSON.parse(jsonRaw);
      assert.ok(parsed.mcpServers["aipages-upstream"]);
      assert.strictEqual(parsed.mcpServers["aipages-upstream"].env.AUS_REFERRAL_CODE, res.referralCode);
    });
  });

  describe("State Management & Prospecting Loop Execution", () => {
    it("loads and saves prospecting state accurately", () => {
      const state = loadProspectingState(tempStateFile);
      assert.strictEqual(state.cycleCount, 0);

      state.cycleCount = 1;
      state.lastRunAt = new Date().toISOString();
      state.prospects["test/sample"] = {
        prospectedAt: new Date().toISOString(),
        proposalMdPath: "/tmp/sample.md",
        configJsonPath: "/tmp/sample.mcp.json",
        referralCode: "ref_mcp_sample",
        stargazersCount: 100,
      };

      saveProspectingState(state, tempStateFile);

      const reloaded = loadProspectingState(tempStateFile);
      assert.strictEqual(reloaded.cycleCount, 1);
      assert.ok(reloaded.prospects["test/sample"]);
      assert.strictEqual(reloaded.prospects["test/sample"].referralCode, "ref_mcp_sample");
    });

    it("runs complete autonomous prospecting loop generating 5-10 proposals", async () => {
      const result = await runMcpProspectingLoop({
        cycle: 1,
        limit: 8,
        dryRun: true,
        outDir: tempDir,
        stateFile: tempStateFile,
      });

      assert.strictEqual(result.cycle, 1);
      assert.ok(result.detectedCount >= 5 && result.detectedCount <= 10, "Must detect 5-10 repos");
      assert.strictEqual(result.proposalsGenerated, result.detectedCount);
      assert.strictEqual(result.generatedFiles.length, result.detectedCount);

      for (const item of result.generatedFiles) {
        assert.ok(fs.existsSync(item.mdPath), `Proposal md exists: ${item.mdPath}`);
        assert.ok(fs.existsSync(item.jsonPath), `Config json exists: ${item.jsonPath}`);
        assert.ok(item.referralCode.startsWith("ref_mcp_"), "Referral code prefix");
      }

      // Verify updated state
      const updatedState = loadProspectingState(tempStateFile);
      assert.ok(updatedState.cycleCount >= 1);
      assert.ok(Object.keys(updatedState.prospects).length >= 5);
    });
  });
});
