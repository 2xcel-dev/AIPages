import { deriveReliability } from "../types.js";
import { escapeHtml } from "./utils.js";
import { renderWebMcpRuntimeScript } from "./agentDiscovery.js";
import { SHARED_DESIGN_SYSTEM_CSS, formatHumanToolTitle, getFlowArtworkForTool, renderSharedNavbar, renderSharedFooter, } from "./sharedLayout.js";
function formatTimestamp(date) {
    if (!date)
        return "Never checked";
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime()))
            return "Never checked";
        return d.toUTCString();
    }
    catch {
        return "Never checked";
    }
}
function formatRelativeTime(date) {
    if (!date)
        return "Never checked";
    try {
        const d = date instanceof Date ? date : new Date(date);
        const ms = Date.now() - d.getTime();
        if (isNaN(ms))
            return "Never checked";
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60)
            return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60)
            return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
    catch {
        return "Never checked";
    }
}
const CORE_AUS_NAMES = new Set([
    "schema_sanitizer",
    "financial_audit",
    "verification_oracle",
    "geospatial_verifier",
    "cron_parser",
    "pii_redactor",
    "token_counter",
    "webhook_signer",
    "sentiment_scorer",
    "json_diff_engine",
    "regex_synthesizer",
    "jwt_inspector",
    "markdown_ast",
    "rate_limiter_calc",
    "ip_reputation",
    "dependency_auditor",
]);
export function classifyToolGroup(tool) {
    const lowerName = (tool.name || "").toLowerCase();
    const isFirstParty = Boolean(tool.isFirstParty ??
        tool.developer?.isFirstParty ??
        tool.namespace?.startsWith("net.2xcel.aus"));
    if (CORE_AUS_NAMES.has(lowerName) || (isFirstParty && (tool.pricing?.costPerCall ?? 0) <= 0.001 && (tool.pricing?.costPerCall ?? 0) > 0)) {
        return "core";
    }
    if (isFirstParty || (tool.pricing?.model === "paid" && (tool.pricing?.costPerCall ?? 0) > 0)) {
        return "mesh";
    }
    return "framework";
}
/**
 * Render a high-contrast vector Solar Icon glyph for a tool group.
 */
