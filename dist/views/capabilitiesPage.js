import { deriveReliability } from "../types.js";
import { escapeHtml } from "./utils.js";
import { renderWebMcpRuntimeScript } from "./agentDiscovery.js";
import { SHARED_DESIGN_SYSTEM_CSS, renderSharedNavbar, renderSharedFooter, } from "./sharedLayout.js";
export const CAPABILITY_DESCRIPTIONS = {
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
    "web-scraping": "Structured web scraping, DOM bloat removal, and clean content extraction for AI agents.",
    "markdown-extraction": "Conversion of target web content into clean, token-optimized Markdown for LLM consumption.",
    "content-cleaning": "Removal of navigation menus, advertisements, cookie banners, and noise from web pages.",
    "token-optimization": "Minification and semantic trimming to maximize LLM context window efficiency.",
    "token-compression": "Deep semantic compression reducing token payloads by 60-80% without losing critical entities or numbers.",
    "context-optimization": "Algorithmic token budget enforcement and factual salience ranking for LLM prompt context.",
    "semantic-distillation": "High-entropy factual statement extraction and boilerplate removal for long context payloads.",
    "search-engine": "Search engine result page parsing, programmatic querying, and web indexing access.",
    "intent-extraction": "Automated semantic intent categorization across informational, commercial, and transactional search.",
    "json-payload": "Normalized structured JSON payloads designed for autonomous agent consumption.",
    "entity-aggregation": "Extraction, salience ranking, and aggregation of named entities across query topics.",
    "smart-contract": "EVM smart contract interaction, automated bytecode analysis, and ABI encoding.",
    "security-audit": "Automated vulnerability scanning, backdoors discovery, and contract threat detection.",
    "base-network": "Base L2 network RPC operations, gas telemetry, and on-chain verification services.",
    "risk-scoring": "Multi-vector probabilistic risk and safety scoring for decentralized agent operations.",
    "gas-routing": "Dynamic gas price estimation, fee tier calculation, and transaction priority routing.",
    "congestion-analysis": "Block utilization tracking, mempool congestion detection, and rollup overhead monitoring.",
    "fee-optimization": "Algorithmic fee minimization strategies for high-frequency autonomous agent transactions.",
    "code-execution": "Containerized multi-runtime code execution across isolated micro-VM environments.",
    "python-runtime": "Execution environment for Python agent scripts, data processing, and scientific packages.",
    "typescript": "Modern TypeScript and JavaScript engine for dynamic code evaluation and script tasks.",
    "secure-sandbox": "Zero-trust micro-VM sandbox with strict CPU ceilings, memory limits, and egress controls.",
    "github-api": "GitHub REST/GraphQL API integration for repository, PR, and commit automation.",
    "diff-analysis": "Unified git diff and patch parsing, AST change analysis, and semantic code review.",
    "codebase-health": "Automated analysis of repository test coverage, CI posture, license, and maintainability.",
    "executive-summary": "Distilled executive-level briefs synthesizing complex changes into actionable intelligence.",
    "lead-enrichment": "Deep firmographic profiling, revenue modeling, and tech stack intelligence for B2B domains.",
    "firmographics": "Company attributes including employee headcount, funding history, and headquarters location.",
    "crm-automation": "Programmatic payload sync and customer relationship management pipeline automation.",
    "contact-intelligence": "Department leadership identification, email pattern verification, and professional contacts.",
    "stealth-scraping": "Headless cloud scraping with TLS fingerprint rotation and anti-bot mitigation.",
    "anti-bot-bypass": "Autonomous bypass strategies for Cloudflare, DataDome, and anti-scraping fingerprinting.",
    "headless-extraction": "Dynamic single-page application rendering and token-optimized DOM extraction.",
    "omni-bridge": "Cross-chain routing and protocol abstraction for multi-network agent communications.",
    "multi-chain-discovery": "Automated discovery of agent endpoints, tools, and manifests across multiple EVM and L2 networks.",
    "capability-matching": "Semantic and schema-based capability matching pairing autonomous agent intents with verified endpoints.",
    "motion-stream": "Live frame-by-frame video synthesis and asset streaming pipeline for dynamic client UIs.",
    "video-rendering": "Deterministic serverless and headless video compilation engine for AI agents.",
    "frame-optimization": "Lossless image and motion frame compression for web video streaming.",
    "verification-ledger": "On-chain verifiable logging of agent execution events, proofs, and compliance checkpoints.",
    "cryptographic-logging": "SHA-256 and Merkle-tree rooted cryptographic event log generation for agent auditability.",
    "performance-resume": "Immutable on-chain track record recording uptime, success rate, and SLA metrics for autonomous agents.",
    "node-synchronizer": "Real-time peer-to-peer state synchronization across distributed agent registry nodes.",
    "schema-sync": "Bidirectional automated schema drift detection and synchronization for OpenAPI and MCP specs.",
    "cross-chain-manifests": "Multi-network manifest format standardizing agent tool discovery across L2 chains.",
    "render-engine": "Programmatic video compilation and asset rendering pipeline for generative media workflows.",
    "ad-generation": "Automated dynamic creative generation, rendering, and layout adaptation for marketing media.",
    "programmatic-video": "Frame-accurate timeline composition and automated video synthesis via code.",
    "telemetry-gateway": "High-throughput metrics and event ingestion gateway for autonomous agent swarms.",
    "execution-logging": "Structured telemetry and step-level execution capture for autonomous agent tasks.",
    "uptime-verification": "Synthetic heartbeat and cryptographic latency probing ensuring high availability SLAs.",
    "core-registrar": "Authoritative registry controller managing tool onboarding, namespace ownership, and DNS verification.",
    "tool-onboarding": "Automated validation, test invocation, and registry indexing for new agent capabilities.",
    "cryptographic-verification": "Public-key signature validation and EIP-712 manifest authenticity verification.",
    "settlement-gateway": "Low-latency x402 payment settlement gateway on Base L2 facilitating microtransactions.",
    "escrow-release": "Conditional escrow contract execution releasing funds upon verified cryptographic execution proofs.",
    "settlement-reconciliation": "Automated accounting and balance reconciliation for multi-currency micro-settlements.",
    "omni-mesh": "Decentralized peer-to-peer query mesh routing agent queries across resilient distributed nodes.",
    "query-routing": "Cost- and latency-optimized dynamic routing for multi-agent query distribution.",
    "swarm-coordination": "Decentralized orchestration primitives for coordinating multi-agent task swarms.",
    "motion-forge": "High-performance video production studio generating programmatic brand and motion assets.",
    "social-video": "Aspect-ratio-adaptive social video compilation optimized for TikTok, Reels, and YouTube Shorts.",
    "hardware-acceleration": "GPU-accelerated video rendering pipelines delivering real-time frame synthesis.",
    "execution-ledger": "Cryptographically verifiable double-entry log tracking all autonomous agent compute runs.",
    "audit-trail": "Immutable chronological audit logs for regulatory compliance and transaction auditing.",
    "cross-chain-audit": "Multi-chain state auditing validating cross-rollup message integrity and settlements.",
    "nexus-bridge": "Unified multi-protocol hub bridging HTTP, WebSocket, SSE, and Stdio agent communication.",
    "query-aggregation": "Parallel fan-out and reduce query aggregation engine across federated tool registries.",
    "workflow-indexing": "Topological indexing of multi-step agent DAG workflows for dependency resolution.",
    "settlement-audit": "Comprehensive on-chain transaction auditing ensuring accurate micro-settlement accounting.",
    "escrow-audit": "Smart contract escrow balance and release condition compliance auditing.",
    "transaction-verification": "Real-time block confirmation and receipt status verification on EVM networks.",
    "synapse-router": "Neural-inspired adaptive routing engine directing agent intents to lowest-latency tools.",
    "query-distribution": "Distributed load balancing dispersing agent requests across redundant backend clusters.",
    "dynamic-routing": "Real-time latency and health-aware query re-routing for fault-tolerant executions.",
    "motion-engine": "Core motion design runtime rendering React-based programmatic animations and transitions.",
    "composition-optimization": "Dependency tree shaking and asset pre-caching for real-time video compositions.",
    "web-video": "Lightweight browser-compatible MP4/WebM video compilation and streaming delivery.",
    "verification-node": "Dedicated consensus node validating agent task execution proofs and status claims.",
    "proof-synchronization": "Gossip protocol disseminating execution proofs across the decentralized verification network.",
    "audit-logging": "Tamper-evident write-once audit logging capturing all system administrative actions.",
    "matrix-gateway": "High-density cross-protocol routing matrix connecting heterogenous agent networks.",
    "cross-protocol-routing": "Seamless translation and proxying between MCP, REST, GraphQL, and JSON-RPC protocols.",
    "swarm-verification": "Quorum-based multi-agent consensus verification validating task outputs and conclusions.",
    "telemetry-pulse": "Periodic micro-telemetry beacons broadcasting node health, latency, and available capacity.",
    "uptime-auditing": "Continuous independent SLA monitoring verifying advertised tool availability and reliability.",
    "microservice-sync": "Automated service registry sync keeping multi-cloud microservice endpoints up to date.",
    "atlas-sync": "Geospatial and regional topology synchronization for geographically distributed agent clusters.",
    "spatial-indexing": "R-Tree and H3 spatial indexing for location-aware agent services and spatial queries.",
    "geographic-discovery": "Latency-minimized regional endpoint discovery routing queries to the closest physical zone.",
    "motion-pipeline": "Automated asset ingest, scene composition, and video delivery pipeline for content creators.",
    "micro-animations": "High-framerate micro-interaction rendering for agent chat interfaces and responsive UI components.",
    "asset-packaging": "Automated bundling and CDN distribution for agent-generated multimedia assets.",
    "settlement-verify": "Instant cryptographic validation of on-chain micro-settlement receipts and token transfers.",
    "ledger-validation": "Deterministic ledger replay and state verification preventing double-spend and balance drift.",
    "escrow-reconciliation": "Periodic delta auditing between smart contract escrow deposits and authorized releases.",
    "vector-index": "High-dimensional vector indexing enabling sub-millisecond semantic similarity search for tools.",
    "semantic-clustering": "Unsupervised embedding clustering grouping complementary tools into composable workflows.",
    "vector-sync": "Real-time embedding synchronization ensuring vector indexes reflect live registry updates.",
    "telemetry-verifier": "Cryptographic verification of reported execution telemetry, gas usage, and latency metrics.",
    "proof-of-execution": "Zero-knowledge and Merkle-proof verifiable evidence proving accurate tool task execution.",
    "cross-chain-microservices": "Portable microservice definitions executable across heterogeneous blockchain runtimes.",
    "settlement-ledger": "Specialized accounting ledger tracking real-time micro-settlements, fee splits, and payouts.",
    "cryptographic-auditing": "Automated zero-knowledge and signature audit verification for compliance frameworks.",
    "microservice-endpoints": "Standardized health-checked REST and MCP endpoints for autonomous microservices.",
};
/**
 * Aggregate all distinct capabilities across indexed tools with tool counts,
 * descriptions, and direct directory links.
 */
