/**
 * Lightweight MCP runtime probe — captures live, authoritative tool schemas
 * straight from a running MCP server, closing the gap left by config-style
 * `mcp.json` files (which declare how to *launch* a server, not its schemas).
 *
 * Two transports:
 *   - stdio: spawn `command [args]` and speak newline-delimited JSON-RPC over
 *     stdin/stdout (`initialize` → `notifications/initialized` → `tools/list`).
 *   - streamable HTTP / SSE: POST JSON-RPC to the server's URL.
 *
 * Each returned tool's `inputSchema` is the server's own authoritative JSON
 * Schema. Tools without a real inputSchema are skipped — nothing is inferred.
 *
 * ── SECURITY ───────────────────────────────────────────────────────────────
 * Probing an MCP server MEANS EXECUTING ITS CODE (`npx`, `uvx`, `node`, …).
 * This is remote-code-execution by design and must never run against untrusted
 * repos without isolation. It is OFF by default and gated by env flags:
 *   CRAWL_MCP_PROBE=true   — enable the probe pass (both transports)
 *   CRAWL_MCP_EXEC=true    — additionally permit spawning stdio processes
 *                            (the highest-risk path; HTTP probing works without it)
 * Run the crawler in a sandbox/container with no host credentials, and use a
 * hard per-server timeout (CRAWL_MCP_TIMEOUT_MS, default 30 s).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { ToolSchema } from "./types.js";
import { normalizeSchema } from "./manifest.js";

export interface McpLaunchConfig {
  /** Server key from `mcpServers` (e.g. "chrome-devtools"). */
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  type?: string;
  env?: Record<string, string>;
}

export interface McpProbeTool {
  name: string;
  description: string;
  schema: ToolSchema;
}

export interface McpProbeResult {
  serverName: string;
  transport: "stdio" | "http";
  tools: McpProbeTool[];
}

const PROTOCOL_VERSION = "2024-11-05";
const CLIENT_INFO = { name: "aipages-mcp-probe", version: "0.1.0" };

// ── config parsing ─────────────────────────────────────────────────────────

/**
 * Parse an `mcpServers` launch config from a config-style `mcp.json`.
 * Returns an empty array for registry-style manifests (`tools[]`) or garbage.
 */
export function parseMcpServersConfig(raw: string): McpLaunchConfig[] {
  let doc: any;
  try {
    doc = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!doc || typeof doc !== "object" || !doc.mcpServers || typeof doc.mcpServers !== "object") {
    return [];
  }
  const out: McpLaunchConfig[] = [];
  for (const [name, entry] of Object.entries(doc.mcpServers)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as any;
    out.push({
      name,
      command: typeof e.command === "string" ? e.command : undefined,
      args: Array.isArray(e.args) ? e.args.map(String) : undefined,
      url: typeof e.url === "string" ? e.url : undefined,
      type: typeof e.type === "string" ? e.type : undefined,
      env:
        e.env && typeof e.env === "object"
          ? Object.fromEntries(Object.entries(e.env).map(([k, v]) => [k, String(v)]))
          : undefined,
    });
  }
  return out;
}

// ── public probe entry ────────────────────────────────────────────────────

/**
 * Probe a single MCP server and return its live tool schemas, or null on any
 * failure (spawn error, handshake timeout, no tools capability, empty list).
 */
export async function probeMcpServer(
  config: McpLaunchConfig,
  timeoutMs = 30_000,
): Promise<McpProbeResult | null> {
  const type = (config.type ?? "stdio").toLowerCase();
  const isHttp = type === "streamable-http" || type === "http" || type === "sse";

  if (isHttp || (config.url && !config.command)) {
    if (!config.url) return null;
    const tools = await probeHttpTools(config.url, timeoutMs);
    return tools ? { serverName: config.name, transport: "http", tools } : null;
  }

  if (!config.command) return null;
  const tools = await probeStdioTools(config.command, config.args ?? [], config.env, timeoutMs);
  return tools ? { serverName: config.name, transport: "stdio", tools } : null;
}

// ── stdio transport ───────────────────────────────────────────────────────