export function renderCategoryGlyphSvg(group) {
    if (group === "core") {
        // Solar Icon: cpu-bolt
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
      <path d="M10 17H14C15.4142 17 16.1213 17 16.5607 16.5607C17 16.1213 17 15.4142 17 14V10C17 8.58579 17 7.87868 16.5607 7.43934C16.1213 7 15.4142 7 14 7H10C8.58579 7 7.87868 7 7.43934 7.43934C7 7.87868 7 8.58579 7 10V14C7 15.4142 7 16.1213 7.43934 16.5607C7.87868 17 8.58579 17 10 17Z" stroke-linecap="round"/>
      <path d="M12.4286 10L11 12H13L11.5714 14" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 20C8.22876 20 6.34315 20 5.17157 18.8284C4 17.6569 4 15.7712 4 12C4 8.22876 4 6.34315 5.17157 5.17157C6.34315 4 8.22876 4 12 4C15.7712 4 17.6569 4 18.8284 5.17157C20 6.34315 20 8.22876 20 12C20 15.7712 20 17.6569 18.8284 18.8284C17.6569 20 15.7712 20 12 20Z" stroke-linecap="round"/>
    </svg>`;
    }
    if (group === "mesh") {
        // Solar Icon: layers-minimalistic
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
      <path d="M16.2127 10.8085L19.0212 9.68508C21.0071 8.89073 22 8.49355 22 8C22 7.50645 21.0071 7.10927 19.0212 6.31492L16.2127 5.19153C14.2268 4.39718 13.2339 4 12 4C10.7661 4 9.77318 4.39718 7.7873 5.19153L4.97883 6.31492C2.99294 7.10927 2 7.50645 2 8C2 8.49355 2.99294 8.89073 4.97883 9.68508L7.7873 10.8085C9.77318 11.6028 10.7661 12 12 12C13.2339 12 14.2268 11.6028 16.2127 10.8085Z" stroke-linecap="round"/>
      <path d="M22 12C22 12 21.0071 12.8907 19.0212 13.6851L16.2127 14.8085C14.2268 15.6028 13.2339 16 12 16C10.7661 16 9.77318 15.6028 7.7873 14.8085L4.97883 13.6851C2.99294 12.8907 2 12 2 12" stroke-linecap="round"/>
      <path d="M22 16C22 16 21.0071 16.8907 19.0212 17.6851L16.2127 18.8085C14.2268 19.6028 13.2339 20 12 20C10.7661 20 9.77318 19.6028 7.7873 18.8085L4.97883 17.6851C2.99294 16.8907 2 16 2 16" stroke-linecap="round"/>
    </svg>`;
    }
    // Framework: Solar Icon code-circle
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke-linecap="round"/>
    <path d="M9 8.5L5.5 12L9 15.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M15 8.5L18.5 12L15 15.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13.5 7L10.5 17" stroke-linecap="round"/>
  </svg>`;
}
/**
 * Render an individual tool card using the 21st.dev #5115 Pricing Card glass-header architecture
 * while preserving all reliability, freshness, and capability hooks required by the test suite.
 */
export function renderToolCard(tool, baseUrl = "/", activeCapability, cardIndex = 0) {
    const health = deriveReliability(tool);
    const humanTitle = escapeHtml(formatHumanToolTitle(tool.name));
    const escapedName = escapeHtml(tool.name);
    const escapedNamespace = escapeHtml(tool.namespace);
    const escapedDescription = escapeHtml(tool.description || "No description provided.");
    const connectionType = escapeHtml(tool.connectionType || "http");
    const pricingModel = tool.pricing?.model || "free";
    const costPerCall = tool.pricing?.costPerCall ?? 0;
    const group = classifyToolGroup(tool);
    const flowArt = getFlowArtworkForTool(tool.name) || getFlowArtworkForTool(tool.namespace);
    const lastCheckedDate = tool.lastChecked ??
        tool.lastCheckedAt ??
        (health.lastCheckedIso ? new Date(health.lastCheckedIso) : null);
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
    }
    else if (health.reliability === "degraded") {
        cardStatusClass = "card-degraded";
        reliabilityBadgeHtml = `
      <span class="reliability-badge badge-degraded" title="Degraded: Check is older than 24 hours">
        <span class="status-dot dot-degraded"></span> Degraded
      </span>`;
    }
    else if (health.reliability === "failing") {
        cardStatusClass = "card-failing";
        reliabilityBadgeHtml = `
      <span class="reliability-badge badge-failing" title="Failing: Endpoint returned an error or timed out">
        <span class="status-dot dot-failing"></span> Failing
      </span>`;
    }
    else {
        cardStatusClass = "card-unchecked";
        reliabilityBadgeHtml = `
      <span class="reliability-badge badge-unchecked" title="Unchecked: Automated check pending">
        <span class="status-dot dot-unchecked"></span> Unchecked
      </span>`;
    }
    const isFirstParty = Boolean(tool.isFirstParty ??
        tool.developer?.isFirstParty ??
        tool.namespace?.startsWith("net.2xcel.aus"));
    return `
    <article class="tool-card ${cardStatusClass}" data-namespace="${escapedNamespace}" data-group="${group}" style="--card-index: ${cardIndex}; animation-delay: ${Math.min(cardIndex * 32, 640)}ms;">
      <!-- 21st.dev #5115 Glass Header -->
      <div class="tool-card-glass-header">
        <div class="tool-card-header">
          <div class="header-badge-box">
            ${flowArt
        ? `<div class="card-avatar-art"><img src="${flowArt}" alt="${humanTitle} avatar" loading="lazy" /></div>`
        : `<div class="card-avatar-glyph" aria-hidden="true">${renderCategoryGlyphSvg(group)}</div>`}
          </div>
          <div class="header-left">
            <h3 class="card-title">
              <a href="/tool/${escapedNamespace}" title="${humanTitle}">
                <span>${humanTitle}</span>
                <span class="sr-machine-slug sr-only">(${escapedName})</span>
              </a>
            </h3>
            <span class="card-ns" title="${escapedNamespace}">${escapedNamespace}</span>
          </div>
          <div class="header-right">
            ${isFirstParty
        ? `<span class="pill pill-first-party" title="Official first-party Agent Utility Service (AUS)">AUS OFFICIAL</span>`
        : ""}
            <span class="pill pill-connection">${connectionType.toUpperCase()}</span>
          </div>
        </div>

        <div class="tool-card-price-row">
          ${pricingModel === "free" || costPerCall === 0
        ? `<div class="price-display">
                  <span class="price-main">0.00 USDT</span>
                  <span class="pill pill-free">FREE</span>
                </div>`
        : `<div class="price-display">
                  <span class="price-main">${costPerCall} USDT</span>
                  <span class="price-unit">per call on Base</span>
                  <span class="pill pill-paid" title="Settled in USDT or USDC on Base Mainnet">$${costPerCall} USDC</span>
                </div>`}
        </div>
      </div>

      <!-- 21st.dev #5115 Card Body -->
      <div class="tool-card-body">
        <p class="card-description" title="${escapedDescription}">${escapedDescription}</p>

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

        ${health.reliability === "failing" && health.failureReason
        ? `
        <div class="card-failure-reason" title="${escapeHtml(health.failureReason)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>${escapeHtml(health.failureReason)}</span>
        </div>`
        : ""}

        ${tool.capabilities && tool.capabilities.length > 0
        ? `
        <div class="card-caps-row">
          ${tool.capabilities
            .slice(0, 3)
            .map((c) => {
            const isSelected = activeCapability?.toLowerCase().trim() === c.toLowerCase().trim();
            return `<a href="${baseUrl}?capability=${encodeURIComponent(c)}" class="card-cap-pill ${isSelected ? "card-cap-selected" : ""}" title="Filter by capability: ${escapeHtml(c)}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ${escapeHtml(c)}
              </a>`;
        })
            .join(" ")}
          ${tool.capabilities.length > 3
            ? `<span class="card-cap-more">+${tool.capabilities.length - 3}</span>`
            : ""}
        </div>`
        : `
        <div class="card-caps-row">
          <span class="card-cap-pill card-cap-default">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            HTTP 402
          </span>
          <span class="card-cap-pill card-cap-default">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Ajv Strict
          </span>
        </div>`}

        <div class="tool-card-footer">
          <span class="fee-note">${pricingModel === "free" || costPerCall === 0
        ? "Free open-source endpoint"
        : "Success-only HTTP 402 USDT settlement"}</span>
          <a href="/tool/${escapedNamespace}" class="card-action-link">Inspect Schema &rarr;</a>
        </div>
      </div>
    </article>
  `;
}
export function buildFilterUrl(baseUrl, params) {
    const query = new URLSearchParams();
    if (params.q && params.q.trim())
        query.set("q", params.q.trim());
    if (params.reliability && params.reliability !== "all")
        query.set("reliability", params.reliability);
    if (params.connectionType && params.connectionType !== "all")
        query.set("connectionType", params.connectionType);
    if (params.pricingModel && params.pricingModel !== "all")
        query.set("pricingModel", params.pricingModel);
    if (params.capability && params.capability !== "all")
        query.set("capability", params.capability);
    const qs = query.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
}
export function renderDirectoryPage(tools, totalCount, filters = {}) {
    const baseUrl = filters.baseUrl || "/";
    const searchQuery = escapeHtml(filters.search ?? "");
    const activeReliability = filters.reliability ?? "all";
    const activeCapability = filters.capability ?? "all";
    const availableCapabilities = filters.availableCapabilities ?? [];
    const activeConn = filters.connectionType ?? "all";
    const activePricing = filters.pricingModel ?? "all";
    const hasActiveFilters = Boolean((filters.search && filters.search.trim()) ||
        (activeCapability && activeCapability !== "all") ||
        (activeReliability && activeReliability !== "all") ||
        (activeConn && activeConn !== "all") ||
        (activePricing && activePricing !== "all"));
    // Order tools so Core AUS Utilities come first, then Extended AUS Mesh, then Open Frameworks
    const groupPriority = { core: 0, mesh: 1, framework: 2 };
    const sortedTools = [...tools].sort((a, b) => {
        const ga = groupPriority[classifyToolGroup(a)] ?? 2;
        const gb = groupPriority[classifyToolGroup(b)] ?? 2;
        if (ga !== gb)
            return ga - gb;
        return a.name.localeCompare(b.name);
    });
    const coreCount = sortedTools.filter((t) => classifyToolGroup(t) === "core").length;
    const meshCount = sortedTools.filter((t) => classifyToolGroup(t) === "mesh").length;
    const frameworkCount = sortedTools.filter((t) => classifyToolGroup(t) === "framework").length;
    const cardsHtml = sortedTools.length > 0
        ? sortedTools.map((t, idx) => renderToolCard(t, baseUrl, activeCapability, idx)).join("\n")
        : `<div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>No tools matched your criteria</h3>
        <p>${filters.capability && filters.capability !== "all"
            ? `No tools found with capability &ldquo;${escapeHtml(filters.capability)}&rdquo;${filters.search ? ` and query &ldquo;${searchQuery}&rdquo;` : ""}.`
            : filters.search
                ? `No tools found matching &ldquo;${searchQuery}&rdquo;. Try clearing filters or search with different keywords.`
                : "Try clearing filters or search with different keywords."}</p>
        <a href="${baseUrl}" class="btn" style="margin-top: 14px;">View All Tools</a>
        ${filters.capability && filters.capability !== "all"
            ? `<a href="${buildFilterUrl(baseUrl, { q: filters.search, reliability: activeReliability, capability: "all" })}" class="btn btn-secondary" style="margin-top: 14px; margin-left: 8px;">Clear Capability Filter</a>`
            : ""}
      </div>`;
    // Schema.org JSON-LD WebSite + DataCatalog + FAQPage for SEO and GEO
    const directoryJsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": "https://aipages.tech/#website",
                name: "AIPages - Autonomous Agent Tool Registry",
                url: "https://aipages.tech",
                potentialAction: {
                    "@type": "SearchAction",
                    target: {
                        "@type": "EntryPoint",
                        urlTemplate: "https://aipages.tech/tool?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                },
            },
            {
                "@type": "DataCatalog",
                "@id": "https://aipages.tech/#catalog",
                name: "AIPages Autonomous Agent Tool Registry",
                url: "https://aipages.tech",
                description: "The API marketplace and cross-protocol discovery registry built for autonomous AI agents and human developers with instant HTTP 402 USDT micro-payments on Base Mainnet.",
                numberOfItems: totalCount,
            },
            {
                "@type": "FAQPage",
                mainEntity: [
                    {
                        "@type": "Question",
                        name: "How do autonomous AI agents discover and pay for tools on AIPages?",
                        acceptedAnswer: {
                            "@type": "Answer",
                            text: "Agents query /search?q=<intent> or /api/tools for free to retrieve JSON Schemas, then invoke paid tools via POST /api/invoke/:namespace using a Base Mainnet USDT receipt in the x-payment-receipt header.",
                        },
                    },
                    {
                        "@type": "Question",
                        name: "What happens if a paid tool invocation fails or times out?",
                        acceptedAnswer: {
                            "@type": "Answer",
                            text: "AIPages enforces strict pay-on-success settlement. Payment receipts are only consumed on 2xx responses, and any verified gateway fault is refunded in USDT within 24 hours.",
                        },
                    },
                ],
            },
        ],
    };
    // Machine-native application/agent+json manifest embedded in head
    const agentManifest = {
        protocol: "aipages-agent-manifest-v1",
        registry: "https://aipages.tech",
        settlement: {
            network: "Base Mainnet (EIP-155: 8453)",
            currency: "USDT",
            protocol: "HTTP 402 Payment Required",
            header: "x-payment-receipt",
            payOnSuccessOnly: true,
        },
        endpoints: {
            semanticSearch: "/search?q={intent}&limit=10",
            toolsCatalog: "/api/tools?limit=100",
            syndicationFeed: "/api/feed.json",
            llmsTxt: "/llms.txt",
            llmsFullTxt: "/llms-full.txt",
            mcpManifest: "/mcp.json",
            mcpActions: "/mcp-actions.json",
            agentPermissions: "/agent-permissions.json",
            openApiSpec: "/api/openapi.json",
            invokeGateway: "/api/invoke/{namespace}",
        },
        toolCount: totalCount,
    };
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIPages Tool Directory - Autonomous Agent Tool Registry</title>
  <meta name="description" content="The API marketplace and cross-protocol discovery registry built for AI agents and developers. Search verified JSON Schemas for free and settle micro-payments in USDT on Base Mainnet.">
  <link rel="canonical" href="https://aipages.tech/tool">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <link rel="alternate" type="text/markdown" title="LLM Discovery Summary" href="/llms.txt">
  <link rel="alternate" type="text/markdown" title="Full Agent Schema Reference" href="/llms-full.txt">
  <script type="application/ld+json">${JSON.stringify(directoryJsonLd).replace(/</g, "\\u003c")}</script>
  <script id="aipages-agent-manifest" type="application/agent+json">${JSON.stringify(agentManifest).replace(/</g, "\\u003c")}</script>
  <style>
    ${SHARED_DESIGN_SYSTEM_CSS}

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* 21st.dev #8948 Spacious Centered SaaS Hero */
    /* 21st.dev #8948 SaaS Hero Redesigned with Cyber-Terminal HUD */
    .hero-section {
      position: relative;
      padding: 64px 0 72px;
      overflow: hidden;
      border-bottom: 1px solid var(--border-subtle);
    }

    .hero-grid-split {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 36px;
      align-items: center;
    }

    .hero-protocol-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      color: #F8FAFC;
      margin-bottom: 18px;
    }

    .hero-protocol-badge .status-ping {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--healthy);
      box-shadow: 0 0 10px var(--healthy);
    }

    .hero-inner {
      position: relative;
      z-index: 1;
      text-align: left;
    }

    .hero-headline {
      font-size: clamp(2.3rem, 4.2vw, 3.8rem);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.035em;
      color: #F8FAFC;
      margin-bottom: 18px;
      text-align: left;
    }

    .hero-headline span {
      background: linear-gradient(95deg, #F59E0B 0%, #FFD000 55%, #FDE68A 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-subtitle {
      font-size: 1.05rem;
      color: var(--text-muted);
      margin-bottom: 26px;
      line-height: 1.65;
      text-align: left;
    }

    .hero-search-form {
      max-width: 100%;
      margin: 0 0 22px 0;
      background: var(--surface-base);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      padding: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
      transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }

    .hero-search-form:focus-within {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 2px rgba(0, 240, 255, 0.25), 0 12px 30px rgba(0, 0, 0, 0.6);
    }

    .hero-search-icon {
      margin-left: 12px;
      color: var(--accent-cyan);
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      padding: 10px 8px;
      font-size: 0.94rem;
      color: #F8FAFC;
      outline: none;
      font-family: inherit;
    }

    .search-input::placeholder {
      color: var(--text-dim);
    }

    .btn {
      background: var(--primary);
      color: #040507;
      border: 1px solid var(--primary-bright);
      border-radius: var(--radius-sm);
      padding: 10px 20px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      transition: all 0.18s ease;
      white-space: nowrap;
    }

    .btn:hover {
      background: var(--primary-bright);
      color: #040507;
      text-decoration: none;
    }

    .btn-secondary {
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      color: #F8FAFC;
    }

    .btn-secondary:hover {
      border-color: var(--accent-cyan);
      color: #FFFFFF;
      background: rgba(0, 240, 255, 0.08);
    }

    .hero-cta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }

    /* Terminal HUD Panel (Right Column) */
    .hero-terminal-card {
      background: var(--surface-terminal);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
    }

    .hero-terminal-header {
      background: var(--surface-base);
      border-bottom: 1px solid var(--border-subtle);
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .terminal-dots {
      display: flex;
      gap: 6px;
    }

    .terminal-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #2D374D;
    }

    .terminal-dot.active {
      background: var(--accent-cyan);
      box-shadow: 0 0 8px var(--accent-cyan);
    }

    .terminal-header-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.74rem;
      color: var(--text-dim);
      letter-spacing: 0.04em;
    }

    .hero-terminal-body {
      padding: 18px 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      line-height: 1.65;
      color: #E2E8F0;
      overflow-x: auto;
    }

    .hero-terminal-body .cmd-prompt {
      color: var(--accent-cyan);
      user-select: none;
      margin-right: 6px;
    }

    .hero-terminal-body .cmd-highlight {
      color: #FDE68A;
    }

    .hero-terminal-body .cmd-success {
      color: var(--healthy);
      font-weight: 600;
    }

    .hero-terminal-body .cmd-comment {
      color: var(--text-dim);
    }

    @media (max-width: 990px) {
      .hero-grid-split {
        grid-template-columns: 1fr;
      }
      .hero-headline,
      .hero-subtitle {
        text-align: center;
      }
      .hero-cta-row {
        justify-content: center;
      }
      .hero-protocol-badge {
        display: flex;
        margin: 0 auto 18px auto;
        width: fit-content;
      }
    }

    /* 21st.dev #29870 Stats Section by shadcnui-blocks */
    .stats-grid,
    .stats-block-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-top: 52px;
      text-align: left;
    }

    .stats-block-card {
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 28px;
      position: relative;
      overflow: hidden;
      transform-style: preserve-3d;
      perspective: 1000px;
      will-change: transform, box-shadow;
      transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1), border-color 0.25s ease, box-shadow 0.25s ease;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    }

    .stats-block-card::before {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      background: radial-gradient(350px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(0, 240, 255, 0.28), rgba(245, 158, 11, 0.12), transparent 60%);
      opacity: 0;
      transition: opacity 0.35s ease;
      pointer-events: none;
      z-index: 1;
    }

    .stats-block-card:hover::before {
      opacity: 1;
    }

    .stats-block-card > * {
      position: relative;
      z-index: 2;
      transform: translateZ(10px);
    }

    .stats-block-card:hover {
      border-color: rgba(0, 240, 255, 0.45);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7), 0 0 24px rgba(0, 240, 255, 0.12);
    }

    .stats-block-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: var(--primary-bright);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease;
    }

    .stats-block-card:hover .stats-block-icon {
      transform: translateY(-3px) scale(1.06) translateZ(18px);
      border-color: #FFD000;
      background: rgba(245, 158, 11, 0.18);
      box-shadow: 0 0 18px rgba(245, 158, 11, 0.35);
    }

    .stats-block-number {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2.15rem;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.03em;
      display: block;
    }

    .stats-block-label {
      margin-top: 8px;
      font-size: 0.94rem;
      color: var(--text-muted);
      line-height: 1.55;
    }

    /* 21st.dev #10025 Elegant Split-Panel Carousel by dev.yadhakim */
    .flow-carousel-section {
      padding: 64px 0;
    }

    .section-header-block {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 28px;
    }

    .section-title {
      font-size: clamp(1.75rem, 2.8vw, 2.3rem);
      font-weight: 800;
      color: #F8FAFC;
      line-height: 1.15;
    }

    .section-subtitle {
      font-size: 0.98rem;
      color: var(--text-muted);
      max-width: 620px;
      margin-top: 6px;
    }

    .flow-carousel-shell {
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
    }

    .flow-carousel-grid {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      min-height: 460px;
    }

    .flow-carousel-narrative {
      padding: 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 1px solid var(--border-subtle);
    }

    .flow-slide-counter {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: var(--accent-cyan);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 14px;
      display: inline-block;
    }

    .flow-slide-title {
      font-size: clamp(1.7rem, 2.6vw, 2.25rem);
      font-weight: 800;
      color: #F8FAFC;
      line-height: 1.18;
      margin-bottom: 10px;
    }

    .flow-slide-subtitle {
      font-size: 1rem;
      font-weight: 600;
      color: var(--primary-bright);
      margin-bottom: 16px;
    }

    .flow-slide-desc {
      font-size: 0.95rem;
      color: var(--text-muted);
      line-height: 1.7;
      margin-bottom: 24px;
    }

    .flow-slide-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .flow-nav-circle {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-strong);
      background: var(--surface-raised);
      color: #F8FAFC;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.18s ease;
    }

    .flow-nav-circle:hover {
      border-color: var(--accent-cyan);
      background: rgba(0, 240, 255, 0.1);
      color: #FFFFFF;
    }

    .flow-carousel-art {
      background: var(--surface-terminal);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
    }

    .flow-carousel-art img {
      width: 100%;
      max-height: 420px;
      object-fit: contain;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    .flow-progress-bar {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-top: 1px solid var(--border-subtle);
      background: var(--surface-terminal);
    }

    .flow-progress-step {
      background: transparent;
      border: none;
      border-right: 1px solid var(--border-subtle);
      padding: 14px 12px;
      text-align: left;
      color: var(--text-dim);
      transition: all 0.18s ease;
      position: relative;
    }

    .flow-progress-step:last-child {
      border-right: none;
    }

    .flow-progress-step::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: transparent;
      transition: background 0.2s ease;
    }

    .flow-progress-step.active {
      background: rgba(0, 240, 255, 0.05);
      color: #F8FAFC;
    }

    .flow-progress-step.active::before {
      background: var(--accent-cyan);
    }

    .flow-step-num {
      display: block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      color: var(--accent-cyan);
      margin-bottom: 2px;
    }

    .flow-step-label {
      display: block;
      font-size: 0.78rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Directory Controls & Category Tabs */
    .directory-section {
      padding: 44px 0 72px;
    }

    .category-tabs,
    .category-tabs-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }

    .category-tab-btn {
      padding: 9px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-strong);
      background: var(--surface-base);
      color: var(--text-muted);
      font-size: 0.88rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.18s ease;
    }

    .category-tab-btn:hover {
      border-color: var(--border-focus);
      color: #F8FAFC;
    }

    .category-tab-btn.active {
      background: var(--primary);
      border-color: var(--primary-bright);
      color: #040507;
      font-weight: 700;
    }

    .category-tab-count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.74rem;
      padding: 2px 6px;
      border-radius: var(--radius-xs);
      background: rgba(0, 0, 0, 0.25);
    }

    .directory-controls {
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      margin-bottom: 24px;
    }

    .filter-pills-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      font-size: 0.84rem;
    }

    .filter-label {
      color: var(--text-dim);
      font-weight: 600;
      margin-right: 6px;
    }

    .filter-chip {
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      color: var(--text-muted);
      padding: 4px 11px;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      text-decoration: none;
      transition: all 0.18s ease;
    }

    .filter-chip:hover {
      border-color: var(--primary);
      color: #F8FAFC;
      text-decoration: none;
    }

    .filter-chip.active {
      background: rgba(245, 158, 11, 0.15);
      border-color: var(--primary);
      color: var(--primary-bright);
      font-weight: 600;
    }

    .capability-drawer {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
    }

    .capability-drawer summary {
      cursor: pointer;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--primary-bright);
      user-select: none;
      list-style: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .capability-pills-row {
      margin-top: 12px;
    }

    /* 21st.dev #5115 Glass-Header Tool Cards Grid (Terminal High-Density) */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
      margin-bottom: 48px;
      align-items: stretch;
    }

    @keyframes cardEntrance {
      0% {
        opacity: 0;
        transform: translateY(16px) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes radarPing {
      0% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      70% {
        box-shadow: 0 0 0 7px rgba(16, 185, 129, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }

    .tool-card {
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      transform-style: preserve-3d;
      perspective: 1000px;
      will-change: transform, box-shadow;
      transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1), border-color 0.25s ease, box-shadow 0.25s ease;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
      animation: cardEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
      min-height: 388px;
    }

    .tool-card::before {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      background: radial-gradient(400px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(0, 240, 255, 0.28), rgba(245, 158, 11, 0.12), transparent 60%);
      opacity: 0;
      transition: opacity 0.35s ease;
      pointer-events: none;
      z-index: 1;
    }

    .tool-card:hover::before {
      opacity: 1;
    }

    .tool-card::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.6), rgba(245, 158, 11, 0.6), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 3;
    }

    .tool-card:hover::after {
      opacity: 1;
    }

    .tool-card > * {
      position: relative;
      z-index: 2;
    }

    .tool-card:hover {
      border-color: rgba(0, 240, 255, 0.45);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0, 240, 255, 0.14);
    }

    .tool-card-glass-header {
      background: var(--surface-raised);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px 14px 10px;
      position: relative;
      overflow: hidden;
      transform: translateZ(12px);
      transition: border-color 0.25s ease, background-color 0.25s ease;
      min-height: 104px;
      box-sizing: border-box;
    }

    .tool-card:hover .tool-card-glass-header {
      border-color: rgba(0, 240, 255, 0.35);
      background: #141926;
    }

    .tool-card-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }

    .header-badge-box {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border-subtle);
      background: var(--surface-terminal);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-avatar-art {
      width: 100%;
      height: 100%;
    }

    .card-avatar-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .tool-card:hover .card-avatar-art img {
      transform: scale(1.1);
    }

    .card-avatar-glyph {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-cyan);
      background: rgba(0, 240, 255, 0.06);
      transition: transform 0.3s ease, color 0.3s ease, background 0.3s ease;
    }

    .tool-card:hover .card-avatar-glyph {
      color: #FFFFFF;
      background: rgba(0, 240, 255, 0.18);
      transform: scale(1.08);
    }

    .header-left {
      min-width: 0;
      flex: 1;
    }

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 5px;
      flex-shrink: 0;
    }

    .card-title {
      font-size: 1.12rem;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.7rem;
      max-height: 2.7rem;
      margin-bottom: 2px;
    }

    .card-title a {
      color: #FFFFFF;
      text-decoration: none;
    }

    .card-title a:hover {
      color: var(--accent-cyan);
    }

    .sr-machine-slug {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-dim);
    }

    .card-ns {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.73rem;
      color: var(--primary);
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .tool-card-price-row {
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 32px;
      box-sizing: border-box;
    }

    .price-display {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .price-main {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.35rem;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }

    .price-unit {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .pill {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .pill-connection {
      background: rgba(255, 255, 255, 0.06);
      color: #D4D4D8;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .pill-free {
      background: var(--healthy-bg);
      color: var(--healthy);
      border: 1px solid var(--healthy-border);
    }

    .pill-paid {
      background: rgba(245, 158, 11, 0.14);
      color: var(--primary-bright);
      border: 1px solid rgba(245, 158, 11, 0.35);
    }

    .pill-first-party {
      background: rgba(245, 158, 11, 0.18);
      color: var(--primary-bright);
      border: 1px solid rgba(245, 158, 11, 0.45);
    }

    .tool-card-body {
      padding: 14px 10px 6px;
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }

    .card-description {
      font-size: 0.88rem;
      color: #CBD5E1;
      line-height: 1.55;
      margin-bottom: 14px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 4.1rem;
      height: 4.1rem;
    }

    .card-reliability-strip {
      background: var(--surface-terminal);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 0.8rem;
      height: 38px;
      min-height: 38px;
      box-sizing: border-box;
    }

    .reliability-col, .freshness-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .freshness-col {
      align-items: flex-end;
    }

    .strip-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      color: var(--text-dim);
      font-weight: 700;
      letter-spacing: 0.05em;
      font-family: 'JetBrains Mono', monospace;
    }

    .reliability-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .badge-high { color: var(--healthy); }
    .dot-high { background: var(--healthy); box-shadow: 0 0 6px var(--healthy); animation: radarPing 2.2s infinite ease-out; }
    .badge-degraded { color: var(--degraded); }
    .dot-degraded { background: var(--degraded); box-shadow: 0 0 6px var(--degraded); }
    .badge-failing { color: var(--failing); }
    .dot-failing { background: var(--failing); box-shadow: 0 0 6px var(--failing); }
    .badge-unchecked { color: var(--unchecked); }
    .dot-unchecked { background: var(--unchecked); }

    .freshness-time {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: var(--text-muted);
      font-weight: 500;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.76rem;
    }

    .card-failure-reason {
      background: var(--failing-bg);
      border: 1px solid var(--failing-border);
      color: #FCA5A5;
      font-size: 0.76rem;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .card-caps-row {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      min-height: 28px;
      margin-bottom: 12px;
      overflow: hidden;
      white-space: nowrap;
    }

    .card-cap-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.74rem;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      color: var(--text-muted);
      padding: 4px 9px;
      border-radius: var(--radius-xs);
      text-decoration: none;
      transition: all 0.15s ease;
      font-family: 'JetBrains Mono', monospace;
    }

    .card-cap-pill svg {
      color: var(--accent-cyan);
    }

    .card-cap-pill:hover,
    .card-cap-selected {
      border-color: var(--accent-cyan);
      color: #FFFFFF;
      background: rgba(0, 240, 255, 0.1);
      text-decoration: none;
    }

    .card-cap-default {
      opacity: 0.75;
      border-style: dashed;
    }

    .card-cap-more {
      font-size: 0.72rem;
      color: var(--text-dim);
      align-self: center;
      padding: 2px 6px;
      font-family: 'JetBrains Mono', monospace;
    }

    .tool-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.82rem;
      height: 42px;
      min-height: 42px;
      box-sizing: border-box;
    }

    .fee-note {
      color: var(--text-dim);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      max-width: 190px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-action-link {
      font-weight: 700;
      color: var(--primary-bright);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-xs);
      background: var(--surface-raised);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      white-space: nowrap;
    }

    .card-action-link:hover {
      border-color: var(--accent-cyan);
      color: #020305;
      background: var(--accent-cyan);
      transform: translateX(3px);
      box-shadow: 0 0 16px rgba(0, 240, 255, 0.5);
      text-decoration: none;
    }

    .active-filter-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid var(--primary);
      color: var(--primary-bright);
      padding: 2px 9px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .clear-tag-btn {
      color: var(--primary-bright);
      font-weight: 700;
      margin-left: 4px;
    }

    .btn-clear-filter {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #D4D4D8;
      font-size: 0.8rem;
      padding: 6px 12px;
      border-radius: 8px;
    }

    /* 21st.dev #9309 Split Feature Showcase by ruixen.ui */
    .showcase-section {
      padding: 80px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
    }

    .showcase-grid {
      display: grid;
      grid-template-columns: 5fr 7fr;
      gap: 40px;
      align-items: start;
    }

    .showcase-step-item {
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 16px;
      margin-bottom: 14px;
      overflow: hidden;
    }

    .showcase-step-item[open] {
      border-color: rgba(245, 158, 11, 0.45);
    }

    .showcase-step-item summary {
      padding: 20px 24px;
      font-weight: 700;
      font-size: 1.05rem;
      color: #FFFFFF;
      cursor: pointer;
      list-style: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .showcase-step-body {
      padding: 0 24px 20px;
      color: var(--text-muted);
      font-size: 0.94rem;
      line-height: 1.65;
    }

    .showcase-panel {
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    }

    .showcase-tabs {
      display: flex;
      background: #07080D;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 8px;
      gap: 8px;
    }

    .showcase-tab-btn {
      flex: 1;
      padding: 10px 16px;
      border-radius: 10px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.86rem;
      font-weight: 600;
    }

    .showcase-tab-btn.active {
      background: rgba(245, 158, 11, 0.16);
      color: var(--primary-bright);
      border: 1px solid rgba(245, 158, 11, 0.35);
    }

    .showcase-code-box {
      padding: 24px;
      background: #050609;
      overflow-x: auto;
      font-size: 0.84rem;
      line-height: 1.6;
      color: #E4E4E7;
    }

    /* 21st.dev #31986 FAQ Accordion by hexui-sh */
    .faq-section {
      padding: 80px 0 96px;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
    }

    .faq-container {
      max-width: 820px;
      margin: 0 auto;
    }

    .faq-item {
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 16px;
      margin-bottom: 14px;
      overflow: hidden;
    }

    .faq-item[open] {
      border-color: rgba(245, 158, 11, 0.4);
    }

    .faq-item summary {
      padding: 20px 24px;
      font-weight: 700;
      font-size: 1.04rem;
      color: #FFFFFF;
      cursor: pointer;
      list-style: none;
    }

    .faq-item p {
      padding: 0 24px 20px;
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.7;
    }

    .policy-callout-card {
      margin-top: 28px;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(16, 19, 28, 0.9) 100%);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 18px;
      padding: 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }

    /* Empty state */
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 56px 24px;
      background: #0A0C12;
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      color: var(--text-muted);
    }

    /* MCP Modal */
    .mcp-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .mcp-modal-dialog {
      background: #0A0C12;
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 20px;
      width: 100%;
      max-width: 680px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 22px 26px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .modal-close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.5rem;
      line-height: 1;
    }

    .modal-tabs {
      display: flex;
      background: #07080D;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .modal-tab-btn {
      flex: 1;
      padding: 13px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      font-size: 0.88rem;
      font-weight: 600;
    }

    .modal-tab-btn.active {
      color: var(--primary-bright);
      border-bottom-color: var(--primary-bright);
      background: rgba(245, 158, 11, 0.06);
    }

    .modal-body {
      padding: 24px 26px;
    }

    .code-container {
      position: relative;
      background: #050609;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      overflow: hidden;
      margin-top: 12px;
    }

    .code-container pre {
      margin: 0;
      padding: 18px;
      overflow-x: auto;
      font-size: 0.82rem;
      color: #E4E4E7;
    }

    .modal-copy-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 0.76rem;
      padding: 6px 12px;
    }

    @media (max-width: 960px) {
      .stats-block-grid,
      .flow-carousel-grid,
      .showcase-grid {
        grid-template-columns: 1fr;
      }
      .flow-progress-bar {
        grid-template-columns: repeat(4, 1fr);
      }
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  ${renderSharedNavbar("directory", true)}

  <main>
    <!-- 21st.dev #8948 Dual-Column Cyber-Terminal Hero + #29870 Stats Block -->
    <section class="hero-section">
      <div class="container hero-inner">
        <div class="hero-grid-split">
          <!-- Left Column: Core Value, Command Bar & CTA -->
          <div>
            <div class="hero-protocol-badge">
              <span class="status-ping"></span>
              <span>16 AUS Engines Online | Base Mainnet (8453) | x402 Active</span>
            </div>

            <h1 class="hero-headline">
              The API Marketplace <span>Built for AI Agents</span>
            </h1>
            <p class="hero-subtitle">
              AI agents and developers use AIPages to find verified APIs, inspect JSON schemas, and run tools with instant USDT micro-payments on Base Mainnet.
            </p>

            <form method="GET" action="${baseUrl}" class="hero-search-form" toolname="search_agent_tools" tooldescription="Search and filter verified AI agent tools and MCP servers in the AIPages directory by keyword, capability, or reliability." data-mcp-action="search-tools">
              ${activeCapability && activeCapability !== "all" ? `<input type="hidden" name="capability" value="${escapeHtml(activeCapability)}" toolparamdescription="Functional capability tag filter" />` : ""}
              ${activeReliability && activeReliability !== "all" ? `<input type="hidden" name="reliability" value="${escapeHtml(activeReliability)}" toolparamdescription="Endpoint reliability filter (all, high, degraded, failing, unchecked)" />` : ""}
              <div class="search-input-wrapper" style="position: relative; flex: 1; display: flex; align-items: center;">
                <!-- Solar Icons: minimalistic-magnifier (linear) -->
                <svg class="hero-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="11.5" cy="11.5" r="9.5" stroke-linecap="round"/>
                  <path d="M20 20L22 22" stroke-linecap="round"/>
                </svg>
                <label for="directory-search-input" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;">Search tools by name, description, namespace, or capability</label>
                <input
                  type="text"
                  id="directory-search-input"
                  name="q"
                  class="search-input"
                  aria-label="Search tools by name, description, namespace, or capability"
                  toolparamdescription="Natural language search query, tool name, namespace, or capability keyword"
                  placeholder="Search 50 agent tools by name, capability, or JSON schema..."
                  value="${searchQuery}"
                />
              </div>
              <button type="submit" class="btn">Search Tools</button>
            </form>

            <div class="hero-cta-row">
              <button type="button" class="btn" onclick="openMcpModal()">
                Connect to Claude Desktop or Cursor
              </button>
              <a href="#directory-section" class="btn btn-secondary">Browse All ${totalCount} Tools</a>
              <a href="/capabilities" class="btn btn-secondary">Capabilities Index</a>
            </div>
          </div>

          <!-- Right Column: Interactive Cyber-Terminal Mockup -->
          <div class="hero-terminal-card" aria-label="Live Invocation Stream Mockup">
            <div class="hero-terminal-header">
              <div class="terminal-dots">
                <span class="terminal-dot active"></span>
                <span class="terminal-dot"></span>
                <span class="terminal-dot"></span>
              </div>
              <span class="terminal-header-title">agent@aipages:~ (x402-gateway)</span>
            </div>
            <div class="hero-terminal-body">
              <div style="margin-bottom: 8px;">
                <span class="cmd-comment"># Discover &amp; execute 3072-dim vector agent tools</span>
              </div>
              <div style="margin-bottom: 6px;">
                <span class="cmd-prompt">&gt;</span><span class="cmd-highlight">curl -s "https://aipages.tech/search?q=sanitize+user+json&amp;limit=1"</span>
              </div>
              <div style="margin-bottom: 12px; color: var(--text-dim);">
                [{"name":"schema_sanitizer","score":0.941,"pricing":"0.001 USDT"}]
              </div>
              <div style="margin-bottom: 6px;">
                <span class="cmd-prompt">&gt;</span><span class="cmd-highlight">curl -X POST "https://aipages.tech/tool/schema-sanitizer" \\</span><br/>
                <span style="padding-left: 20px;">-H "Content-Type: application/json" \\</span><br/>
                <span style="padding-left: 20px;">-H "x-payment-receipt: 0x8f3c...8453" \\</span><br/>
                <span style="padding-left: 20px;">-d '{"data":{"raw":"&lt;script&gt;xss&lt;/script&gt;Clean"}}'</span>
              </div>
              <div>
                <span class="cmd-success">HTTP/1.1 200 OK (22ms)</span><br/>
                <span style="color: #67E8F9;">{"status":"sanitized","cleanText":"Clean","feeConsumed":"0.001 USDT"}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 21st.dev #29870 Stats Section by shadcnui-blocks with Solar Icons -->
        <div class="stats-block-grid" style="margin-top: 48px;">
          <div class="stats-block-card">
            <div class="stats-block-icon" aria-hidden="true">
              <!-- Solar Icons: minimalistic-magnifier (linear) -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="11.5" cy="11.5" r="9.5" stroke-linecap="round"/>
                <path d="M20 20L22 22" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="stats-block-number">0.00 USDT</span>
            <p class="stats-block-label">Free semantic vector discovery, schema inspection, and developer tool listing forever.</p>
          </div>
          <div class="stats-block-card">
            <div class="stats-block-icon" aria-hidden="true">
              <!-- Solar Icons: shield-check (linear) -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M21 11.9914C21 11.4234 21 10.8996 21 10.4167C21 7.21907 21 5.62028 20.6225 5.08241C20.245 4.54454 18.7417 4.02996 15.7351 3.00079L15.1623 2.80472C13.595 2.26824 12.8114 2 12 2C11.1886 2 10.405 2.26824 8.83772 2.80472L8.26491 3.00079C5.25832 4.02996 3.75503 4.54454 3.37752 5.08241C3 5.62028 3 7.21907 3 10.4167C3 10.8996 3 11.4234 3 11.9914C3 17.6294 7.23896 20.3655 9.89856 21.5273C10.62 21.8424 10.9807 22 12 22C13.0193 22 13.38 21.8424 14.1014 21.5273C16.761 20.3655 21 17.6294 21 11.9914Z" stroke-linecap="round"/>
                <path d="M9.5 12.4L10.9286 14L14.5 10" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="stats-block-number">100% Verified</span>
            <p class="stats-block-label">Every endpoint includes strict Ajv JSON Schema validation, OpenAPI 3.1 specs, and JSON-LD metadata.</p>
          </div>
          <div class="stats-block-card">
            <div class="stats-block-icon" aria-hidden="true">
              <!-- Solar Icons: check-circle (linear) -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <circle cx="12" cy="12" r="10" stroke-linecap="round"/>
                <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="stats-block-number">2xx Only</span>
            <p class="stats-block-label">Atomic HTTP 402 USDT settlement on Base Mainnet collects payment strictly on successful execution.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 21st.dev #10025 Elegant Split-Panel Google Flow Carousel -->
    <section id="flow-showcase" class="flow-carousel-section container">
      <div class="section-header-block">
        <div>
          <h2 class="section-title">Featured Agent Utility Fleet</h2>
          <p class="section-subtitle">Explore our canonical Agent Utility Services artwork and architecture generated with Google Flow.</p>
        </div>
      </div>

      <div class="flow-carousel-shell">
        <div class="flow-carousel-grid">
          <div class="flow-carousel-narrative">
            <div>
              <span id="flow-counter" class="flow-slide-counter">Slide 01 of 07</span>
              <h3 id="flow-title" class="flow-slide-title">The API Marketplace Built for AI Agents</h3>
              <p id="flow-subtitle" class="flow-slide-subtitle">Autonomous Discovery and USDT Micro-Payments</p>
              <p id="flow-desc" class="flow-slide-desc">
                AIPages connects autonomous AI agents and human developers to deterministic APIs with 3072-dimension Gemini semantic search and HTTP 402 USDT settlement on Base Mainnet.
              </p>
            </div>
            <div class="flow-slide-actions">
              <a id="flow-cta" href="/tool" class="btn">Explore Tool Directory</a>
              <button type="button" class="flow-nav-circle" onclick="stepFlowSlide(-1)" aria-label="Previous slide">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button type="button" class="flow-nav-circle" onclick="stepFlowSlide(1)" aria-label="Next slide">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>

          <div class="flow-carousel-art">
            <img id="flow-image" src="/assets/flow/flow-01-hero-marketplace.jpg" alt="The API Marketplace Built for AI Agents" />
          </div>
        </div>

        <div class="flow-progress-bar" role="tablist" aria-label="Google Flow Showcase Slides">
          <button type="button" class="flow-progress-step active" data-slide="0" onclick="selectFlowSlide(0)">
            <span class="flow-step-num">01</span>
            <span class="flow-step-label">API Marketplace</span>
          </button>
          <button type="button" class="flow-progress-step" data-slide="1" onclick="selectFlowSlide(1)">
            <span class="flow-step-num">02</span>
            <span class="flow-step-label">8 Core Utilities</span>
          </button>
          <button type="button" class="flow-progress-step" data-slide="2" onclick="selectFlowSlide(2)">
            <span class="flow-step-num">03</span>
            <span class="flow-step-label">Schema Sanitizer</span>
          </button>
          <button type="button" class="flow-progress-step" data-slide="3" onclick="selectFlowSlide(3)">
            <span class="flow-step-num">04</span>
            <span class="flow-step-label">Financial Audit</span>
          </button>
          <button type="button" class="flow-progress-step" data-slide="4" onclick="selectFlowSlide(4)">
            <span class="flow-step-num">05</span>
            <span class="flow-step-label">Verification Oracle</span>
          </button>
          <button type="button" class="flow-progress-step" data-slide="5" onclick="selectFlowSlide(5)">
            <span class="flow-step-num">06</span>
            <span class="flow-step-label">Geospatial Verifier</span>
          </button>
          <button type="button" class="flow-progress-step" data-slide="6" onclick="selectFlowSlide(6)">
            <span class="flow-step-num">07</span>
            <span class="flow-step-label">Scale Workflows</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Directory Section (#5115 Spacious Tool Cards) -->
    <section id="directory-section" class="directory-section container">
      <div class="section-header-block">
        <div>
          <h2 class="section-title">AI Agent Tool Directory</h2>
          <p class="section-subtitle">
            Browse all ${totalCount} registered tools across our Core AUS Utilities, Extended AUS Mesh and Motion fleet, and Open Agent Frameworks.
          </p>
        </div>
      </div>

      <!-- Clean 4-Tab Category Switcher -->
      <div class="category-tabs-bar" role="tablist" aria-label="Tool Category Tabs">
        <button type="button" class="category-tab-btn active" data-group-filter="all" onclick="filterToolCardsByGroup('all')">
          All Tools <span class="category-tab-count">${sortedTools.length}</span>
        </button>
        <button type="button" class="category-tab-btn" data-group-filter="core" onclick="filterToolCardsByGroup('core')">
          Core AUS Utilities (0.001 USDT) <span class="category-tab-count">${coreCount}</span>
        </button>
        <button type="button" class="category-tab-btn" data-group-filter="mesh" onclick="filterToolCardsByGroup('mesh')">
          AUS Mesh, Ledger &amp; Motion (0.005 USDT) <span class="category-tab-count">${meshCount}</span>
        </button>
        <button type="button" class="category-tab-btn" data-group-filter="framework" onclick="filterToolCardsByGroup('framework')">
          Open Agent Frameworks (Free) <span class="category-tab-count">${frameworkCount}</span>
        </button>
      </div>

      <!-- Reliability & Capability Filter Bar -->
      <div class="directory-controls">
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

        ${availableCapabilities && availableCapabilities.length > 0
        ? `
        <details class="capability-drawer"${activeCapability && activeCapability !== "all" ? " open" : ""}>
          <summary>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filter by Specific Capability Tag (${availableCapabilities.length} available)
          </summary>
          <div class="filter-pills-row capability-pills-row">
            <span class="filter-label">Capability:</span>
            <a href="${buildFilterUrl(baseUrl, { q: filters.search, reliability: activeReliability, capability: "all" })}"
               class="filter-chip ${!activeCapability || activeCapability === "all" ? "active" : ""}"
               data-capability="all">All</a>
            ${(() => {
            const MAX_DISPLAY_CAPS = 24;
            const displayCaps = availableCapabilities.slice(0, MAX_DISPLAY_CAPS);
            if (activeCapability &&
                activeCapability !== "all" &&
                !displayCaps.some((c) => c.toLowerCase().trim() === activeCapability.toLowerCase().trim())) {
                const matched = availableCapabilities.find((c) => c.toLowerCase().trim() === activeCapability.toLowerCase().trim());
                if (matched)
                    displayCaps.push(matched);
            }
            const pillsHtml = displayCaps
                .map((cap) => {
                const isActive = activeCapability?.toLowerCase().trim() === cap.toLowerCase().trim();
                const targetUrl = buildFilterUrl(baseUrl, {
                    q: filters.search,
                    reliability: activeReliability,
                    capability: isActive ? "all" : cap,
                });
                return `<a href="${targetUrl}" class="filter-chip cap-filter-chip ${isActive ? "active" : ""}" data-capability="${escapeHtml(cap)}" title="${isActive ? "Click to clear filter" : `Filter by ${escapeHtml(cap)}`}">${isActive ? `✕ ${escapeHtml(cap)}` : escapeHtml(cap)}</a>`;
            })
                .join("\n            ");
            const moreLink = availableCapabilities.length > MAX_DISPLAY_CAPS
                ? `\n            <a href="/capabilities" class="filter-chip" title="Browse all ${availableCapabilities.length} capabilities">+${availableCapabilities.length - MAX_DISPLAY_CAPS} more &rarr;</a>`
                : "";
            return pillsHtml + moreLink;
        })()}
          </div>
        </details>
        `
        : ""}
      </div>

      <!-- Results Count & Active Filter Summary -->
      <div class="results-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
        <div style="font-size: 0.92rem; color: var(--text-muted); display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">
          <span>Showing <strong>${tools.length}</strong> of <strong>${totalCount}</strong> registered tools</span>
          ${searchQuery ? ` matching "<em>${searchQuery}</em>"` : ""}
          ${activeCapability && activeCapability !== "all"
        ? ` with capability <span class="active-filter-tag">${escapeHtml(activeCapability)} <a href="${buildFilterUrl(baseUrl, { q: filters.search, reliability: activeReliability, connectionType: activeConn, pricingModel: activePricing, capability: "all" })}" class="clear-tag-btn" title="Clear capability filter">&times;</a></span>`
        : ""}
          ${activeReliability && activeReliability !== "all"
        ? ` with reliability <span class="active-filter-tag">${escapeHtml(activeReliability)} <a href="${buildFilterUrl(baseUrl, { q: filters.search, capability: activeCapability, connectionType: activeConn, pricingModel: activePricing, reliability: "all" })}" class="clear-tag-btn" title="Clear reliability filter">&times;</a></span>`
        : ""}
        </div>
        ${hasActiveFilters
        ? `
        <div style="display: flex; gap: 8px; align-items: center;">
          ${activeCapability && activeCapability !== "all"
            ? `<a href="${buildFilterUrl(baseUrl, { q: filters.search, reliability: activeReliability, connectionType: activeConn, pricingModel: activePricing, capability: "all" })}" class="btn btn-sm btn-clear-filter">Clear Capability Filter</a>`
            : ""}
          <a href="${baseUrl}" class="btn btn-sm btn-clear-filter" title="Reset all filters and view full directory">
            Reset All Filters
          </a>
        </div>
        `
        : ""}
      </div>

      <!-- Cards Grid -->
      <div class="cards-grid" aria-label="Tool Directory Cards">
        <h2 class="sr-only">Registered Autonomous Agent Tools</h2>
        ${cardsHtml}
      </div>
    </section>

    <!-- 21st.dev #9309 Split Feature Showcase: Dual Human & Agent Architecture -->
    <section id="protocol" class="showcase-section">
      <div id="agent-human-section" class="container">
        <div class="section-header-block">
          <div>
            <h2 class="section-title">Built for Humans and Autonomous Agents</h2>
            <p class="section-subtitle">
              Every page serves a spacious visual interface for human engineers alongside embedded JSON-LD and HTTP 402 USDT machine feeds for AI agents.
            </p>
          </div>
        </div>

        <div class="showcase-grid">
          <div>
            <details class="showcase-step-item" open>
              <summary>1. Discover Tools by Natural Language Intent</summary>
              <div class="showcase-step-body">
                Agents query <code>GET /search?q=sanitize+json</code> or read <code>/llms.txt</code> for free. Our 3072-dimension Gemini embedding index returns the highest-scoring tool schemas in milliseconds.
              </div>
            </details>
            <details class="showcase-step-item">
              <summary>2. Validate Against Authoritative JSON Schemas</summary>
              <div class="showcase-step-body">
                Every tool page embeds Schema.org <code>SoftwareApplication</code> JSON-LD and an inline <code>application/agent+json</code> manifest so LLMs never hallucinate parameter names or types.
              </div>
            </details>
            <details class="showcase-step-item">
              <summary>3. Settle USDT Micro-Payments via HTTP 402 on Base</summary>
              <div class="showcase-step-body">
                When invoking a paid utility at <code>POST /api/invoke/:namespace</code>, agents attach a Base Mainnet USDT transaction receipt in <code>x-payment-receipt</code>. Payment is collected strictly on <code>2xx</code> success.
              </div>
            </details>
          </div>

          <div class="showcase-panel">
            <div class="showcase-tabs">
              <button type="button" class="showcase-tab-btn active" data-showcase="json" onclick="switchShowcaseTab('json')">Agent JSON Feed</button>
              <button type="button" class="showcase-tab-btn" data-showcase="http402" onclick="switchShowcaseTab('http402')">HTTP 402 USDT Call</button>
              <button type="button" class="showcase-tab-btn" data-showcase="mcp" onclick="switchShowcaseTab('mcp')">MCP Client Setup</button>
            </div>
            <div id="showcase-panel-json" class="showcase-code-box">
              <pre><code>GET https://aipages.tech/api/tools/net.2xcel.aus.schema-sanitizer
Accept: application/json

{
  "namespace": "net.2xcel.aus.schema-sanitizer",
  "name": "schema_sanitizer",
  "pricing": {
    "model": "paid",
    "costPerCall": 0.001,
    "currency": "USDT",
    "network": "Base Mainnet (Chain ID 8453)"
  },
  "endpointUrl": "https://aipages.tech/tool/schema-sanitizer"
}</code></pre>
            </div>
            <div id="showcase-panel-http402" class="showcase-code-box" style="display: none;">
              <pre><code>curl -X POST "https://aipages.tech/tool/schema-sanitizer" \\
  -H "Content-Type: application/json" \\
  -H "x-payment-receipt: &lt;BASE_USDT_PAYMENT_RECEIPT&gt;" \\
  -d '{
    "data": { "raw": "&lt;script&gt;alert(1)&lt;/script&gt;Clean text", "apiKey": "secret" },
    "rules": { "stripHtml": true, "maskFields": ["apiKey"] }
  }'</code></pre>
            </div>
            <div id="showcase-panel-mcp" class="showcase-code-box" style="display: none;">
              <pre><code>{
  "mcpServers": {
    "aipages-registry": {
      "command": "npx",
      "args": ["-y", "@aipages/mcp-gateway"],
      "env": {
        "AIPAGES_BASE_URL": "https://aipages.tech"
      }
    }
  }
}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 21st.dev #31986 Centered FAQ & Legal Policy Accordion by hexui-sh -->
    <section id="faq-policies" class="faq-section">
      <div class="container faq-container">
        <div style="text-align: center; margin-bottom: 36px;">
          <h2 class="section-title">Frequently Asked Questions &amp; Policies</h2>
          <p class="section-subtitle" style="margin: 8px auto 0;">
            Everything human engineers and autonomous agents need to know about USDT billing, privacy, and refunds.
          </p>
        </div>

        <details class="faq-item" open>
          <summary>Is searching the directory or listing a new tool free?</summary>
          <p>
            Yes. Querying <code>/search</code>, browsing <code>/tool</code>, reading JSON schemas, and submitting new tools via <code>/submit</code> cost 0.00 USDT forever.
          </p>
        </details>

        <details class="faq-item">
          <summary>How does HTTP 402 USDT settlement work on Base Mainnet?</summary>
          <p>
            Core AUS Utilities cost 0.001 USDT per call and Extended AUS Mesh, Ledger and Motion tools cost 0.005 USDT per call on Base Mainnet (Chain ID 8453). Include your transaction receipt in the <code>x-payment-receipt</code> header.
          </p>
        </details>

        <details class="faq-item">
          <summary>What happens if a tool call fails schema validation or times out?</summary>
          <p>
            You are never charged for failed executions. If a request returns HTTP 400 or an upstream 5xx error, the payment receipt is not consumed. Any verified gateway fault is automatically refunded in USDT within 24 hours.
          </p>
        </details>

        <div class="policy-callout-card">
          <div>
            <h3 style="font-size: 1.2rem; color: #FFFFFF; margin-bottom: 6px;">Authorized Commercial &amp; Legal Documentation</h3>
            <p style="font-size: 0.9rem; color: var(--text-muted);">Inspect our complete Privacy Policy, 24-Hour USDT Refund Policy, and Terms of Service.</p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="/privacy" class="btn btn-secondary">Privacy Policy</a>
            <a href="/refund-policy" class="btn">USDT Refund Policy</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  ${renderSharedFooter()}

  <!-- Claude Desktop & Cursor 1-Click Integration Modal -->
  <div id="mcp-modal" class="mcp-modal-backdrop" style="display: none;" onclick="handleBackdropClick(event)">
    <div class="mcp-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <div>
          <h3 id="modal-title" style="font-size: 1.2rem; color: #FFFFFF; font-weight: 700;">Connect AIPages to Claude Desktop or Cursor</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Equip your coding agent with all 50 registered tools and AUS utilities</p>
        </div>
        <button type="button" class="modal-close-btn" onclick="closeMcpModal()" aria-label="Close modal">&times;</button>
      </div>

      <div class="modal-tabs">
        <button type="button" class="modal-tab-btn active" data-tab="claude" onclick="switchModalTab('claude')">Claude Desktop</button>
        <button type="button" class="modal-tab-btn" data-tab="cursor" onclick="switchModalTab('cursor')">Cursor (.cursor/mcp.json)</button>
        <button type="button" class="modal-tab-btn" data-tab="curl" onclick="switchModalTab('curl')">cURL HTTP 402</button>
      </div>

      <div class="modal-body">
        <div class="modal-tab-content" id="tab-content-claude">
          <p style="font-size: 0.88rem; color: var(--text-muted);">Add this block to your <code>claude_desktop_config.json</code> under <code>mcpServers</code>:</p>
          <div class="code-container">
            <pre><code id="snippet-claude-config">{
  "mcpServers": {
    "aipages": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {
        "AIPAGES_MCP_MANIFEST": "https://aipages.tech/mcp.json",
        "AIPAGES_ENDPOINT": "https://aipages.tech/api/feed.json"
      }
    }
  }
}</code></pre>
            <button type="button" class="btn modal-copy-btn" onclick="copySnippet('snippet-claude-config', this)">Copy Config</button>
          </div>
        </div>

        <div class="modal-tab-content" id="tab-content-cursor" style="display: none;">
          <p style="font-size: 0.88rem; color: var(--text-muted);">Place this configuration in your workspace at <code>.cursor/mcp.json</code>:</p>
          <div class="code-container">
            <pre><code id="snippet-cursor-config">{
  "mcpServers": {
    "aipages-gateway": {
      "url": "https://aipages.tech/mcp.json",
      "feedUrl": "https://aipages.tech/api/feed.json"
    }
  }
}</code></pre>
            <button type="button" class="btn modal-copy-btn" onclick="copySnippet('snippet-cursor-config', this)">Copy Config</button>
          </div>
        </div>

        <div class="modal-tab-content" id="tab-content-curl" style="display: none;">
          <p style="font-size: 0.88rem; color: var(--text-muted);">Invoke any canonical AUS utility directly over HTTP 402:</p>
          <div class="code-container">
            <pre><code id="snippet-curl-config">curl -X POST "https://aipages.tech/tool/schema-sanitizer" \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-ID: my-agent" \\
  -d '{
    "data": { "raw": "&lt;b&gt;Sanitized Payload&lt;/b&gt;", "token": "secret" },
    "rules": { "stripHtml": true, "maskFields": ["token"] }
  }'</code></pre>
            <button type="button" class="btn modal-copy-btn" onclick="copySnippet('snippet-curl-config', this)">Copy cURL</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    var FLOW_SLIDES = [
      {
        num: "Slide 01 of 07",
        title: "The API Marketplace Built for AI Agents",
        subtitle: "Autonomous Discovery and USDT Micro-Payments",
        desc: "AIPages connects autonomous AI agents and human developers to deterministic APIs with 3072-dimension Gemini semantic search and HTTP 402 USDT settlement on Base Mainnet.",
        img: "/assets/flow/flow-01-hero-marketplace.jpg",
        ctaText: "Explore Tool Directory",
        ctaHref: "#directory-section"
      },
      {
        num: "Slide 02 of 07",
        title: "8 Core Utilities Ready to Deploy",
        subtitle: "Production Validation, Security, Logic, and On-Chain Payments",
        desc: "The Agent Utility Services fleet provides production-grade validation, security, and reasoning tools natively integrated with Base Mainnet payment headers at 0.001 USDT per call.",
        img: "/assets/flow/flow-02-core-utilities.jpg",
        ctaText: "View Core Utilities",
        ctaHref: "#directory-section"
      },
      {
        num: "Slide 03 of 07",
        title: "Schema Sanitizer",
        subtitle: "0.001 USDT per invocation on Base Mainnet",
        desc: "Enterprise-grade input sanitization, HTML and XSS tag stripping, key casing normalization, and sensitive field masking for structured JSON data passed between autonomous agents.",
        img: "/assets/flow/flow-03-schema-sanitizer.jpg",
        ctaText: "Inspect Schema Sanitizer",
        ctaHref: "/tool/net.2xcel.aus.schema-sanitizer"
      },
      {
        num: "Slide 04 of 07",
        title: "Financial Audit",
        subtitle: "0.001 USDT per invocation on Base Mainnet",
        desc: "Batch transaction ledger reconciliation, cumulative volume computation, risk scoring, and anomaly detection to verify autonomous agent cashflows and on-chain spending limits.",
        img: "/assets/flow/flow-04-financial-audit.jpg",
        ctaText: "Inspect Financial Audit",
        ctaHref: "/tool/net.2xcel.aus.financial-audit"
      },
      {
        num: "Slide 05 of 07",
        title: "Verification Oracle",
        subtitle: "0.001 USDT per invocation on Base Mainnet",
        desc: "Deterministic SHA-256 state attestation and integrity hashing oracle. Compares dynamic agent output against expected hash proofs for cryptographic state verification.",
        img: "/assets/flow/flow-05-verification-oracle.jpg",
        ctaText: "Inspect Verification Oracle",
        ctaHref: "/tool/net.2xcel.aus.verification-oracle"
      },
      {
        num: "Slide 06 of 07",
        title: "Geospatial Verifier",
        subtitle: "0.001 USDT per invocation on Base Mainnet",
        desc: "Haversine distance calculations, geofencing boundary verification, and coordinate proximity checks to validate whether agents operate within authorized geographic corridors.",
        img: "/assets/flow/flow-06-geospatial-verifier.jpg",
        ctaText: "Inspect Geospatial Verifier",
        ctaHref: "/tool/net.2xcel.aus.geospatial-verifier"
      },
      {
        num: "Slide 07 of 07",
        title: "Ready to Scale Your Agent Workflows?",
        subtitle: "Free Tool Listing and Instant Vector Indexing",
        desc: "Explore the live 50-tool directory, test endpoints in the browser sandbox, or list your own MCP or HTTP tool in our open marketplace for free.",
        img: "/assets/flow/flow-07-scale-workflows.jpg",
        ctaText: "Submit Your Tool Free",
        ctaHref: "/submit"
      }
    ];

    var currentFlowIndex = 0;

    function selectFlowSlide(index) {
      currentFlowIndex = (index + FLOW_SLIDES.length) % FLOW_SLIDES.length;
      var slide = FLOW_SLIDES[currentFlowIndex];
      document.getElementById('flow-counter').textContent = slide.num;
      document.getElementById('flow-title').textContent = slide.title;
      document.getElementById('flow-subtitle').textContent = slide.subtitle;
      document.getElementById('flow-desc').textContent = slide.desc;
      var imgEl = document.getElementById('flow-image');
      imgEl.src = slide.img;
      imgEl.alt = slide.title;
      var ctaEl = document.getElementById('flow-cta');
      ctaEl.textContent = slide.ctaText;
      ctaEl.href = slide.ctaHref;

      var steps = document.querySelectorAll('.flow-progress-step');
      steps.forEach(function(btn, idx) {
        if (idx === currentFlowIndex) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    function stepFlowSlide(delta) {
      selectFlowSlide(currentFlowIndex + delta);
    }

    function filterToolCardsByGroup(group) {
      var buttons = document.querySelectorAll('.category-tab-btn');
      buttons.forEach(function(btn) {
        if (btn.getAttribute('data-group-filter') === group) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      var cards = document.querySelectorAll('.tool-card');
      cards.forEach(function(card) {
        var cardGroup = card.getAttribute('data-group');
        if (group === 'all' || cardGroup === group) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function switchShowcaseTab(tabId) {
      var btns = document.querySelectorAll('.showcase-tab-btn');
      btns.forEach(function(btn) {
        if (btn.getAttribute('data-showcase') === tabId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      ['json', 'http402', 'mcp'].forEach(function(id) {
        var panel = document.getElementById('showcase-panel-' + id);
        if (panel) {
          panel.style.display = (id === tabId) ? 'block' : 'none';
        }
      });
    }

    function openMcpModal() {
      var modal = document.getElementById('mcp-modal');
      if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    }

    function closeMcpModal() {
      var modal = document.getElementById('mcp-modal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

    function handleBackdropClick(e) {
      if (e.target && e.target.id === 'mcp-modal') {
        closeMcpModal();
      }
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeMcpModal();
      }
    });

    function switchModalTab(tabId) {
      var tabBtns = document.querySelectorAll('.modal-tab-btn');
      tabBtns.forEach(function(btn) {
        if (btn.getAttribute('data-tab') === tabId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      ['claude', 'cursor', 'curl'].forEach(function(id) {
        var el = document.getElementById('tab-content-' + id);
        if (el) {
          el.style.display = (id === tabId) ? 'block' : 'none';
        }
      });
    }

    function copySnippet(elementId, btn) {
      var el = document.getElementById(elementId);
      if (!el) return;
      var text = el.innerText || el.textContent;
      navigator.clipboard.writeText(text).then(function() {
        var original = btn.innerText;
        btn.innerText = 'Copied!';
        setTimeout(function() {
          btn.innerText = original;
        }, 2000);
      });
    }

    // 21st.dev 3D Tilt Physics & Cursor-Following Spotlight
    (function initCardInteractiveMotion() {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      var cards = document.querySelectorAll('.tool-card, .stats-block-card');
      cards.forEach(function(card) {
        var bounds = null;
        var rafId = null;

        function onMouseMove(e) {
          if (!bounds) bounds = card.getBoundingClientRect();
          var mouseX = e.clientX - bounds.left;
          var mouseY = e.clientY - bounds.top;

          card.style.setProperty('--mouse-x', mouseX + 'px');
          card.style.setProperty('--mouse-y', mouseY + 'px');

          var centerX = bounds.width / 2;
          var centerY = bounds.height / 2;
          var tiltX = ((mouseY - centerY) / centerY) * -5;
          var tiltY = ((mouseX - centerX) / centerX) * 5;

          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(function() {
            card.style.transform = 'perspective(1000px) rotateX(' + tiltX.toFixed(2) + 'deg) rotateY(' + tiltY.toFixed(2) + 'deg) translateY(-3px) scale3d(1.01, 1.01, 1.01)';
          });
        }

        function onMouseLeave() {
          if (rafId) cancelAnimationFrame(rafId);
          bounds = null;
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)';
        }

        card.addEventListener('mouseenter', function() {
          bounds = card.getBoundingClientRect();
        });
        card.addEventListener('mousemove', onMouseMove);
        card.addEventListener('mouseleave', onMouseLeave);
      });
    })();
  </script>
  ${renderWebMcpRuntimeScript({ pageType: "directory" })}
</body>
</html>`;
}
//# sourceMappingURL=directoryPage.js.map