export function getCapabilityIndex(tools) {
    const capMap = new Map();
    for (const tool of tools) {
        if (tool.status === "rejected" || tool.status === "pending") {
            continue;
        }
        const caps = tool.capabilities && tool.capabilities.length > 0 ? tool.capabilities : [];
        const health = deriveReliability(tool);
        const isFirstParty = Boolean(tool.isFirstParty ??
            tool.developer?.isFirstParty ??
            tool.namespace?.startsWith("net.2xcel.aus"));
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
            if (!cap)
                continue;
            if (!capMap.has(cap)) {
                const desc = CAPABILITY_DESCRIPTIONS[cap] ||
                    tool.description ||
                    `Autonomous agent tools providing ${cap} functionality.`;
                capMap.set(cap, {
                    name: cap,
                    toolCount: 0,
                    description: desc,
                    directoryUrl: `/tool?capability=${encodeURIComponent(cap)}`,
                    tools: [],
                });
            }
            const summary = capMap.get(cap);
            summary.toolCount += 1;
            summary.tools.push(toolEntry);
        }
    }
    return Array.from(capMap.values()).sort((a, b) => {
        if (b.toolCount !== a.toolCount) {
            return b.toolCount - a.toolCount;
        }
        return a.name.localeCompare(b.name);
    });
}
/**
 * Render responsive HTML view for /capabilities page using the UI/UX Pro Max & 21st.dev design system.
 */
