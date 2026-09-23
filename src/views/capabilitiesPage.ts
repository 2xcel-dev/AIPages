import { type Tool, deriveReliability } from "../types.js";

export interface CapabilitySummary {
  name: string;
  toolCount: number;
  description: string;
  directoryUrl: string;
  tools: Array<{
    namespace: string;
    name: string;
    description: string;
    isFirstParty: boolean;
    pricingModel: string;
    costPerCall: number;
    reliability: string;
    healthStatus: string;
  }>;
}

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

export const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  "schema-sanitization": "Input sanitization, HTML/XSS stripping, and structured JSON schema normalization for autonomous workflows.",
  "data-cleaning": "Automated data normalization, whitespace stripping, and structured payload sanitization.",
  "json-normalization": "Deterministic sorting, typing, and schema compliance normalization for agent JSON data.",
  "financial-audit": "Decentralized ledger auditing, balance reconciliation, and compliance checks for on-chain finance.",
  "ledger-verification": "Cryptographic double-entry validation and consensus-backed ledger state verification.",
  "compliance": "Automated regulatory, sanctions, and transaction policy compliance checks for autonomous agents.",
  "verification-oracle": "Fact-checking, cryptographic proof validation, and decentralized consensus verification oracles.",
  "fact-check": "Cross-referenced knowledge assertions and automated factuality verifications for agent reasoning.",
  "state-proof": "Merkle proofs, state-root validation, and cryptographic state transition proofs.",
  "geospatial": "Coordinate validation, spatial boundary checking, and GIS data transformations.",
  "coordinate-validation": "Latitude, longitude, elevation, and geo-fence coordinate geometry verification.",
  "boundary-check": "Polygon containment, regional boundary validation, and exclusion zone verification.",
  "sandbox-execution": "Isolated containerized runtime for safe execution of untrusted autonomous agent code.",
  "code-eval": "Dynamic code evaluation, static AST analysis, and isolated script execution.",
  "secure-runtime": "Ephemeral zero-trust execution sandbox preventing unauthorized system access.",
  "claude-reason": "Deep logical deduction, multi-step problem solving, and complex autonomous reasoning.",
  "deep-inference": "Chain-of-thought analysis, systematic hypothesis testing, and heuristic inference.",
  "logical-analysis": "Formal logic verification, consistency checks, and semantic argument validation.",
  "media-transcoder": "Asset optimization, media format conversion, audio/video encoding, and compression.",
  "format-conversion": "Automated format conversion across standard media, image, and structured data formats.",
  "asset-optimization": "Lossless compression and bandwidth optimization for agent-generated multimedia assets.",
  "agentic-audit": "Autonomous agent trace evaluation, step-by-step reasoning verification, and behavioral auditing.",
  "behavior-trace": "Execution trace capture, tool invocation logging, and behavioral anomaly detection.",
  "agent-eval": "Automated rubric scoring, benchmark evaluation, and performance monitoring for autonomous agents.",
  "validation": "Input data validation and constraint verification against defined schemas.",
  "json-schema": "JSON Schema specification adherence, validation, and metadata generation.",
  "testing": "Automated test execution and synthetic verification workflows.",
};

/**
 * Aggregate all distinct capabilities across indexed tools with tool counts,
 * descriptions, and direct directory links.
 */