function spawnServer(
  command: string,
  args: string[],
  env?: Record<string, string>,
): ChildProcess {
  const childEnv = env ? { ...process.env, ...env } : process.env;
  if (process.platform === "win32") {
    // Windows: `.cmd`/`.bat` shims (npx, uvx, …) only run under a shell.
    const cmdline = [command, ...args].map(quoteForCmd).join(" ");
    return spawn(cmdline, { shell: true, env: childEnv, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  }
  return spawn(command, args, { shell: false, env: childEnv, stdio: ["pipe", "pipe", "pipe"] });
}

/** Minimal cmd.exe quoting (wrap args with spaces/shell metacharacters). */
function quoteForCmd(arg: string): string {
  if (/^[a-zA-Z0-9_./:@%+=,-]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '""')}"`;
}

function probeStdioTools(
  command: string,
  args: string[],
  env: Record<string, string> | undefined,
  timeoutMs: number,
): Promise<McpProbeTool[] | null> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = spawnServer(command, args, env);
    } catch (err) {
      console.warn(`[mcp-probe] failed to spawn ${command}:`, err);
      return resolve(null);
    }

    let settled = false;
    let hardTimer: NodeJS.Timeout | null = null;
    const finish = (val: McpProbeTool[] | null) => {
      if (settled) return;
      settled = true;
      if (hardTimer) clearTimeout(hardTimer);
      try { child.kill("SIGKILL"); } catch { /* already exited */ }
      resolve(val);
    };
    hardTimer = setTimeout(() => finish(null), timeoutMs);

    // Silence stderr (npx is chatty) but keep a tail for debugging.
    let stderrTail = "";
    child.stderr?.on("data", (d: Buffer) => {
      stderrTail = (stderrTail + d.toString()).slice(-400);
    });

    const rl = createInterface({ input: child.stdout! });

    let nextId = 1;
    const pending = new Map<number, { resolve: (m: any) => void; timer: NodeJS.Timeout }>();

    const call = (method: string, params: any): Promise<any> =>
      new Promise((res) => {
        const id = nextId++;
        const timer = setTimeout(() => {
          pending.delete(id);
          res(undefined);
        }, timeoutMs);
        pending.set(id, { resolve: (m) => { clearTimeout(timer); res(m); }, timer });
        try {
          child.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
        } catch {
          pending.delete(id);
          clearTimeout(timer);
          res(undefined);
        }
      });

    const notify = (method: string) => {
      try {
        child.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method }) + "\n");
      } catch { /* ignore */ }
    };

    rl.on("line", (line) => {
      let msg: any;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg && typeof msg.id === "number" && pending.has(msg.id)) {
        const p = pending.get(msg.id)!;
        pending.delete(msg.id);
        clearTimeout(p.timer);
        p.resolve(msg);
      }
    });

    child.on("error", () => finish(null));
    child.on("exit", () => finish(null)); // exited before tools/list → give up

    (async () => {
      const init = await call("initialize", {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: CLIENT_INFO,
      });
      if (settled) return;
      if (!init || init.error || !init.result?.capabilities?.tools) {
        console.log(`[mcp-probe] ${command}: no tools capability (stderr: ${stderrTail.slice(0, 120)})`);
        return finish(null);
      }
      notify("notifications/initialized");

      const list = await call("tools/list", {});
      if (settled) return;
      if (!list || list.error || !Array.isArray(list.result?.tools)) {
        console.log(`[mcp-probe] ${command}: tools/list failed`);
        return finish(null);
      }

      const tools = extractToolsFromList(list.result.tools);
      finish(tools.length > 0 ? tools : null);
    })();
  });
}

// ── HTTP transport ────────────────────────────────────────────────────────

async function probeHttpTools(url: string, timeoutMs: number): Promise<McpProbeTool[] | null> {
  const rpc = async (method: string, params: any, id?: number): Promise<any | null> => {
    try {
      const body = id === undefined
        ? JSON.stringify({ jsonrpc: "2.0", method })
        : JSON.stringify({ jsonrpc: "2.0", id, method, params });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (id === undefined) return {}; // notification — no meaningful response
      if (!res.ok) return null;
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("text/event-stream")) {
        const text = await res.text();
        let payload = "";
        for (const line of text.split("\n")) {
          if (line.startsWith("data:")) payload += line.slice(5).trim();
        }
        if (!payload) return null;
        return JSON.parse(payload);
      }
      return await res.json();
    } catch {
      return null;
    }
  };

  const init = await rpc("initialize", {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: CLIENT_INFO,
  }, 1);
  if (!init || init.error || !init.result?.capabilities?.tools) return null;

  await rpc("notifications/initialized", {}); // fire-and-forget notification

  const list = await rpc("tools/list", {}, 2);
  if (!list || list.error || !Array.isArray(list.result?.tools)) return null;

  const tools = extractToolsFromList(list.result.tools);
  return tools.length > 0 ? tools : null;
}

// ── shared: tools/list → validated schemas ─────────────────────────────────

function extractToolsFromList(rawTools: any[]): McpProbeTool[] {
  const out: McpProbeTool[] = [];
  for (const t of rawTools) {
    if (!t || typeof t !== "object" || typeof t.name !== "string" || !t.name) continue;
    const schema = normalizeSchema(t.inputSchema);
    if (!schema) continue; // no genuine schema → skip (authoritative only)
    out.push({
      name: t.name,
      description: typeof t.description === "string" ? t.description : "",
      schema,
    });
  }
  return out;
}
