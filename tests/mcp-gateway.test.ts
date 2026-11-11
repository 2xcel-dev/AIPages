import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";

describe("Unified MCP Proxy Gateway (@aipages/mcp-gateway)", () => {
  const gatewayBin = path.resolve(process.cwd(), "packages/mcp-gateway/bin/mcp-gateway.js");

  function sendRpc(requests: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const child = spawn("node", [gatewayBin], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (code !== 0 && stdout.trim() === "") {
          return reject(new Error(`Gateway exited with code ${code}: ${stderr}`));
        }

        const lines = stdout
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        const parsed = lines.map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        }).filter(Boolean);

        resolve(parsed);
      });

      for (const req of requests) {
        child.stdin.write(JSON.stringify(req) + "\n");
      }

      setTimeout(() => {
        child.stdin.end();
      }, 500);
    });
  }

  it("handles initialize and responds with MCP protocol 2024-11-05", async () => {
    const responses = await sendRpc([
      { jsonrpc: "2.0", id: 1, method: "initialize" },
    ]);

    assert.ok(responses.length >= 1);
    const initRes = responses.find((r) => r.id === 1);
    assert.ok(initRes);
    assert.strictEqual(initRes.result.protocolVersion, "2024-11-05");
    assert.strictEqual(initRes.result.serverInfo.name, "aipages-mcp-gateway");
    assert.ok(initRes.result.capabilities.tools);
  });

  it("exposes aipages_search and aipages_execute in tools/list", async () => {
    const responses = await sendRpc([
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ]);

    assert.ok(responses.length >= 1);
    const listRes = responses.find((r) => r.id === 2);
    assert.ok(listRes);
    const toolNames = listRes.result.tools.map((t: any) => t.name);
    assert.ok(toolNames.includes("aipages_search"), "Must expose aipages_search");
    assert.ok(toolNames.includes("aipages_execute"), "Must expose aipages_execute");
    assert.ok(toolNames.includes("aipages_list"), "Must expose aipages_list");
  });

  it("executes aipages_search tool call returning matching tools", async () => {
    const responses = await sendRpc([
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "aipages_search",
          arguments: { query: "browser stealth" },
        },
      },
    ]);

    assert.ok(responses.length >= 1);
    const searchRes = responses.find((r) => r.id === 3);
    assert.ok(searchRes);
    assert.ok(!searchRes.isError);
    const text = searchRes.result.content[0].text;
    assert.ok(text.includes("browser"));
    assert.ok(text.includes("aipages_execute"));
  });

  it("executes aipages_list tool call returning canonical fleet", async () => {
    const responses = await sendRpc([
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "aipages_list",
          arguments: {},
        },
      },
    ]);

    assert.ok(responses.length >= 1);
    const listRes = responses.find((r) => r.id === 4);
    assert.ok(listRes);
    const text = listRes.result.content[0].text;
    assert.ok(text.includes("AIPages Autonomous Tool Fleet"));
  });
});
