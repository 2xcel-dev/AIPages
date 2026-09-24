import { type Tool, deriveReliability } from "../types.js";

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
  if (!date) return "Never checked";
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "Never checked";
    return d.toUTCString();
  } catch {
    return "Never checked";
  }
}

function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "Never checked";
  try {
    const d = date instanceof Date ? date : new Date(date);
    const ms = Date.now() - d.getTime();
    if (isNaN(ms)) return "Never checked";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "Never checked";
  }
}

export function renderToolCard(
  tool: Tool,
  baseUrl: string = "/",
  activeCapability?: string,
): string {
  const health = deriveReliability(tool);
  const escapedName = escapeHtml(tool.name);
  const escapedNamespace = escapeHtml(tool.namespace);
  const escapedDescription = escapeHtml(tool.description || "No description provided.");
  const connectionType = escapeHtml(tool.connectionType || "http");
  const pricingModel = tool.pricing?.model || "free";
  const costPerCall = tool.pricing?.costPerCall ?? 0;

  const lastCheckedDate = tool.lastChecked ?? tool.lastCheckedAt ?? (health.lastCheckedIso ? new Date(health.lastCheckedIso) : null);
  const fullTimestamp = formatTimestamp(lastCheckedDate);
  const relativeFreshness = formatRelativeTime(lastCheckedDate);

  let reliabilityBadgeHtml = "";
  let cardStatusClass = "";

  if (health.reliability === "high") {
    cardStatusClass = "card-healthy";
    reliabilityBadgeHtml = `
      <span class="reliability-badge badge-high" title="Healthy: Endpoint reachable on recent check">
        <span class="status-dot dot-high"></span> Operational
      </span>`;
  } else if (health.reliability === "degraded") {
    cardStatusClass = "card-degraded";
    reliabilityBadgeHtml = `
      <span class="reliability-badge badge-degraded" title="Degraded: Check is older than 24 hours">
        <span class="status-dot dot-degraded"></span> Degraded
      </span>`;
  } else if (health.reliability === "failing") {
    cardStatusClass = "card-failing";
    reliabilityBadgeHtml = `
      <span class="reliability-badge badge-failing" title="Failing: Endpoint returned an error or timed out">
        <span class="status-dot dot-failing"></span> Failing
      </span>`;
  } else {
    cardStatusClass = "card-unchecked";
    reliabilityBadgeHtml = `
      <span class="reliability-badge badge-unchecked" title="Unchecked: Automated check pending">
        <span class="status-dot dot-unchecked"></span> Unchecked
      </span>`;
  }

  const isFirstParty = Boolean(
    tool.isFirstParty ??
    tool.developer?.isFirstParty ??
    tool.namespace?.startsWith("net.2xcel.aus")
  );

  return `
    <article class="tool-card ${cardStatusClass}" data-namespace="${escapedNamespace}">
      <div class="tool-card-header">
        <div class="header-left">
          <h3 class="card-title">
            <a href="/tool/${escapedNamespace}">${escapedName}</a>
          </h3>
          <span class="card-ns" title="${escapedNamespace}">${escapedNamespace}</span>
        </div>
        <div class="header-right">
          ${isFirstParty ? `<span class="pill pill-first-party" title="Official first-party Agent Utility Service (AUS)">AUS OFFICIAL</span>` : ""}
          <span class="pill pill-connection">${connectionType.toUpperCase()}</span>
          ${
            pricingModel === "free"
              ? `<span class="pill pill-free">FREE</span>`
              : `<span class="pill pill-paid">$${costPerCall} USDC</span>`
          }
        </div>
      </div>

      <p class="card-description">${escapedDescription}</p>

      <!-- Reliability & Freshness Strip -->
      <div class="card-reliability-strip">
        <div class="reliability-col">
          <span class="strip-label">Reliability</span>
          ${reliabilityBadgeHtml}
        </div>
        <div class="freshness-col">
          <span class="strip-label">Freshness</span>
          <span class="freshness-time" title="${escapeHtml(fullTimestamp)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${escapeHtml(relativeFreshness)}
          </span>
        </div>
      </div>

      ${
        health.reliability === "failing" && health.failureReason
          ? `
      <div class="card-failure-reason" title="${escapeHtml(health.failureReason)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>${escapeHtml(health.failureReason)}</span>
      </div>`
          : ""
      }

      ${
        tool.capabilities && tool.capabilities.length > 0
          ? `
      <div class="card-caps-row">
        ${tool.capabilities.slice(0, 4).map((c) => {
          const isSelected = activeCapability?.toLowerCase().trim() === c.toLowerCase().trim();
          return `<a href="${baseUrl}?capability=${encodeURIComponent(c)}" class="card-cap-pill ${isSelected ? "card-cap-selected" : ""}" title="Filter by capability: ${escapeHtml(c)}">${escapeHtml(c)}</a>`;
        }).join(" ")}
        ${tool.capabilities.length > 4 ? `<span class="card-cap-more">+${tool.capabilities.length - 4}</span>` : ""}
      </div>`
          : ""
      }

      <div class="tool-card-footer">
        <span class="fee-note">${pricingModel === "free" ? "No execution fee" : "$0.25 platform take-rate"}</span>
        <a href="/tool/${escapedNamespace}" class="card-action-link">View Details &amp; Schema &rarr;</a>
      </div>
    </article>
  `;
}

