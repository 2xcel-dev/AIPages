import { escapeHtml } from "./utils.js";

/**
 * Convert raw snake_case or kebab-case tool identifiers into clean human titles
 * while preserving acronyms (AUS, API, JSON, JWT, AST, PII, IP, SEC, ZK, MCP, WebRTC, GraphQL).
 */
export function formatHumanToolTitle(rawName: string): string {
  if (!rawName) return "Agent Tool";
  if (rawName.includes(" ") && /[A-Z]/.test(rawName)) {
    return rawName;
  }
  const acronyms: Record<string, string> = {
    aus: "AUS",
    api: "API",
    json: "JSON",
    jwt: "JWT",
    ast: "AST",
    pii: "PII",
    ip: "IP",
    sec: "SEC",
    zk: "ZK",
    mcp: "MCP",
    webrtc: "WebRTC",
    graphql: "GraphQL",
    x402: "x402",
    edgar: "EDGAR",
    llm: "LLM",
  };
  return rawName
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (acronyms[lower]) return acronyms[lower];
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Map canonical tools to their dedicated Google Flow promotional artwork.
 */
export function getFlowArtworkForTool(nameOrNamespace: string): string | null {
  const lower = (nameOrNamespace || "").toLowerCase();
  if (lower.includes("schema") && lower.includes("sanitizer")) {
    return "/assets/flow/flow-03-schema-sanitizer.jpg";
  }
  if (lower.includes("financial") && lower.includes("audit")) {
    return "/assets/flow/flow-04-financial-audit.jpg";
  }
  if (lower.includes("verification") && lower.includes("oracle")) {
    return "/assets/flow/flow-05-verification-oracle.jpg";
  }
  if (lower.includes("geospatial") && lower.includes("verifier")) {
    return "/assets/flow/flow-06-geospatial-verifier.jpg";
  }
  return null;
}

/**
 * Shared CSS variables, typography, 21st.dev Navbar (#8948), and 21st.dev Minimal Footer (#7264) styles.
 */
export const SHARED_DESIGN_SYSTEM_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap');

  :root {
    /* Canvas & Structural Surfaces (Terminal High-Contrast) */
    --bg-canvas: #040507;
    --surface-base: #0B0E14;
    --surface-raised: #111520;
    --surface-overlay: #181D2B;
    --surface-terminal: #020305;

    /* High-Contrast Razor Borders */
    --border-subtle: #1E2433;
    --border-strong: #2D374D;
    --border-focus: #00F0FF;

    /* Semantic Compatibility & Theme Mappings */
    --bg: #040507;
    --bg-elevated: #0B0E14;
    --card-bg: #0B0E14;
    --card-surface: #111520;
    --border: #1E2433;
    --border-light: rgba(245, 158, 11, 0.4);

    /* Text Crispness (WCAG AAA 16:1 on canvas) */
    --text: #F8FAFC;
    --text-muted: #CBD5E1;
    --text-dim: #94A3B8;

    /* Brand & Status Accents */
    --primary: #F59E0B;
    --primary-bright: #FFD000;
    --primary-hover: #D97706;
    --accent-cyan: #00F0FF;
    --healthy: #10B981;
    --healthy-bg: rgba(16, 185, 129, 0.12);
    --healthy-border: rgba(16, 185, 129, 0.35);
    --degraded: #F59E0B;
    --degraded-bg: rgba(245, 158, 11, 0.12);
    --degraded-border: rgba(245, 158, 11, 0.35);
    --failing: #EF4444;
    --failing-bg: rgba(239, 68, 68, 0.14);
    --failing-border: rgba(239, 68, 68, 0.38);
    --unchecked: #94A3B8;
    --unchecked-bg: rgba(148, 163, 184, 0.1);
    --unchecked-border: rgba(148, 163, 184, 0.25);
    --code-bg: #020305;

    /* Sharpened Institutional Radii (6px - 8px) */
    --radius-xs: 4px;
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 10px;
    --radius: 8px;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: var(--bg);
    color: var(--text);
    line-height: 1.65;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, .font-display {
    font-family: 'Space Grotesk', sans-serif;
    letter-spacing: -0.025em;
  }

  code, pre, .font-mono {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  a {
    color: var(--primary-bright);
    text-decoration: none;
    transition: color 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
    cursor: pointer;
  }

  a:hover {
    color: #FFFFFF;
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  .container {
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* 21st.dev #8948 Fixed SaaS Navigation Bar */
  .nav {
    position: sticky;
    top: 0;
    z-index: 60;
    background: rgba(6, 6, 8, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .nav-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 76px;
    gap: 16px;
    flex-wrap: nowrap;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: #FFFFFF;
    flex-shrink: 0;
  }

  .brand:hover {
    text-decoration: none;
  }

  .brand-logo-box {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%);
    border: 1px solid rgba(245, 158, 11, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.15);
  }

  .brand-wordmark {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: #FFFFFF;
    white-space: nowrap;
  }

  .brand-wordmark span {
    color: var(--primary);
  }

  .brand-badge {
    font-size: 0.68rem;
    background: rgba(245, 158, 11, 0.12);
    color: var(--primary-bright);
    border: 1px solid rgba(245, 158, 11, 0.3);
    padding: 3px 8px;
    border-radius: 999px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 18px;
    font-size: 0.88rem;
    font-weight: 500;
    flex-wrap: nowrap;
    white-space: nowrap;
  }

  .nav-links a {
    color: #A1A1AA;
    text-decoration: none;
    padding: 6px 0;
    transition: color 0.18s ease;
  }

  .nav-links a:hover,
  .nav-links a.active {
    color: #FFFFFF;
    text-decoration: none;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .nav-submit-link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 15px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.03);
    color: #E4E4E7;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.18s ease;
    white-space: nowrap;
  }

  .nav-submit-link:hover {
    border-color: rgba(245, 158, 11, 0.45);
    color: #FFFFFF;
    background: rgba(245, 158, 11, 0.08);
    text-decoration: none;
  }

  .nav-mcp-btn {
    background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
    color: #060608;
    border: 1px solid #FFD000;
    padding: 9px 16px;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: all 0.18s ease;
    box-shadow: 0 4px 18px rgba(245, 158, 11, 0.25);
    white-space: nowrap;
  }

  .nav-mcp-btn:hover {
    background: #FFD000;
    color: #060608;
    box-shadow: 0 6px 22px rgba(245, 158, 11, 0.4);
  }

  /* 21st.dev #7264 Minimal Footer by efferd */
  .minimal-footer {
    margin-top: auto;
    position: relative;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: #050507;
  }

  .minimal-footer-frame {
    max-width: 1240px;
    margin: 0 auto;
    padding: 56px 28px 36px;
    border-left: 1px solid rgba(255, 255, 255, 0.06);
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    background: radial-gradient(38% 80% at 25% 0%, rgba(245, 158, 11, 0.08), transparent);
  }

  .minimal-footer-grid {
    display: grid;
    grid-template-columns: 2.2fr 1fr 1fr 1fr;
    gap: 40px;
    padding-bottom: 40px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .minimal-footer-brand p {
    color: var(--text-muted);
    font-size: 0.92rem;
    max-width: 380px;
    margin-top: 14px;
    line-height: 1.65;
  }

  .minimal-footer-socials {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  .minimal-footer-social-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
    color: #D4D4D8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s ease;
  }

  .minimal-footer-social-btn:hover {
    border-color: var(--primary);
    color: var(--primary-bright);
    background: rgba(245, 158, 11, 0.08);
  }

  .minimal-footer-col-title {
    display: block;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #FFFFFF;
    margin-bottom: 14px;
  }

  .minimal-footer-links {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .minimal-footer-links a {
    color: var(--text-muted);
    font-size: 0.88rem;
    text-decoration: none;
    width: max-content;
    transition: color 0.18s ease;
  }

  .minimal-footer-links a:hover {
    color: var(--primary-bright);
    text-decoration: none;
  }

  .minimal-footer-bottom {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding-top: 24px;
    font-size: 0.84rem;
    color: var(--text-dim);
  }

  .minimal-footer-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #D4D4D8;
    font-size: 0.82rem;
  }

  .minimal-footer-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--healthy);
    box-shadow: 0 0 8px var(--healthy);
  }

  @media (max-width: 1140px) {
    .nav-links {
      gap: 14px;
      font-size: 0.82rem;
    }
    .nav-inner {
      gap: 12px;
    }
  }

  @media (max-width: 920px) {
    .minimal-footer-grid {
      grid-template-columns: 1fr 1fr;
    }
    .nav-inner {
      height: 68px;
      gap: 12px;
      overflow: hidden;
    }
    .nav-links {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 2px;
    }
    .nav-links::-webkit-scrollbar {
      display: none;
    }
  }

  @media (max-width: 600px) {
    .minimal-footer-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

/**
 * Render the authentic Solar Icons layers brandmark with dual-tone depth.
 */
export function renderBrandLogoSvg(): string {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="solar-icon">
    <path d="M16.2127 10.8085L19.0212 9.68508C21.0071 8.89073 22 8.49355 22 8C22 7.50645 21.0071 7.10927 19.0212 6.31492L16.2127 5.19153C14.2268 4.39718 13.2339 4 12 4C10.7661 4 9.77318 4.39718 7.7873 5.19153L4.97883 6.31492C2.99294 7.10927 2 7.50645 2 8C2 8.49355 2.99294 8.89073 4.97883 9.68508L7.7873 10.8085C9.77318 11.6028 10.7661 12 12 12C13.2339 12 14.2268 11.6028 16.2127 10.8085Z" stroke="#F59E0B" stroke-width="1.75" stroke-linecap="round" fill="rgba(245, 158, 11, 0.15)"/>
    <path d="M22 12C22 12 21.0071 12.8907 19.0212 13.6851L16.2127 14.8085C14.2268 15.6028 13.2339 16 12 16C10.7661 16 9.77318 15.6028 7.7873 14.8085L4.97883 13.6851C2.99294 12.8907 2 12 2 12" stroke="#FFD000" stroke-width="1.75" stroke-linecap="round"/>
    <path d="M22 16C22 16 21.0071 16.8907 19.0212 17.6851L16.2127 18.8085C14.2268 19.6028 13.2339 20 12 20C10.7661 20 9.77318 19.6028 7.7873 18.8085L4.97883 17.6851C2.99294 16.8907 2 16 2 16" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

/**
 * Render the 21st.dev #8948 Fixed SaaS Navigation Bar with Solar Icons.
 * Preserves exact `<a href="/capabilities">Capabilities</a>` for test suite compatibility.
 */
export function renderSharedNavbar(activeRoute: "directory" | "capabilities" | "submit" | "legal" | "tool" = "directory", showMcpButton: boolean = true): string {
  return `
  <nav class="nav" aria-label="Primary Navigation">
    <div class="container nav-inner">
      <a href="/" class="brand">
        <span class="brand-logo-box">
          ${renderBrandLogoSvg()}
        </span>
        <span class="brand-wordmark">AI<span>Pages</span></span>
        <span class="brand-badge">Registry</span>
      </a>
      <div class="nav-links">
        <a href="/tool"${activeRoute === "directory" ? ' class="active"' : ""}>Tool Directory</a>
        <a href="/capabilities"${activeRoute === "capabilities" ? ' class="active"' : ""}>Capabilities</a>
        <a href="/#flow-showcase">Core Utilities</a>
        <a href="/#agent-human-section">Human &amp; Agent Access</a>
        <a href="/privacy"${activeRoute === "legal" ? ' class="active"' : ""}>Privacy &amp; Refunds</a>
      </div>
      <div class="nav-actions">
        <a href="/submit" class="nav-submit-link"${activeRoute === "submit" ? ' style="border-color: var(--primary); color: #fff;"' : ""}>
          <!-- Solar Icons: add-circle (linear) -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke-linecap="round"/>
            <path d="M15 12L12 12M12 12L9 12M12 12L12 9M12 12L12 15" stroke-linecap="round"/>
          </svg>
          <span>Submit Tool</span>
        </a>
        ${
          showMcpButton
            ? `<button type="button" class="nav-mcp-btn" onclick="typeof openMcpModal === 'function' ? openMcpModal() : window.location.href='/#agent-human-section'">
                <!-- Solar Icons: cpu-bolt (linear) -->
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M10 17H14C15.4142 17 16.1213 17 16.5607 16.5607C17 16.1213 17 15.4142 17 14V10C17 8.58579 17 7.87868 16.5607 7.43934C16.1213 7 15.4142 7 14 7H10C8.58579 7 7.87868 7 7.43934 7.43934C7 7.87868 7 8.58579 7 10V14C7 15.4142 7 16.1213 7.43934 16.5607C7.87868 17 8.58579 17 10 17Z" stroke-linecap="round"/>
                  <path d="M12.4286 10L11 12H13L11.5714 14" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 20C8.22876 20 6.34315 20 5.17157 18.8284C4 17.6569 4 15.7712 4 12C4 8.22876 4 6.34315 5.17157 5.17157C6.34315 4 8.22876 4 12 4C15.7712 4 17.6569 4 18.8284 5.17157C20 6.34315 20 8.22876 20 12C20 15.7712 20 17.6569 18.8284 18.8284C17.6569 20 15.7712 20 12 20Z" stroke-linecap="round"/>
                </svg>
                <span>Connect Agent</span>
              </button>`
            : `<a href="/tool" class="nav-mcp-btn">Explore Tools</a>`
        }
      </div>
    </div>
  </nav>`;
}

/**
 * Render the 21st.dev #7264 Minimal Footer component by efferd.
 */
export function renderSharedFooter(): string {
  const year = new Date().getFullYear();
  return `
  <footer class="minimal-footer">
    <div class="minimal-footer-frame">
      <div class="minimal-footer-grid">
        <div class="minimal-footer-brand">
          <a href="/" class="brand">
            <span class="brand-logo-box">
              ${renderBrandLogoSvg()}
            </span>
            <span class="brand-wordmark">AI<span>Pages</span></span>
          </a>
          <p>
            The API marketplace and cross-protocol discovery registry built for autonomous AI agents and human developers. Instant USDT micro-payments on Base Mainnet via HTTP 402.
          </p>
          <div class="minimal-footer-socials">
            <a href="https://github.com/2xcel-dev/AIPages" target="_blank" rel="noopener" class="minimal-footer-social-btn" aria-label="GitHub Repository">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            </a>
            <a href="/llms.txt" class="minimal-footer-social-btn" aria-label="LLM Discovery Manifest">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </a>
            <a href="/api/openapi.json" class="minimal-footer-social-btn" aria-label="OpenAPI 3.1 Specification">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </a>
          </div>
        </div>

        <div>
          <span class="minimal-footer-col-title">Directory</span>
          <div class="minimal-footer-links">
            <a href="/tool">All 50 Agent Tools</a>
            <a href="/capabilities">Capabilities Index</a>
            <a href="/#flow-showcase">8 Core AUS Utilities</a>
            <a href="/submit">Submit a Tool (Free)</a>
          </div>
        </div>

        <div>
          <span class="minimal-footer-col-title">Agent &amp; Machine Feeds</span>
          <div class="minimal-footer-links">
            <a href="/llms.txt">llms.txt Manifest</a>
            <a href="/llms-full.txt">llms-full.txt Catalog</a>
            <a href="/mcp.json">MCP Server Manifest</a>
            <a href="/mcp-actions.json">WebMCP Actions Spec</a>
            <a href="/agent-permissions.json">Agent Permissions</a>
            <a href="/api/tools">JSON Tools API</a>
            <a href="/api/feed.json">Syndication JSON Feed</a>
            <a href="/api/openapi.json">OpenAPI 3.1 Spec</a>
            <a href="/sitemap.xml">XML Sitemap</a>
          </div>
        </div>

        <div>
          <span class="minimal-footer-col-title">Policies &amp; Governance</span>
          <div class="minimal-footer-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/refund-policy">USDT Refund Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/health">Gateway Health Status</a>
          </div>
        </div>
      </div>

      <div class="minimal-footer-bottom">
        <div>&copy; ${escapeHtml(String(year))} AIPages.tech (2xcel). All rights reserved. Base Mainnet (Chain ID 8453).</div>
        <div class="minimal-footer-status">
          <span class="minimal-footer-status-dot"></span>
          <span>HTTP 402 USDT Settlement Gateway Online</span>
        </div>
      </div>
    </div>
  </footer>`;
}