export function renderCapabilitiesPage(capabilities, totalToolsCount, baseUrl = "https://aipages.tech") {
    const normalizedBase = baseUrl.replace(/\/+$/, "");
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
            }
            else if (t.reliability === "degraded") {
                relBadgeClass = "badge-degraded";
                relLabel = "Degraded";
            }
            else if (t.reliability === "failing") {
                relBadgeClass = "badge-failing";
                relLabel = "Failing";
            }
            const priceDisplay = t.pricingModel === "free" || t.costPerCall === 0
                ? "Free"
                : `${t.costPerCall} USDT`;
            return `
            <a href="/tool/${encodeURIComponent(t.namespace)}" class="cap-tool-pill" title="${escapedNs}">
              <span class="cap-tool-name">${escapedToolName}</span>
              ${t.isFirstParty ? `<span class="badge-aus" title="First-Party AUS Tool">AUS</span>` : ""}
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
              <span class="cap-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              </span>
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
  <title>Tool Capabilities Index - AIPages Agent Tool Registry</title>
  <meta name="description" content="Explore autonomous agent tools by functional capability. Browse sanitized JSON schemas, auditing engines, oracles, sandboxes, and verification tools.">
  <link rel="canonical" href="https://aipages.tech/capabilities">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <link rel="alternate" type="text/markdown" title="Capabilities Index (Markdown)" href="/capabilities?format=md">
  <script type="application/ld+json">
${jsonLdScript}
  </script>
  <style>
    ${SHARED_DESIGN_SYSTEM_CSS}

    .hero {
      padding: 64px 0 36px;
      text-align: center;
      max-width: 820px;
      margin: 0 auto;
    }

    .hero-title {
      font-size: clamp(2.1rem, 4vw, 3.2rem);
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 14px;
    }

    .hero-subtitle {
      font-size: 1.08rem;
      color: var(--text-muted);
      line-height: 1.7;
    }

    /* 21st.dev #29870 Stats Block */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 24px 0 36px;
    }

    .stat-item {
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
    }

    .stat-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      color: var(--primary-bright);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.82rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 6px;
    }

    .filter-section {
      margin-bottom: 36px;
    }

    .search-input-wrapper {
      position: relative;
      max-width: 640px;
      margin: 0 auto;
    }

    .search-input {
      width: 100%;
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 15px 20px 15px 46px;
      color: #FFFFFF;
      font-size: 0.98rem;
      outline: none;
      transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }

    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
    }

    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--primary);
      pointer-events: none;
      display: flex;
    }

    .cap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 24px;
      margin-bottom: 64px;
    }

    .cap-card {
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 18px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: transform 0.18s ease, border-color 0.18s ease;
    }

    .cap-card:hover {
      transform: translateY(-2px);
      border-color: rgba(245, 158, 11, 0.4);
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
      gap: 10px;
    }

    .cap-icon {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: var(--primary-bright);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .cap-title {
      font-size: 1.18rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .cap-title a {
      color: #FFFFFF;
    }

    .cap-title a:hover {
      color: var(--primary-bright);
    }

    .cap-count-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary-bright);
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.32);
      padding: 4px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .cap-desc {
      font-size: 0.92rem;
      color: var(--text-muted);
      line-height: 1.6;
      flex: 1;
    }

    .cap-tools-section {
      background: #10131C;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 14px;
    }

    .cap-tools-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-bottom: 10px;
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
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      padding: 5px 11px;
      font-size: 0.78rem;
      color: #FFFFFF;
      text-decoration: none;
    }

    .cap-tool-pill:hover {
      border-color: var(--primary);
      text-decoration: none;
    }

    .cap-tool-name {
      font-weight: 600;
      color: #FFFFFF;
    }

    .badge-aus {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--primary-bright);
      background: rgba(245, 158, 11, 0.18);
      border-radius: 4px;
      padding: 1px 5px;
    }

    .cap-tool-price {
      font-size: 0.72rem;
      color: var(--text-muted);
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
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      padding-top: 14px;
    }

    .btn-browse {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--primary-bright);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 18px;
      display: none;
      margin-bottom: 64px;
    }

    @media (max-width: 768px) {
      .cap-grid,
      .stats-bar {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  ${renderSharedNavbar("capabilities", false)}

  <main class="container">
    <section class="hero">
      <h1 class="hero-title">AI Agent Tool Capabilities</h1>
      <p class="hero-subtitle">
        Browse and discover autonomous agent tools by functional capability.
        Filter directly into the directory to inspect schemas, live endpoints, and HTTP 402 USDT payment specifications.
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
      <form method="GET" action="/tool" class="search-input-wrapper" toolname="filter_tools_by_capability" tooldescription="Browse and filter autonomous AI agent tools by functional capability taxonomy." data-mcp-action="filter-capabilities">
        <span class="search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <label for="cap-filter" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;">Filter capabilities (e.g. audit, schema, geo, reason)</label>
        <input
          type="text"
          id="cap-filter"
          name="capability"
          class="search-input"
          aria-label="Filter capabilities (e.g. audit, schema, geo, reason)"
          toolparamdescription="Functional capability tag to filter tools by (e.g. schema-sanitization, financial-audit, geospatial)"
          placeholder="Filter capabilities (e.g. audit, schema, geo, reason)..."
          autocomplete="off"
        >
      </form>
    </div>

    <div class="cap-grid" id="cap-grid">
      ${cardsHtml}
    </div>

    <div class="empty-state" id="empty-state">
      <div class="empty-icon" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>
      <h3 class="empty-title">No matching capabilities found</h3>
      <p class="empty-desc">Try searching for terms like "audit", "sanitizer", "oracle", or "code".</p>
    </div>
  </main>

  ${renderSharedFooter()}

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
  ${renderWebMcpRuntimeScript({ pageType: "capabilities" })}
</body>
</html>`;
}
/**
 * Generate a token-budgeted clean Markdown representation of the Capabilities Index
 * for AI crawlers and agents requesting /capabilities?format=md or Accept: text/markdown.
 */
export function generateCapabilitiesMarkdown(capabilities, totalToolsCount, baseUrl = "https://aipages.tech") {
    const normalizedBase = baseUrl.replace(/\/+$/, "");
    const lines = [
        "# AIPages Functional Capabilities Index",
        "",
        `> Machine-readable capability taxonomy indexing ${capabilities.length} distinct capabilities across ${totalToolsCount} verified autonomous agent tools.`,
        "",
        "## Capabilities Taxonomy",
        "",
    ];
    for (const cap of capabilities) {
        const toolNames = cap.tools
            .map((t) => `[${t.name}](${normalizedBase}/tool/${t.namespace})`)
            .join(", ");
        lines.push(`- **[${cap.name}](${normalizedBase}${cap.directoryUrl})** (${cap.toolCount} ${cap.toolCount === 1 ? "tool" : "tools"}): ${cap.description} Tools: ${toolNames}`);
    }
    lines.push("");
    return lines.join("\n");
}
//# sourceMappingURL=capabilitiesPage.js.map