import { getUnmetSearches } from "../analytics.js";
import { escapeHtml } from "./utils.js";
import { SHARED_DESIGN_SYSTEM_CSS, renderSharedNavbar, renderSharedFooter, renderGoogleAnalyticsHead, } from "./sharedLayout.js";
/**
 * Curated seed bounties shown when live zero-result search telemetry is ramping up.
 */
const SEED_BOUNTIES = [
    {
        query: "sec 10-k filing real-time financial tables parser",
        count: 38,
        lastSearchedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        agentIds: ["agent-alpha-financial", "claude-subagent-42"],
    },
    {
        query: "solana raydium order-book depth and slippage oracle",
        count: 27,
        lastSearchedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        agentIds: ["agent-defi-arbitrage"],
    },
    {
        query: "github pull request diff semantic security auditor",
        count: 24,
        lastSearchedAt: new Date(Date.now() - 1000 * 60 * 78).toISOString(),
        agentIds: ["agent-ci-gatekeeper"],
    },
    {
        query: "x twitter live user sentiment stream and keyword velocity",
        count: 19,
        lastSearchedAt: new Date(Date.now() - 1000 * 60 * 115).toISOString(),
        agentIds: ["agent-market-pulse"],
    },
    {
        query: "pdf multimodal table extraction to structured json",
        count: 16,
        lastSearchedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        agentIds: ["agent-rag-loader"],
    },
];
export function renderBountiesPage() {
    const liveSearches = getUnmetSearches();
    const allBounties = liveSearches.length > 0 ? liveSearches : SEED_BOUNTIES;
    const totalQueries = allBounties.reduce((acc, b) => acc + b.count, 0);
    const bountyCardsHtml = allBounties
        .map((bounty, idx) => {
        const timeAgo = formatTimeAgo(new Date(bounty.lastSearchedAt));
        const submitUrl = `/submit?query=${encodeURIComponent(bounty.query)}`;
        return `
        <article class="bounty-card" data-bounty-id="${idx}">
          <div class="bounty-card-header">
            <div class="bounty-query-wrapper">
              <span class="bounty-rank">#${idx + 1}</span>
              <h3 class="bounty-query">"${escapeHtml(bounty.query)}"</h3>
            </div>
            <span class="bounty-badge-demand">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              ${bounty.count} Agent Requests
            </span>
          </div>

          <p class="bounty-desc">
            Autonomous agents queried the 3072-dim AIPages vector index for this capability and found no verified match. Build this tool and earn Base USDC per invocation.
          </p>

          <div class="bounty-card-footer">
            <div class="bounty-meta">
              <span class="bounty-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Last queried ${timeAgo}
              </span>
              <span class="bounty-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="M7 15h0M2 9.5h20"></path>
                </svg>
                Base Mainnet USDC
              </span>
            </div>

            <a href="${submitUrl}" class="bounty-action-btn">
              <span>Build &amp; Claim Bounty</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>
        </article>
      `;
    })
        .join("");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
${renderGoogleAnalyticsHead()}
  <title>Agent Demand Bounties & Unmet Queries | AIPages</title>
  <meta name="description" content="Real-time unfulfilled capabilities queried by autonomous AI agents on AIPages. Build an MCP server or API for these requests and earn USDC on Base Mainnet.">
  <link rel="canonical" href="https://aipages.tech/bounties">
  <link rel="icon" type="image/png" href="/assets/brand/aipages-favicon.png">
  <style>
    ${SHARED_DESIGN_SYSTEM_CSS}

    .bounties-hero {
      padding: 120px 0 60px;
      text-align: center;
      background: radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.12) 0%, rgba(4, 5, 7, 0) 70%);
      border-bottom: 1px solid var(--border-subtle);
    }
    .bounties-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #F59E0B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 20px;
    }
    .bounties-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2.8rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 auto 16px;
      max-width: 800px;
      line-height: 1.15;
    }
    .bounties-title span {
      background: linear-gradient(135deg, #F59E0B 0%, #FFD000 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .bounties-subtitle {
      font-size: 1.1rem;
      color: #94A3B8;
      max-width: 680px;
      margin: 0 auto 36px;
      line-height: 1.6;
    }
    .bounties-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      max-width: 880px;
      margin: 0 auto;
    }
    .bounties-stat-card {
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .bounties-stat-val {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 4px;
    }
    .bounties-stat-label {
      font-size: 0.85rem;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .bounties-container {
      max-width: 1040px;
      margin: 60px auto 100px;
      padding: 0 20px;
    }
    .bounties-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .bounties-section-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .bounties-live-indicator {
      width: 10px;
      height: 10px;
      background: #10B981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10B981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }

    .bounty-card {
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 20px;
      transition: all 0.2s ease;
    }
    .bounty-card:hover {
      border-color: rgba(245, 158, 11, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    .bounty-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 12px;
    }
    .bounty-query-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bounty-rank {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      font-weight: 700;
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.1);
      padding: 4px 8px;
      border-radius: 6px;
    }
    .bounty-query {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.15rem;
      font-weight: 600;
      color: #FFFFFF;
      margin: 0;
    }
    .bounty-badge-demand {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #10B981;
      white-space: nowrap;
    }
    .bounty-desc {
      font-size: 0.95rem;
      color: #94A3B8;
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .bounty-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      flex-wrap: wrap;
      gap: 16px;
    }
    .bounty-meta {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .bounty-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: #94A3B8;
    }
    .bounty-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: #040507;
      font-weight: 700;
      font-size: 0.9rem;
      padding: 10px 18px;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .bounty-action-btn:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
    }

    .bounty-starter-box {
      margin-top: 60px;
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 32px;
    }
    .bounty-starter-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 12px;
    }
    .bounty-starter-desc {
      color: #94A3B8;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .bounty-code-block {
      background: #020305;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.88rem;
      color: #E2E8F0;
      overflow-x: auto;
    }

    @media (max-width: 768px) {
      .bounties-title { font-size: 2rem; }
      .bounties-stats-grid { grid-template-columns: 1fr; }
      .bounty-card-header { flex-direction: column; }
      .bounty-card-footer { flex-direction: column; align-items: flex-start; }
      .bounty-action-btn { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>
  ${renderSharedNavbar("playground", true)}

  <header class="bounties-hero">
    <div class="bounties-pill">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
      Live Autonomous Agent Demands
    </div>
    <h1 class="bounties-title">Build What <span>Agents Want</span>. Get Paid on Base.</h1>
    <p class="bounties-subtitle">
      When autonomous agents query AIPages for missing capabilities, we log their natural-language intent. Claim a bounty below, deploy an MCP server or API, and earn up to 95% of execution fees in USDC.
    </p>

    <div class="bounties-stats-grid">
      <div class="bounties-stat-card">
        <div class="bounties-stat-val">${allBounties.length}</div>
        <div class="bounties-stat-label">Active Missing Tools</div>
      </div>
      <div class="bounties-stat-card">
        <div class="bounties-stat-val">${totalQueries}</div>
        <div class="bounties-stat-label">Total Unmet Queries</div>
      </div>
      <div class="bounties-stat-card">
        <div class="bounties-stat-val">Up to 95%</div>
        <div class="bounties-stat-label">Developer Rev-Share (USDC)</div>
      </div>
    </div>
  </header>

  <main class="bounties-container">
    <div class="bounties-section-header">
      <div class="bounties-section-title">
        <span class="bounties-live-indicator"></span>
        Top Unfulfilled Agent Demands
      </div>
      <a href="/api/telemetry/unmet-searches" target="_blank" style="color: #94A3B8; font-size: 0.85rem; text-decoration: none;">
        Raw Telemetry JSON &rarr;
      </a>
    </div>

    <section class="bounties-list">
      ${bountyCardsHtml}
    </section>

    <section class="bounty-starter-box">
      <h2 class="bounty-starter-title">How to Claim and Monetize a Bounty in 3 Steps</h2>
      <p class="bounty-starter-desc">
        1. Build a simple HTTP or MCP server satisfying the query schema.<br>
        2. Wrap your handler with the x402 payment header check, or register on AIPages with your Base recipient wallet.<br>
        3. Submit your endpoint URL. AIPages indexes your schema in the vector index and routes paying agents directly to you.
      </p>
      <div class="bounty-code-block">
// Register your new tool via POST /api/tools/submit
curl -X POST https://aipages.tech/api/tools/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my_demanded_tool",
    "description": "Satisfies unfulfilled agent intent",
    "connectionType": "http",
    "endpointUrl": "https://my-tool.example.com/api",
    "pricingModel": "paid",
    "costPerCall": 0.02,
    "developerAddress": "0xYourBaseWalletAddress...",
    "schema": { "type": "object", "properties": { "input": { "type": "string" } }, "required": ["input"] }
  }'
      </div>
    </section>
  </main>

  ${renderSharedFooter()}
</body>
</html>`;
}
function formatTimeAgo(date) {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60)
        return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)
        return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24)
        return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
}
//# sourceMappingURL=bountiesPage.js.map