export function getCapabilityIndex(tools: Tool[]): CapabilitySummary[] {
  const capMap = new Map<string, CapabilitySummary>();

  for (const tool of tools) {
    if (tool.status === "rejected" || tool.status === "pending") {
      continue;
    }

    const caps = (tool.capabilities && tool.capabilities.length > 0)
      ? tool.capabilities
      : [];

    const health = deriveReliability(tool);
    const isFirstParty = Boolean(
      tool.isFirstParty ??
      tool.developer?.isFirstParty ??
      tool.namespace?.startsWith("net.2xcel.aus")
    );

    const toolEntry = {
      namespace: tool.namespace,
      name: tool.name,
      description: tool.description || "",
      isFirstParty,
      pricingModel: tool.pricing?.model || "free",
      costPerCall: tool.pricing?.costPerCall ?? 0,
      reliability: health.reliability,
      healthStatus: health.healthStatus,
    };

    for (const rawCap of caps) {
      const cap = rawCap.trim().toLowerCase();
      if (!cap) continue;

      if (!capMap.has(cap)) {
        const desc = CAPABILITY_DESCRIPTIONS[cap] || tool.description || `Autonomous agent tools providing ${cap} functionality.`;
        capMap.set(cap, {
          name: cap,
          toolCount: 0,
          description: desc,
          directoryUrl: `/tools?capability=${encodeURIComponent(cap)}`,
          tools: [],
        });
      }

      const summary = capMap.get(cap)!;
      summary.toolCount += 1;
      summary.tools.push(toolEntry);
    }
  }

  // Sort by toolCount descending, then alphabetically by name
  return Array.from(capMap.values()).sort((a, b) => {
    if (b.toolCount !== a.toolCount) {
      return b.toolCount - a.toolCount;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Render responsive HTML view for /capabilities page.
 */
export function renderCapabilitiesPage(
  capabilities: CapabilitySummary[],
  totalToolsCount: number,
  baseUrl: string = "https://aipages.2xcel.net",
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  // Generate JSON-LD CollectionPage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "AI Agent Tool Capabilities Directory",
    description: "Machine-readable directory of functional capabilities for autonomous AI agent tools.",
    url: `${normalizedBase}/capabilities`,
    numberOfItems: capabilities.length,
    itemListElement: capabilities.map((cap, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: cap.name,
      description: cap.description,
      url: `${normalizedBase}${cap.directoryUrl}`,
    })),
  };
  const jsonLdScript = JSON.stringify(jsonLd, null, 2).replace(/</g, "\\u003c");

  const cardsHtml = capabilities
    .map((cap) => {
      const escapedName = escapeHtml(cap.name);
      const escapedDesc = escapeHtml(cap.description);
      const toolCountDisplay = `${cap.toolCount} ${cap.toolCount === 1 ? "tool" : "tools"}`;

      const toolsListHtml = cap.tools
        .slice(0, 4)
        .map((t) => {
          const escapedToolName = escapeHtml(t.name);
          const escapedNs = escapeHtml(t.namespace);
          let relBadgeClass = "badge-unchecked";
          let relLabel = "Unchecked";

          if (t.reliability === "high") {
            relBadgeClass = "badge-healthy";
            relLabel = "Operational";
          } else if (t.reliability === "degraded") {
            relBadgeClass = "badge-degraded";
            relLabel = "Degraded";
          } else if (t.reliability === "failing") {
            relBadgeClass = "badge-failing";
            relLabel = "Failing";
          }

          const priceDisplay = t.pricingModel === "free" || t.costPerCall === 0
            ? "Free"
            : `$${t.costPerCall} USDC`;

          return `
            <a href="/tools/${encodeURIComponent(t.namespace)}" class="cap-tool-pill" title="${escapedNs}">
              <span class="cap-tool-name">${escapedToolName}</span>
              ${t.isFirstParty ? `<span class="badge-aus" title="First-Party AUS Tool">★ AUS</span>` : ""}
              <span class="cap-tool-price">${priceDisplay}</span>
              <span class="badge ${relBadgeClass}">${relLabel}</span>
            </a>
          `;
        })
        .join("");

      const moreCount = cap.tools.length - 4;
      const moreHtml = moreCount > 0 ? `<span class="cap-more-pill">+${moreCount} more</span>` : "";

      return `
        <article class="cap-card" data-cap="${escapedName}" data-desc="${escapedDesc}">
          <div class="cap-card-header">
            <div class="cap-title-row">
              <span class="cap-icon">🏷️</span>
              <h2 class="cap-title">
                <a href="${cap.directoryUrl}">${escapedName}</a>
              </h2>
            </div>
            <span class="cap-count-badge">${toolCountDisplay}</span>
          </div>

          <p class="cap-desc">${escapedDesc}</p>

          <div class="cap-tools-section">
            <span class="cap-tools-label">Available Tools</span>
            <div class="cap-tools-list">
              ${toolsListHtml}
              ${moreHtml}
            </div>
          </div>

          <div class="cap-card-footer">
            <a href="${cap.directoryUrl}" class="btn-browse">
              Browse ${escapedName} Tools &rarr;
            </a>
          </div>
        </article>
      `;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Capabilities Index — AIPages Agent Tool Registry</title>
  <meta name="description" content="Explore autonomous agent tools by functional capability. Browse sanitized JSON schemas, auditing engines, oracles, sandboxes, and verification tools.">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <script type="application/ld+json">
${jsonLdScript}
  </script>
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
      align-items: center;
    }
    .nav-links a {
      color: var(--text-muted);
    }
    .nav-links a:hover {
      color: var(--text);
      text-decoration: none;
    }
    .nav-links a.active {
      color: var(--primary);
      font-weight: 600;
    }

    /* Hero */
    .hero {
      padding: 36px 0 24px;
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
    }
    .hero-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--primary);
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .hero-title {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 12px;
      color: #fff;
    }
    .hero-subtitle {
      font-size: 1.05rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* Stats bar */
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin: 24px 0 32px;
      padding: 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--primary);
      line-height: 1.2;
    }
    .stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Search/filter box */
    .filter-section {
      margin-bottom: 32px;
    }
    .search-input-wrapper {
      position: relative;
      max-width: 600px;
      margin: 0 auto;
    }
    .search-input {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 20px 14px 44px;
      color: var(--text);
      font-size: 0.98rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }
    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-dim);
      font-size: 1.1rem;
      pointer-events: none;
    }

    /* Grid */
    .cap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
      margin-bottom: 48px;
    }

    /* Card */
    .cap-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .cap-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-light);
    }

    .cap-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .cap-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .cap-icon {
      font-size: 1.1rem;
    }
    .cap-title {
      font-size: 1.2rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .cap-title a {
      color: #fff;
    }
    .cap-title a:hover {
      color: var(--primary);
    }

    .cap-count-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .cap-desc {
      font-size: 0.92rem;
      color: var(--text-muted);
      line-height: 1.5;
      flex: 1;
    }

    /* Tools section in card */
    .cap-tools-section {
      background: var(--card-surface);
      border: 1px solid rgba(39, 53, 79, 0.6);
      border-radius: var(--radius-sm);
      padding: 12px;
    }
    .cap-tools-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-bottom: 8px;
    }
    .cap-tools-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .cap-tool-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #111827;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.78rem;
      color: var(--text);
      text-decoration: none;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .cap-tool-pill:hover {
      border-color: var(--primary);
      background: #1a2234;
      text-decoration: none;
    }
    .cap-tool-name {
      font-weight: 600;
      color: #fff;
    }
    .badge-aus {
      font-size: 0.65rem;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.18);
      border-radius: 4px;
      padding: 1px 4px;
    }
    .cap-tool-price {
      font-size: 0.7rem;
      color: var(--text-dim);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.68rem;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 999px;
    }
    .badge-healthy {
      background: var(--healthy-bg);
      color: var(--healthy);
      border: 1px solid var(--healthy-border);
    }
    .badge-degraded {
      background: var(--degraded-bg);
      color: var(--degraded);
      border: 1px solid var(--degraded-border);
    }
    .badge-failing {
      background: var(--failing-bg);
      color: var(--failing);
      border: 1px solid var(--failing-border);
    }
    .badge-unchecked {
      background: var(--unchecked-bg);
      color: var(--unchecked);
      border: 1px solid var(--unchecked-border);
    }
    .cap-more-pill {
      font-size: 0.74rem;
      color: var(--text-dim);
      padding: 2px 6px;
    }

    .cap-card-footer {
      border-top: 1px solid var(--border);
      padding-top: 14px;
    }
    .btn-browse {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--primary);
      transition: gap 0.15s ease;
    }
    .btn-browse:hover {
      text-decoration: none;
      gap: 10px;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      display: none;
    }
    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 12px;
      color: var(--text-dim);
    }
    .empty-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .empty-desc {
      font-size: 0.95rem;
      color: var(--text-muted);
      max-width: 480px;
      margin: 0 auto;
    }

    /* Footer */
    .footer {
      margin-top: auto;
      border-top: 1px solid var(--border);
      padding: 32px 0;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-dim);
    }

    @media (max-width: 768px) {
      .cap-grid {
        grid-template-columns: 1fr;
      }
      .hero-title {
        font-size: 1.7rem;
      }
      .stats-bar {
        flex-direction: column;
        gap: 16px;
      }
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
        <a href="/tools">Directory</a>
        <a href="/capabilities" class="active">Capabilities</a>
        <a href="/search">Vector Search</a>
        <a href="/api/tools">API Tools</a>
        <a href="/api/openapi.json">OpenAPI Spec</a>
      </div>
    </div>
  </nav>

  <main class="container">
    <section class="hero">
      <span class="hero-badge">Functional Taxonomies</span>
      <h1 class="hero-title">AI Agent Tool Capabilities</h1>
      <p class="hero-subtitle">
        Browse and discover autonomous agent tools by functional capability.
        Filter directly into the directory to inspect schemas, live endpoints, and x402 payment specifications.
      </p>
    </section>

    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-value">${capabilities.length}</div>
        <div class="stat-label">Distinct Capabilities</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${totalToolsCount}</div>
        <div class="stat-label">Indexed Tools</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">100%</div>
        <div class="stat-label">Base Mainnet x402 Ready</div>
      </div>
    </div>

    <div class="filter-section">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          id="cap-filter"
          class="search-input"
          placeholder="Filter capabilities (e.g. audit, schema, geo, reason)..."
          autocomplete="off"
        >
      </div>
    </div>

    <div class="cap-grid" id="cap-grid">
      ${cardsHtml}
    </div>

    <div class="empty-state" id="empty-state">
      <div class="empty-icon">🔍</div>
      <h3 class="empty-title">No matching capabilities found</h3>
      <p class="empty-desc">Try searching for terms like "audit", "sanitizer", "oracle", or "code".</p>
    </div>
  </main>

  <footer class="footer">
    <div class="container">
      <p>AIPages — Machine-native discovery registry and vector search index for autonomous AI agent tools.</p>
    </div>
  </footer>

  <script>
    (function() {
      const input = document.getElementById('cap-filter');
      const grid = document.getElementById('cap-grid');
      const emptyState = document.getElementById('empty-state');
      if (!input || !grid || !emptyState) return;

      const cards = Array.from(grid.querySelectorAll('.cap-card'));

      input.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        let visibleCount = 0;

        cards.forEach(card => {
          const cap = card.getAttribute('data-cap') || '';
          const desc = card.getAttribute('data-desc') || '';
          const matches = !query || cap.includes(query) || desc.toLowerCase().includes(query);

          if (matches) {
            card.style.display = '';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        if (visibleCount === 0) {
          emptyState.style.display = 'block';
        } else {
          emptyState.style.display = 'none';
        }
      });
    })();
  </script>
</body>
</html>`;
}
