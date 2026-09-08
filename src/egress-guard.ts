/**
 * Egress guard — protects the /invoke proxy's outbound boundary.
 *
 *  1. SSRF: reject non-http(s) schemes, userinfo (credential smuggling),
 *     and any target whose resolved IP falls in a private/reserved range
 *     (loopback, RFC1918, link-local, CGNAT, documentation, multicast, …).
 *     The hostname is resolved and EVERY address is checked, so a domain
 *     that front-runs a public IP with a private one is blocked.
 *  2. Allowlist: when `PROXY_ALLOWED_HOSTS` is set, only matching hosts
 *     (exact or `*.example.com` suffix wildcard) are permitted.
 *  3. Size limits: strict request and response byte caps.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import { config } from "./config.js";

// ── SSRF: private/reserved address classification ──────────────────────────

function isPrivateIPv4(octets: number[]): boolean {
  const [a, b] = octets;
  // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16 (link-local)
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 (CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.0.0/24, 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && (octets[2] === 0 || octets[2] === 2)) return true;
  // 198.18.0.0/15, 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && octets[2] === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && octets[2] === 113) return true;
  // 224.0.0.0/4 (multicast), 240.0.0.0/4 (reserved), 255.255.255.255/32
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(groups: number[]): boolean {
  const first = groups[0];
  // ::1/128 loopback — check all 8 groups explicitly (avoids TS narrowing).
  if (
    groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0 &&
    groups[4] === 0 && groups[5] === 0 && groups[6] === 0 && groups[7] === 1
  ) return true;
  // ::/128 unspecified
  if (groups.every((g) => g === 0)) return true;
  // fe80::/10 link-local, fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true;
  if ((first & 0xfe00) === 0xfc00) return true;
  // 2001:db8::/32 documentation
  if (first === 0x2001 && groups[1] === 0x0db8) return true;
  return false;
}

/** Classify a dotted-quad / IPv6 string as private/reserved (or not). */
function isPrivateAddress(addr: string): boolean {
  if (isIP(addr) === 4) {
    const octets = addr.split(".").map((n) => Number(n));
    return isPrivateIPv4(octets);
  }
  if (isIP(addr) === 6) {
    const normalized = addr.toLowerCase();
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — check the embedded IPv4.
    const v4map = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4map) return isPrivateAddress(v4map[1]);
    // Expand "::" and parse into 8 groups.
    const groups = parseIPv6Groups(normalized);
    if (!groups) return true; // unparseable → treat as private (fail closed)
    return isPrivateIPv6(groups);
  }
  return true; // not an IP at all → fail closed
}

function parseIPv6Groups(addr: string): number[] | null {
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const parse = (s: string): number[] =>
    s === "" ? [] : s.split(":").map((g) => parseInt(g || "0", 16));
  const left = parse(halves[0]);
  if (halves.length === 1) return left.length === 8 ? left : null;
  const right = parse(halves[1]);
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  return [...left, ...new Array(missing).fill(0), ...right];
}

// ── hostname allowlist ─────────────────────────────────────────────────────

function hostAllowed(hostname: string): boolean {
  const list = config.proxyAllowedHosts;
  if (list.length === 0) return true; // no allowlist → allow (SSRF still guards IPs)
  const h = hostname.toLowerCase();
  for (const entry of list) {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1); // ".example.com"
      if (h.endsWith(suffix) && h.length > suffix.length) return true;
    } else if (h === entry) {
      return true;
    }
  }
  return false;
}

// ── public API ─────────────────────────────────────────────────────────────

export interface EgressDecision {
  ok: boolean;
  reason?: string;
  /** The validated, pinned connection target (present when ok). */
  target?: PinnedTarget;
}

/**
 * A validated downstream connection: the original hostname (for TLS SNI +
 * Host + cert verification) plus the pinned IP address the socket will
 * actually connect to — closing the DNS-rebinding TOCTOU window.
 */
export interface PinnedTarget {
  protocol: "http:" | "https:";
  hostname: string;
  port: number;
  /** Path + query to request on the target. */
  path: string;
  /** The validated IP to pin the connection to. */
  address: string;
}

/**
 * Validate a downstream target URL before any request leaves the proxy.
 *
 * @param rawUrl  Full URL to proxy (tool endpointUrl + subpath + query).
 * @param opts    Additional context for error messages.
 */