export interface DirectoryFilterParams {
  search?: string;
  reliability?: string;
  connectionType?: string;
  pricingModel?: string;
  baseUrl?: string;
  capability?: string;
  availableCapabilities?: string[];
}

export function buildFilterUrl(
  baseUrl: string,
  params: {
    q?: string;
    reliability?: string;
    connectionType?: string;
    pricingModel?: string;
    capability?: string;
  },
): string {
  const query = new URLSearchParams();
  if (params.q && params.q.trim()) query.set("q", params.q.trim());
  if (params.reliability && params.reliability !== "all") query.set("reliability", params.reliability);
  if (params.connectionType && params.connectionType !== "all") query.set("connectionType", params.connectionType);
  if (params.pricingModel && params.pricingModel !== "all") query.set("pricingModel", params.pricingModel);
  if (params.capability && params.capability !== "all") query.set("capability", params.capability);

  const qs = query.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

export function renderDirectoryPage(
  tools: Tool[],
  totalCount: number,
  filters: DirectoryFilterParams = {},
): string {
  const baseUrl = filters.baseUrl || "/";
  const searchQuery = escapeHtml(filters.search ?? "");
  const activeReliability = filters.reliability ?? "all";
  const activeCapability = filters.capability ?? "all";
  const availableCapabilities = filters.availableCapabilities ?? [];
  const activeConn = filters.connectionType ?? "all";
  const activePricing = filters.pricingModel ?? "all";

  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim()) ||
    (activeCapability && activeCapability !== "all") ||
    (activeReliability && activeReliability !== "all") ||
    (activeConn && activeConn !== "all") ||
    (activePricing && activePricing !== "all")
  );

  const cardsHtml = tools.length > 0
    ? tools.map((t) => renderToolCard(t, baseUrl, activeCapability)).join("\n")
    : `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>No tools matched your criteria</h3>
        <p>${
          filters.capability && filters.capability !== "all"
            ? `No tools found with capability &ldquo;${escapeHtml(filters.capability)}&rdquo;${filters.search ? ` and query &ldquo;${searchQuery}&rdquo;` : ""}.`
            : filters.search
              ? `No tools found matching &ldquo;${searchQuery}&rdquo;. Try clearing filters or search with different keywords.`
              : "Try clearing filters or search with different keywords."
        }</p>
        <a href="${baseUrl}" class="btn" style="margin-top: 14px;">View All Tools</a>
        ${
          filters.capability && filters.capability !== "all"
            ? `<a href="${buildFilterUrl(baseUrl, { q: filters.search, reliability: activeReliability, capability: "all" })}" class="btn btn-secondary" style="margin-top: 14px; margin-left: 8px;">Clear Capability Filter</a>`
            : ""
        }
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIPages Tool Directory - Autonomous Agent Tool Registry</title>
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
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
      --healthy-border: rgba(16, 185, 129, 0.3);
      --degraded: #f59e0b;
      --degraded-bg: rgba(245, 158, 11, 0.12);
      --degraded-border: rgba(245, 158, 11, 0.3);
      --failing: #ef4444;
      --failing-bg: rgba(239, 68, 68, 0.14);
      --failing-border: rgba(239, 68, 68, 0.35);
      --unchecked: #94a3b8;
      --unchecked-bg: rgba(148, 163, 184, 0.12);
      --unchecked-border: rgba(148, 163, 184, 0.25);
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
      line-height: 1.5;
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
      max-width: 1200px;
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

    /* Hero */
    .hero {
      padding: 36px 0 24px;
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
    }
    .hero-title {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #fff;
      margin-bottom: 10px;
    }
    .hero-subtitle {
      font-size: 1.05rem;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    /* Controls & Search */
    .directory-controls {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 32px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    .search-row {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .search-input {
      flex: 1;
      background: var(--card-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 16px;
      font-size: 0.95rem;
      color: var(--text);
      outline: none;
      transition: border-color 0.15s;
    }
    .search-input:focus {
      border-color: var(--primary);
    }
    .btn {
      background: var(--primary);
      color: #090d16;
      border: none;
      border-radius: var(--radius-sm);
      padding: 10px 20px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn:hover {
      background: var(--primary-hover);
      color: #fff;
      text-decoration: none;
    }

    .filter-pills-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }
    .filter-label {
      color: var(--text-dim);
      font-weight: 600;
      margin-right: 4px;
    }
    .filter-chip {
      background: var(--card-surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.82rem;
      transition: all 0.15s ease;
    }
    .filter-chip:hover {
      border-color: var(--primary);
      color: var(--text);
      text-decoration: none;
    }
    .filter-chip.active {
      background: rgba(56, 189, 248, 0.15);
      border-color: var(--primary);
      color: var(--primary);
      font-weight: 600;
    }

    /* Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    /* Tool Card */
    .tool-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .tool-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-light);
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    }
    .tool-card.card-healthy {
      border-left: 3px solid var(--healthy);
    }
    .tool-card.card-degraded {
      border-left: 3px solid var(--degraded);
    }
    .tool-card.card-failing {
      border-left: 3px solid var(--failing);
    }
    .tool-card.card-unchecked {
      border-left: 3px solid var(--unchecked);
    }

    .tool-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }
    .header-left {
      min-width: 0;
      flex: 1;
    }
    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-title a {
      color: #fff;
    }
    .card-title a:hover {
      color: var(--primary);
    }
    .card-ns {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.74rem;
      color: var(--primary);
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }

    .pill {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pill-connection {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid var(--border);
    }
    .pill-free {
      background: var(--healthy-bg);
      color: var(--healthy);
      border: 1px solid var(--healthy-border);
    }
    .pill-paid {
      background: rgba(56, 189, 248, 0.12);
      color: var(--primary);
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .pill-first-party {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
      font-weight: 800;
    }

    .card-description {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin: 10px 0 16px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-grow: 1;
    }

    /* Reliability Strip */
    .card-reliability-strip {
      background: var(--card-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 0.82rem;
    }
    .reliability-col, .freshness-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .freshness-col {
      align-items: flex-end;
    }
    .strip-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: var(--text-dim);
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .reliability-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .badge-high { color: var(--healthy); }
    .dot-high { background: var(--healthy); box-shadow: 0 0 6px var(--healthy); }
    .badge-degraded { color: var(--degraded); }
    .dot-degraded { background: var(--degraded); box-shadow: 0 0 6px var(--degraded); }
    .badge-failing { color: var(--failing); }
    .dot-failing { background: var(--failing); box-shadow: 0 0 6px var(--failing); }
    .badge-unchecked { color: var(--unchecked); }
    .dot-unchecked { background: var(--unchecked); }

    .freshness-time {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* Failure reason callout */
    .card-failure-reason {
      background: var(--failing-bg);
      border: 1px solid var(--failing-border);
      color: #fca5a5;
      font-size: 0.76rem;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tool-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.8rem;
    }
    .fee-note {
      color: var(--text-dim);
    }
    .card-action-link {
      font-weight: 600;
      font-size: 0.84rem;
    }
    .card-caps-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 8px 0 10px;
    }
    .card-cap-pill {
      font-size: 0.7rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 2px 7px;
      border-radius: 4px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .card-cap-pill:hover {
      border-color: var(--primary);
      color: var(--primary);
      text-decoration: none;
    }
    .card-cap-selected {
      background: rgba(56, 189, 248, 0.15);
      border-color: var(--primary);
      color: var(--primary);
      font-weight: 600;
    }
    .card-cap-more {
      font-size: 0.68rem;
      color: var(--text-dim);
      align-self: center;
      padding: 1px 4px;
    }
    .capability-pills-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .cap-filter-chip {
      font-size: 0.78rem;
      padding: 3px 10px;
    }
    .active-filter-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid var(--primary);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.8rem;
    }
    .clear-tag-btn {
      color: var(--primary);
      text-decoration: none;
      font-weight: 700;
      font-size: 1rem;
      line-height: 1;
      margin-left: 2px;
    }
    .clear-tag-btn:hover {
      color: #fff;
    }
    .btn-clear-filter {
      background: transparent;
      border: 1px solid var(--border-light);
      color: var(--text-muted);
      font-size: 0.78rem;
      padding: 4px 10px;
    }
    .btn-clear-filter:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      border-color: var(--primary);
    }
    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border-light);
      color: var(--text-muted);
    }
    .btn-secondary:hover {
      border-color: var(--primary);
      color: #fff;
    }

    /* Empty state */
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 48px 20px;
      background: var(--card-bg);
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      color: var(--text-muted);
    }
    .empty-state svg {
      color: var(--text-dim);
      margin-bottom: 12px;
    }
    .empty-state h3 {
      color: #fff;
      font-size: 1.25rem;
      margin-bottom: 6px;
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
        <a href="/tool">Directory</a>
        <a href="/capabilities">Capabilities</a>
        <a href="/search">Vector Search</a>
        <a href="/api/tools">API Tools</a>
        <a href="/api/openapi.json">OpenAPI Spec</a>
      </div>
    </div>
  </nav>

  <main class="container">
    <section class="hero">
      <h1 class="hero-title">AI Agent Tool Directory</h1>
      <p class="hero-subtitle">
        Explore authoritative, schema-validated tools for autonomous software agents on Base Mainnet.
        Each tool card displays live endpoint reliability and probe freshness.
      </p>
    </section>

    <!-- Controls -->
    <section class="directory-controls">
      <form method="GET" action="${baseUrl}" class="search-row">
        ${activeCapability && activeCapability !== "all" ? `<input type="hidden" name="capability" value="${escapeHtml(activeCapability)}" />` : ""}
        ${activeReliability && activeReliability !== "all" ? `<input type="hidden" name="reliability" value="${escapeHtml(activeReliability)}" />` : ""}
        <input
          type="text"
          name="q"
          class="search-input"
          placeholder="Search tools by name, description, namespace, or capability…"
          value="${searchQuery}"
        />
        <button type="submit" class="btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          Search
        </button>
      </form>

      <div class="filter-pills-row">
        <span class="filter-label">Reliability:</span>
        <a href="${buildFilterUrl(baseUrl, { q: filters.search, capability: activeCapability, reliability: "all" })}"
           class="filter-chip ${activeReliability === "all" ? "active" : ""}">All</a>
        <a href="${buildFilterUrl(baseUrl, { q: filters.search, capability: activeCapability, reliability: "high" })}"
           class="filter-chip ${activeReliability === "high" ? "active" : ""}">Operational</a>
        <a href="${buildFilterUrl(baseUrl, { q: filters.search, capability: activeCapability, reliability: "degraded" })}"
           class="filter-chip ${activeReliability === "degraded" ? "active" : ""}">Degraded</a>
        <a href="${buildFilterUrl(baseUrl, { q: filters.search, capability: activeCapability, reliability: "failing" })}"
           class="filter-chip ${activeReliability === "failing" ? "active" : ""}">Failing</a>
        <a href="${buildFilterUrl(baseUrl, { q: filters.search, capability: activeCapability, reliability: "unchecked" })}"
           class="filter-chip ${activeReliability === "unchecked" ? "active" : ""}">Unchecked</a>
      </div>

      ${
        availableCapabilities && availableCapabilities.length > 0
          ? `
      <div class="filter-pills-row capability-pills-row">
        <span class="filter-label">Capability:</span>
        <a href="${buildFilterUrl(baseUrl, { q: filters.search, reliability: activeReliability, capability: "all" })}"
           class="filter-chip ${!activeCapability || activeCapability === "all" ? "active" : ""}"
           data-capability="all">All</a>
        ${availableCapabilities
          .map((cap) => {
            const isActive = activeCapability?.toLowerCase().trim() === cap.toLowerCase().trim();
            const targetUrl = buildFilterUrl(baseUrl, {
              q: filters.search,
              reliability: activeReliability,
              capability: isActive ? "all" : cap,
            });
            return `<a href="${targetUrl}" class="filter-chip cap-filter-chip ${isActive ? "active" : ""}" data-capability="${escapeHtml(cap)}" title="${isActive ? "Click to clear filter" : `Filter by ${escapeHtml(cap)}`}">${isActive ? `✕ ${escapeHtml(cap)}` : escapeHtml(cap)}</a>`;
          })
          .join("\n        ")}
      </div>
      `
          : ""
      }
    </section>

    <!-- Results Header: Match Count Summary and Filter Reset State -->
    <div class="results-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
      <div style="font-size: 0.9rem; color: var(--text-muted); display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">
        <span>Showing <strong>${tools.length}</strong> of <strong>${totalCount}</strong> registered tools</span>
        ${searchQuery ? ` matching "<em>${searchQuery}</em>"` : ""}
        ${
          activeCapability && activeCapability !== "all"
            ? ` with capability <span class="active-filter-tag">${escapeHtml(activeCapability)} <a href="${buildFilterUrl(baseUrl, { q: filters.search, reliability: activeReliability, connectionType: activeConn, pricingModel: activePricing, capability: "all" })}" class="clear-tag-btn" title="Clear capability filter">&times;</a></span>`
            : ""
        }
        ${
          activeReliability && activeReliability !== "all"
            ? ` with reliability <span class="active-filter-tag">${escapeHtml(activeReliability)} <a href="${buildFilterUrl(baseUrl, { q: filters.search, capability: activeCapability, connectionType: activeConn, pricingModel: activePricing, reliability: "all" })}" class="clear-tag-btn" title="Clear reliability filter">&times;</a></span>`
            : ""
        }
      </div>
      ${
        hasActiveFilters
          ? `
      <div style="display: flex; gap: 8px; align-items: center;">
        ${
          activeCapability && activeCapability !== "all"
            ? `<a href="${buildFilterUrl(baseUrl, { q: filters.search, reliability: activeReliability, connectionType: activeConn, pricingModel: activePricing, capability: "all" })}" class="btn btn-sm btn-clear-filter">Clear Capability Filter</a>`
            : ""
        }
        <a href="${baseUrl}" class="btn btn-sm btn-clear-filter" title="Reset all filters and view full directory">
          Reset All Filters
        </a>
      </div>
      `
          : ""
      }
    </div>

    <!-- Cards Grid -->
    <section class="cards-grid" aria-label="Tool Directory Cards">
      ${cardsHtml}
    </section>
  </main>

  <footer>
    <div class="container footer-inner">
      <div>AIPages: Machine-Native Discovery &amp; Vector Index for Autonomous Agents. Base Mainnet.</div>
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
