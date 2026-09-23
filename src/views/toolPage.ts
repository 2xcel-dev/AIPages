import { type Tool, deriveReliability } from "../types.js";
import { type ToolStore } from "../db.js";

function escapeHtml(str: unknown): string {
  if (typeof str !== "string") {
    if (str === null || str === undefined) return "";
    str = String(str);
  }
  return (str as string)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTimestamp(date: Date | null | undefined): string {
  if (!date) return "None recorded";
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "None recorded";
    return d.toUTCString();
  } catch {
    return "None recorded";
  }
}

function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "";
  try {
    const d = date instanceof Date ? date : new Date(date);
    const ms = Date.now() - d.getTime();
    if (isNaN(ms)) return "";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

export async function findToolBySlug(store: ToolStore, slug: string): Promise<Tool | null> {
  if (!slug) return null;

  // 1. Direct namespace lookup
  let tool = await store.getByNamespace(slug);
  if (tool) return tool;

  // 2. URI decoded lookup
  const decoded = decodeURIComponent(slug);
  if (decoded !== slug) {
    tool = await store.getByNamespace(decoded);
    if (tool) return tool;
  }

  // 3. Fallback search through all tools
  const allTools = await store.list();
  const lowerSlug = slug.toLowerCase();

  // Match exact name
  const byName = allTools.find((t) => t.name.toLowerCase() === lowerSlug);
  if (byName) return byName;

  // Match last namespace segment (e.g. "schema-sanitizer" from "net.2xcel.aus.schema-sanitizer")
  const bySuffix = allTools.find((t) => {
    const parts = t.namespace.split(".");
    return parts[parts.length - 1]?.toLowerCase() === lowerSlug;
  });
  if (bySuffix) return bySuffix;

  // Match normalized slug
  const normalizedSlug = lowerSlug.replace(/[^a-z0-9]+/g, "-");
  const byNormalized = allTools.find((t) => {
    const normName = t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const normNs = t.namespace.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return normName === normalizedSlug || normNs === normalizedSlug;
  });
  if (byNormalized) return byNormalized;

  return null;
}

export async function findRelatedTools(
  store: ToolStore,
  tool: Tool,
  limit: number = 3,
): Promise<Tool[]> {
  if (!tool.capabilities || tool.capabilities.length === 0) {
    return [];
  }

  const currentCaps = new Set(
    tool.capabilities.map((c) => c.toLowerCase().trim()),
  );
  const allTools = await store.list();

  const candidates = allTools.filter(
    (t) =>
      t.namespace !== tool.namespace &&
      (!t.status || t.status === "active") &&
      t.capabilities &&
      t.capabilities.length > 0,
  );

  const scored = candidates
    .map((candidate) => {
      const candidateCaps = (candidate.capabilities ?? []).map((c) =>
        c.toLowerCase().trim(),
      );
      const shared = candidateCaps.filter((c) => currentCaps.has(c));
      return {
        tool: candidate,
        sharedCount: shared.length,
      };
    })
    .filter((item) => item.sharedCount > 0);

  scored.sort((a, b) => b.sharedCount - a.sharedCount);

  return scored.slice(0, limit).map((item) => item.tool);
}

export function renderToolPage(tool: Tool, relatedTools: Tool[] = []): string {
  const health = deriveReliability(tool);
  const escapedName = escapeHtml(tool.name);
  const escapedNamespace = escapeHtml(tool.namespace);
  const escapedDescription = escapeHtml(tool.description || "No description provided.");
  const escapedEndpoint = tool.endpointUrl ? escapeHtml(tool.endpointUrl) : null;
  const connectionType = escapeHtml(tool.connectionType || "http");
  const pricingModel = tool.pricing?.model || "free";
  const costPerCall = tool.pricing?.costPerCall ?? 0;
  const devAddress = tool.developer?.address ? escapeHtml(tool.developer.address) : null;
  const updatedAtFormatted = formatTimestamp(tool.updatedAt);
  const schemaJson = tool.schema ? escapeHtml(JSON.stringify(tool.schema, null, 2)) : null;

  const isFirstParty = Boolean(
    tool.isFirstParty ??
    tool.developer?.isFirstParty ??
    tool.namespace?.startsWith("net.2xcel.aus")
  );

  // Health & Reliability classification
  const isHealthy = health.reliability === "high";
  const isDegraded = health.reliability === "degraded";
  const isFailing = health.reliability === "failing" || health.healthStatus === "inactive";
  const isUnchecked = !isHealthy && !isDegraded && !isFailing;

  let statusBadgeHtml = "";
  let statusClass = "";
  let statusTitle = "";
  let statusSummary = "";

  if (isHealthy) {
    statusClass = "status-healthy";
    statusTitle = "Operational (Healthy)";
    statusBadgeHtml = `<span class="badge badge-healthy"><span class="pulse-dot"></span> Operational</span>`;
    statusSummary = "Endpoint is responding normally to automated reachability probes.";
  } else if (isDegraded) {
    statusClass = "status-degraded";
    statusTitle = "Degraded (Stale Probe)";
    statusBadgeHtml = `<span class="badge badge-degraded"><span class="pulse-dot"></span> Degraded (Stale)</span>`;
    statusSummary = "Endpoint was reachable on last probe, but no check has occurred in over 24 hours.";
  } else if (isFailing) {
    statusClass = "status-failing";
    statusTitle = "Failing (Endpoint Unreachable)";
    statusBadgeHtml = `<span class="badge badge-failing"><span class="pulse-dot"></span> Failing</span>`;
    statusSummary = "Endpoint failed to respond or returned an error status code during the most recent check.";
  } else {
    statusClass = "status-unchecked";
    statusTitle = "Not Yet Checked";
    statusBadgeHtml = `<span class="badge badge-unchecked"><span class="pulse-dot"></span> Not Yet Checked</span>`;
    statusSummary = "No automated liveness probe has been recorded for this endpoint yet.";
  }

  const lastCheckedDate = tool.lastChecked ?? tool.lastCheckedAt ?? (health.lastCheckedIso ? new Date(health.lastCheckedIso) : null);
  const lastCheckedFormatted = formatTimestamp(lastCheckedDate);
  const relativeTime = formatRelativeTime(lastCheckedDate);
  const lastCheckedDisplay = relativeTime ? `${lastCheckedFormatted} (${relativeTime})` : lastCheckedFormatted;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedName} — AIPages Agent Tool Registry</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-surface: #1a2234;
      --border: #27354f;
      --border-light: #334466;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #38bdf8;
      --primary-hover: #0284c7;
      --healthy: #10b981;
      --healthy-bg: rgba(16, 185, 129, 0.12);
      --healthy-border: rgba(16, 185, 129, 0.35);
      --degraded: #f59e0b;
      --degraded-bg: rgba(245, 158, 11, 0.12);
      --degraded-border: rgba(245, 158, 11, 0.35);
      --failing: #ef4444;
      --failing-bg: rgba(239, 68, 68, 0.14);
      --failing-border: rgba(239, 68, 68, 0.4);
      --unchecked: #94a3b8;
      --unchecked-bg: rgba(148, 163, 184, 0.12);
      --unchecked-border: rgba(148, 163, 184, 0.3);
      --code-bg: #0d131f;
      --radius: 12px;
      --radius-sm: 6px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    a {
      color: var(--primary);
      text-decoration: none;
      transition: color 0.15s ease;
    }
    a:hover {
      text-decoration: underline;
    }

    .container {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 20px;
    }

    /* Navbar */
    .nav {
      border-bottom: 1px solid var(--border);
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .nav-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 60px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 1.15rem;
      color: var(--text);
      letter-spacing: -0.02em;
    }
    .brand-badge {
      font-size: 0.72rem;
      background: #1e293b;
      color: var(--primary);
      border: 1px solid var(--border-light);
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nav-links {
      display: flex;
      gap: 20px;
      font-size: 0.9rem;
    }
    .nav-links a {
      color: var(--text-muted);
    }
    .nav-links a:hover {
      color: var(--text);
      text-decoration: none;
    }

    /* Hero Section */
    .hero {
      padding: 32px 0 24px;
    }
    .hero-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .tool-title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #fff;
    }
    .namespace-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.82rem;
      background: var(--card-bg);
      color: var(--primary);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      word-break: break-all;
    }
    .tool-description {
      font-size: 1.05rem;
      color: var(--text-muted);
      max-width: 850px;
      margin-top: 8px;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 999px;
      line-height: 1;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .badge-healthy {
      background: var(--healthy-bg);
      color: var(--healthy);
      border: 1px solid var(--healthy-border);
    }
    .badge-healthy .pulse-dot {
      background: var(--healthy);
      box-shadow: 0 0 8px var(--healthy);
    }
    .badge-degraded {
      background: var(--degraded-bg);
      color: var(--degraded);
      border: 1px solid var(--degraded-border);
    }
    .badge-degraded .pulse-dot {
      background: var(--degraded);
      box-shadow: 0 0 8px var(--degraded);
    }
    .badge-failing {
      background: var(--failing-bg);
      color: var(--failing);
      border: 1px solid var(--failing-border);
    }
    .badge-failing .pulse-dot {
      background: var(--failing);
      box-shadow: 0 0 8px var(--failing);
    }
    .badge-unchecked {
      background: var(--unchecked-bg);
      color: var(--unchecked);
      border: 1px solid var(--unchecked-border);
    }
    .badge-unchecked .pulse-dot {
      background: var(--unchecked);
    }
    .badge-first-party {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
      font-weight: 700;
    }

    /* Responsive Grid */
    .grid-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
    }
    @media (max-width: 860px) {
      .grid-layout {
        grid-template-columns: 1fr;
      }
    }

    /* Cards */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Reliability Section Styles */
    .reliability-card {
      border-top: 3px solid;
    }
    .reliability-card.status-healthy {
      border-top-color: var(--healthy);
    }
    .reliability-card.status-degraded {
      border-top-color: var(--degraded);
    }
    .reliability-card.status-failing {
      border-top-color: var(--failing);
    }
    .reliability-card.status-unchecked {
      border-top-color: var(--unchecked);
    }

    .reliability-summary {
      background: var(--card-surface);
      border: 1px solid var(--border);
      padding: 16px;
      border-radius: var(--radius-sm);
      margin-bottom: 18px;
    }
    .reliability-summary-title {
      font-weight: 600;
      font-size: 0.95rem;
      color: #fff;
      margin-bottom: 4px;
    }
    .reliability-summary-desc {
      font-size: 0.88rem;
      color: var(--text-muted);
    }

    .meta-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      font-size: 0.9rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      padding-bottom: 8px;
    }
    .meta-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .meta-label {
      color: var(--text-dim);
      font-weight: 500;
      min-width: 120px;
    }
    .meta-value {
      color: var(--text);
      font-weight: 500;
      text-align: right;
      word-break: break-all;
    }
    .meta-value code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Failure Diagnostic Box */
    .failure-box {
      background: var(--failing-bg);
      border: 1px solid var(--failing-border);
      color: #fca5a5;
      padding: 14px 16px;
      border-radius: var(--radius-sm);
      margin-top: 14px;
      font-size: 0.88rem;
    }
    .failure-box-header {
      font-weight: 700;
      color: #ef4444;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Scope Disclaimer */
    .scope-disclaimer {
      margin-top: 20px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--border);
      border-left: 3px solid var(--primary);
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .scope-disclaimer strong {
      color: #fff;
      display: block;
      margin-bottom: 2px;
    }

    /* Full Width Sections */
    .full-width {
      margin-top: 24px;
    }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      color: #cbd5e1;
      overflow-x: auto;
      max-height: 380px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--primary);
      color: #090d16;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn:hover {
      background: #0284c7;
      color: #fff;
      text-decoration: none;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8rem;
    }

    /* Related Tools Grid */
    .related-tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      margin-top: 14px;
    }
    .related-tool-card {
      background: var(--card-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: border-color 0.15s, transform 0.15s;
    }
    .related-tool-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
    }
    .related-tool-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 4px;
    }
    .related-tool-name {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }
    .related-tool-name a {
      color: #fff;
      text-decoration: none;
    }
    .related-tool-name a:hover {
      color: var(--primary);
      text-decoration: underline;
    }
    .related-tool-price {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--healthy);
      background: var(--healthy-bg);
      border: 1px solid var(--healthy-border);
      padding: 2px 6px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .related-tool-ns {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.72rem;
      color: var(--text-dim);
      margin-bottom: 8px;
      word-break: break-all;
    }
    .related-tool-desc {
      font-size: 0.82rem;
      color: var(--text-muted);
      line-height: 1.4;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .related-tool-caps {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 12px;
    }
    .cap-tag {
      font-size: 0.7rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .cap-shared {
      background: rgba(56, 189, 248, 0.12);
      border-color: rgba(56, 189, 248, 0.3);
      color: var(--primary);
      font-weight: 600;
    }
    .related-tool-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 8px;
      margin-top: auto;
    }
    .btn-link {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--primary);
      text-decoration: none;
    }
    .btn-link:hover {
      text-decoration: underline;
    }
    .related-tools-empty {
      background: var(--card-surface);
      border: 1px dashed var(--border);
      border-radius: var(--radius-sm);
      padding: 24px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.88rem;
      margin-top: 12px;
    }

    /* Footer */
    footer {
      margin-top: auto;
      border-top: 1px solid var(--border);
      background: var(--card-bg);
      padding: 24px 0;
      color: var(--text-dim);
      font-size: 0.85rem;
    }
    .footer-inner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <a href="/" class="brand">
        AIPages
        <span class="brand-badge">Registry</span>
      </a>
      <div class="nav-links">
        <a href="/search">Vector Search</a>
        <a href="/api/tools">Tools API</a>
        <a href="/api/openapi.json">OpenAPI Spec</a>
      </div>
    </div>
  </nav>

  <main class="container">
    <div class="hero">
      <div class="hero-top">
        <h1 class="tool-title">${escapedName}</h1>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          ${isFirstParty ? `<span class="badge badge-first-party">★ First-Party AUS Tool</span>` : ""}
          ${statusBadgeHtml}
        </div>
      </div>
      <div style="margin-bottom: 12px;">
        <span class="namespace-tag">${escapedNamespace}</span>
      </div>
      <p class="tool-description">${escapedDescription}</p>
    </div>

    <div class="grid-layout">
      <!-- Reliability Section -->
      <section class="card reliability-card ${statusClass}" aria-label="Endpoint Reliability">
        <div class="card-header">
          <h2 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Endpoint Reliability
          </h2>
          ${statusBadgeHtml}
        </div>

        <div class="reliability-summary">
          <div class="reliability-summary-title">${escapeHtml(statusTitle)}</div>
          <div class="reliability-summary-desc">${escapeHtml(statusSummary)}</div>
        </div>

        <div class="meta-list">
          <div class="meta-row">
            <span class="meta-label">Current Status</span>
            <span class="meta-value"><strong>${escapeHtml(health.healthStatus || "unknown")}</strong></span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Reliability Index</span>
            <span class="meta-value"><code>${escapeHtml(health.reliability ?? "null (unchecked)")}</code></span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Last Checked</span>
            <span class="meta-value">${escapeHtml(lastCheckedDisplay)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Monitored Endpoint</span>
            <span class="meta-value">
              ${
                escapedEndpoint
                  ? `<a href="${escapedEndpoint}" target="_blank" rel="noopener noreferrer">${escapedEndpoint}</a>`
                  : `<span style="color: var(--text-dim); font-style: italic;">No remote endpoint (stdio/local)</span>`
              }
            </span>
          </div>
        </div>

        ${
          isFailing && health.failureReason
            ? `
        <div class="failure-box" role="alert">
          <div class="failure-box-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Automated Probe Failure
          </div>
          <div><strong>Reason:</strong> ${escapeHtml(health.failureReason)}</div>
        </div>
        `
            : ""
        }

        ${
          isUnchecked
            ? `
        <div style="background: var(--card-surface); border: 1px dashed var(--border); padding: 12px 14px; border-radius: var(--radius-sm); margin-top: 14px; font-size: 0.85rem; color: var(--text-muted);">
          <strong>Health Monitoring:</strong> This tool has not yet been probed by the automated outreach worker. Probes evaluate HTTP endpoint reachability with bounded timeouts.
        </div>
        `
            : ""
        }

        <div class="scope-disclaimer">
          <strong>Recorded Probe Scope:</strong>
          Reliability status is derived solely from automated endpoint reachability probes (HTTP status &amp; network connectivity). It confirms server liveness at the recorded timestamp and does not certify semantic correctness, execution safety, or formal security audit.
        </div>
      </section>

      <!-- Tool Metadata Section -->
      <section class="card" aria-label="Tool Metadata">
        <div class="card-header">
          <h2 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            Tool Metadata
          </h2>
          <span style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase; font-weight: 600;">
            ${escapeHtml(tool.status || "active")}
          </span>
        </div>

        <div class="meta-list">
          ${
            isFirstParty
              ? `
          <div class="meta-row">
            <span class="meta-label">Service Tier</span>
            <span class="meta-value"><strong>First-Party Official (Agent Utility Services)</strong></span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Authentication</span>
            <span class="meta-value"><code>${escapeHtml(tool.authentication || "x402 (Base USDC receipt header: x-payment-receipt)")}</code></span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Rate Limit</span>
            <span class="meta-value">${escapeHtml(tool.rateLimit || "100 requests per 60 seconds per IP")}</span>
          </div>
          `
              : ""
          }
          ${
            tool.capabilities && tool.capabilities.length > 0
              ? `
          <div class="meta-row">
            <span class="meta-label">Capabilities</span>
            <span class="meta-value">${tool.capabilities.map((c) => `<code>${escapeHtml(c)}</code>`).join(" ")}</span>
          </div>
          `
              : ""
          }
          <div class="meta-row">
            <span class="meta-label">Connection</span>
            <span class="meta-value"><code>${connectionType.toUpperCase()}</code></span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Pricing Model</span>
            <span class="meta-value">
              ${
                pricingModel === "free"
                  ? `<span style="color: var(--healthy); font-weight: 600;">Free</span>`
                  : `<span style="color: var(--primary); font-weight: 600;">Paid ($${costPerCall} USDC)</span>`
              }
            </span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Platform Take-Rate</span>
            <span class="meta-value">
              ${
                pricingModel === "free"
                  ? `<span style="color: var(--text-muted);">$0 (Free tool)</span>`
                  : `<span style="color: var(--text-muted);">$0.25 USDC (On success only)</span>`
              }
            </span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Payment Network</span>
            <span class="meta-value">Base Mainnet (Chain ID 8453)</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Developer</span>
            <span class="meta-value">
              ${
                devAddress
                  ? `<a href="https://basescan.org/address/${devAddress}" target="_blank" rel="noopener noreferrer"><code>${devAddress.slice(0, 6)}...${devAddress.slice(-4)}</code></a>`
                  : `<span style="color: var(--text-dim);">Unregistered</span>`
              }
            </span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Vector Dimension</span>
            <span class="meta-value">${tool.embedding?.length ?? 3072} dims (Gemini)</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Last Updated</span>
            <span class="meta-value">${escapeHtml(updatedAtFormatted)}</span>
          </div>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
          <div style="font-size: 0.85rem; font-weight: 600; color: #fff; margin-bottom: 8px;">Direct Execution Proxy</div>
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px;">
            Invoke dynamically with autonomous agent wallet authorization:
          </div>
          <pre style="margin: 0;"><code>POST /api/invoke/${escapedNamespace}
Host: aus.2xcel.net
X-Payment: &lt;base-usdc-tx-hash&gt;
Content-Type: application/json</code></pre>
        </div>
      </section>
    </div>

    <!-- Schema Section -->
    ${
      schemaJson
        ? `
    <section class="card full-width" aria-label="Input Schema">
      <div class="card-header">
        <h2 class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          Input Parameters Schema
        </h2>
        <span style="font-size: 0.8rem; color: var(--text-dim); font-family: monospace;">JSON Schema (Draft-07)</span>
      </div>
      <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 12px;">
        Payloads dispatched to this tool are strictly validated against this schema before proxying.
      </p>
      <pre><code>${schemaJson}</code></pre>
    </section>
    `
        : ""
    }

    <!-- Related Tools Section -->
    <section class="card full-width" aria-label="Related Tools by Shared Capabilities">
      <div class="card-header">
        <h2 class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          Related Tools by Shared Capabilities
        </h2>
        <span style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase; font-weight: 600;">
          Directory Discovery
        </span>
      </div>
      ${
        relatedTools && relatedTools.length > 0
          ? `
      <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">
        Other public tools in the AIPages directory sharing capability tags with <strong>${escapedName}</strong>:
      </p>
      <div class="related-tools-grid">
        ${relatedTools
          .map((relTool) => {
            const relName = escapeHtml(relTool.name);
            const relNs = escapeHtml(relTool.namespace);
            const relDesc = escapeHtml(relTool.description || "No description provided.");
            const relPrice = relTool.pricing?.model === "free" ? "Free" : `$${relTool.pricing?.costPerCall ?? 0} USDC`;
            const currentCaps = new Set((tool.capabilities ?? []).map((c) => c.toLowerCase().trim()));
            const sharedCaps = (relTool.capabilities ?? []).filter((c) => currentCaps.has(c.toLowerCase().trim()));
            const otherCaps = (relTool.capabilities ?? []).filter((c) => !currentCaps.has(c.toLowerCase().trim()));

            return `
        <div class="related-tool-card" data-namespace="${relNs}">
          <div class="related-tool-header">
            <h3 class="related-tool-name">
              <a href="/tools/${relNs}">${relName}</a>
            </h3>
            <span class="related-tool-price">${relPrice}</span>
          </div>
          <div class="related-tool-ns">${relNs}</div>
          <p class="related-tool-desc">${relDesc}</p>
          <div class="related-tool-caps">
            ${sharedCaps.map((c) => `<span class="cap-tag cap-shared" title="Shared capability">★ ${escapeHtml(c)}</span>`).join(" ")}
            ${otherCaps.slice(0, 2).map((c) => `<span class="cap-tag">${escapeHtml(c)}</span>`).join(" ")}
          </div>
          <div class="related-tool-footer">
            <a href="/tools/${relNs}" class="btn-link">View Details &rarr;</a>
          </div>
        </div>`;
          })
          .join("\n")}
      </div>
      `
          : `
      <div class="related-tools-empty">
        <p>No other public tools currently share capability tags with this listing.</p>
        <a href="/tools" class="btn btn-sm" style="margin-top: 10px;">Browse Full Directory</a>
      </div>
      `
      }
    </section>
  </main>

  <footer>
    <div class="container footer-inner">
      <div>AIPages — Autonomous AI Agent Registry &amp; Vector Index. Base Mainnet.</div>
      <div>
        <a href="/api/tools">API Tools</a> &bull; 
        <a href="/api/openapi.json">OpenAPI 3.1</a> &bull; 
        <a href="https://github.com/2xcel-dev/AIPages" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

export function renderNotFoundPage(slug: string): string {
  const escapedSlug = escapeHtml(slug);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Not Found — AIPages</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #111827;
      border: 1px solid #27354f;
      border-radius: 12px;
      padding: 36px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    h1 {
      font-size: 1.75rem;
      margin-bottom: 12px;
      color: #ef4444;
    }
    p {
      color: #94a3b8;
      margin-bottom: 24px;
      font-size: 0.95rem;
    }
    code {
      background: #0d131f;
      color: #38bdf8;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: monospace;
      word-break: break-all;
    }
    .btn {
      display: inline-block;
      background: #38bdf8;
      color: #090d16;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn:hover {
      background: #0284c7;
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Tool Not Found</h1>
    <p>No tool matching <code>${escapedSlug}</code> could be found in the AIPages registry.</p>
    <a href="/search" class="btn">Search All Tools</a>
  </div>
</body>
</html>`;
}