export async function guardTargetUrl(
  rawUrl: string,
  opts: { namespace?: string } = {},
): Promise<EgressDecision> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid target URL" };
  }

  const ns = opts.namespace ?? url.hostname;

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `unsupported scheme: ${url.protocol}` };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "target URL must not contain embedded credentials" };
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostAllowed(hostname)) {
    return { ok: false, reason: `host "${hostname}" not in proxy allowlist` };
  }

  // Resolve and validate every address (DNS-rebinding resistance).
  let addresses: string[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true }).then((r) =>
      r.map((a) => a.address),
    );
  } catch {
    return { ok: false, reason: `could not resolve host "${hostname}"` };
  }
  if (addresses.length === 0) {
    return { ok: false, reason: `host "${hostname}" resolved to no addresses` };
  }

  if (!config.proxyAllowPrivate) {
    for (const addr of addresses) {
      if (isPrivateAddress(addr)) {
        return {
          ok: false,
          reason: `target "${ns}" resolves to private/reserved address ${addr} — SSRF blocked`,
        };
      }
    }
  }

  // Pin the connection to the first validated address. The original hostname
  // is preserved for TLS SNI / Host / cert verification.
  return {
    ok: true,
    target: {
      protocol: url.protocol as "http:" | "https:",
      hostname,
      port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80,
      path: url.pathname + url.search,
      address: addresses[0],
    },
  };
}

/**
 * Connect to a pinned target using the validated IP (via a `lookup` override)
 * while preserving the original hostname for TLS SNI and Host headers.
 *
 * This eliminates the TOCTOU DNS-rebinding window: the socket never re-resolves
 * the hostname — it dials the pre-validated IP directly.
 */
export async function pinnedRequest(
  target: PinnedTarget,
  opts: {
    method: string;
    headers: Record<string, string>;
    body?: Uint8Array;
    maxResponseBytes: number;
  },
): Promise<Response> {
  const mod = target.protocol === "https:" ? https : http;
  const family = isIP(target.address) === 6 ? 6 : 4;

  const headers: Record<string, string> = { ...opts.headers };
  const body = opts.body && opts.body.byteLength > 0 ? opts.body : undefined;
  if (body) headers["content-length"] = String(body.byteLength);

  const nodeRes = await new Promise<http.IncomingMessage>((resolve, reject) => {
    const req = mod.request(
      {
        hostname: target.hostname, // SNI + Host + cert verification use the hostname
        port: target.port,
        path: target.path,
        method: opts.method,
        headers,
        // Pin the socket to the validated IP — no DNS lookup at connect time.
        // autoSelectFamily must be off: its Happy-Eyeballs path uses a different
        // lookup callback contract and would re-resolve / drop our pin.
        autoSelectFamily: false,
        family,
        lookup: (_host: string, _o: unknown, cb: (e: NodeJS.ErrnoException | null, a: string, f: number) => void) =>
          cb(null, target.address, family),
        servername: target.protocol === "https:" ? target.hostname : undefined,
      } as http.RequestOptions,
      resolve,
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });

  const webStream = Readable.toWeb(nodeRes) as unknown as ReadableStream<Uint8Array>;
  const capped = await readBodyWithLimit(webStream, opts.maxResponseBytes);

  const responseHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(nodeRes.headers)) {
    if (typeof v === "string" && !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())) {
      responseHeaders[k] = v;
    }
  }

  return new Response(capped, { status: nodeRes.statusCode ?? 502, headers: responseHeaders });
}

// ── size limits ────────────────────────────────────────────────────────────

export interface SizeLimits {
  maxRequestBytes: number;
  maxResponseBytes: number;
}

export function sizeLimits(): SizeLimits {
  return {
    maxRequestBytes: config.maxRequestBytes,
    maxResponseBytes: config.maxResponseBytes,
  };
}

/**
 * Read a response body with a hard byte cap, returning the truncated-safe
 * bytes (or throwing an over-limit error). Callers pass the `res.body` stream.
 */
export async function readBodyWithLimit(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<Uint8Array> {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ResponseLimitError(`response exceeds ${maxBytes} byte limit`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

export class ResponseLimitError extends Error {}
