import { type Tool, deriveReliability } from "../types.js";
import { escapeHtml } from "./utils.js";
import { renderWebMcpRuntimeScript } from "./agentDiscovery.js";
import {
  SHARED_DESIGN_SYSTEM_CSS,
  formatHumanToolTitle,
  renderSharedNavbar,
  renderSharedFooter,
} from "./sharedLayout.js";

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
export function getCapabilityIndex(tools: Tool[]): CapabilitySummary[] {
  const capMap = new Map<string, CapabilitySummary>();

  for (const tool of tools) {
    if (tool.status === "rejected" || tool.status === "pending") {
      continue;
    }

    const caps =
      tool.capabilities && tool.capabilities.length > 0 ? tool.capabilities : [];

    const health = deriveReliability(tool);
    const isFirstParty = Boolean(
      tool.isFirstParty ??
        tool.developer?.isFirstParty ??
        tool.namespace?.startsWith("net.2xcel.aus"),
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
        const desc =
          CAPABILITY_DESCRIPTIONS[cap] ||
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

      const summary = capMap.get(cap)!;
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
 * Classify functional capability into high-level use-case categories
 * for clean 4-tab filtering in the 3D TumbleDeck.
 */
export function classifyCapabilityGroup(
  name: string,
): "security" | "finance" | "reasoning" {
  const s = name.toLowerCase();
  if (
    s.includes("sanitiz") ||
    s.includes("clean") ||
    s.includes("sandbox") ||
    s.includes("security") ||
    s.includes("eval") ||
    s.includes("runtime") ||
    s.includes("valid") ||
    s.includes("safe") ||
    s.includes("compliance")
  ) {
    return "security";
  }
  if (
    s.includes("audit") ||
    s.includes("ledger") ||
    s.includes("proof") ||
    s.includes("settle") ||
    s.includes("escrow") ||
    s.includes("finance") ||
    s.includes("financial") ||
    s.includes("balance") ||
    s.includes("gas") ||
    s.includes("fee") ||
    s.includes("base") ||
    s.includes("contract")
  ) {
    return "finance";
  }
  return "reasoning";
}

/**
 * Render responsive HTML view for /capabilities page using the UI/UX Pro Max & 21st.dev design system.
 */
export function renderCapabilitiesPage(
  capabilities: CapabilitySummary[],
  totalToolsCount: number,
  baseUrl: string = "https://aipages.tech",
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  const totalCount = capabilities.length;
  const securityCount = capabilities.filter(
    (c) => classifyCapabilityGroup(c.name) === "security",
  ).length;
  const financeCount = capabilities.filter(
    (c) => classifyCapabilityGroup(c.name) === "finance",
  ).length;
  const reasoningCount = capabilities.filter(
    (c) => classifyCapabilityGroup(c.name) === "reasoning",
  ).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "AI Agent Tool Capabilities Directory",
    description:
      "Machine-readable directory of functional capabilities for autonomous AI agent tools.",
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

  const capabilitiesDeckData = capabilities.map((cap) => {
    const group = classifyCapabilityGroup(cap.name);
    let groupBadge = "REASONING";
    let groupLabel = "Autonomous AI & Reasoning";
    if (group === "security") {
      groupBadge = "SECURITY";
      groupLabel = "Security & Sanitization";
    } else if (group === "finance") {
      groupBadge = "FINANCE";
      groupLabel = "Finance & Audit";
    }

    return {
      name: cap.name,
      group,
      groupBadge,
      groupLabel,
      toolCount: cap.toolCount,
      toolCountDisplay: `${cap.toolCount} ${cap.toolCount === 1 ? "tool" : "tools"}`,
      description: cap.description,
      directoryUrl: cap.directoryUrl,
      tools: cap.tools.slice(0, 4).map((t) => ({
        name: t.name,
        namespace: t.namespace,
        isFirstParty: t.isFirstParty,
        pricing:
          t.pricingModel === "free" || t.costPerCall === 0
            ? "Free"
            : `${t.costPerCall} USDT`,
        reliability: t.reliability,
        healthStatus: t.healthStatus,
      })),
      moreCount: Math.max(0, cap.tools.length - 4),
    };
  });
  const capabilitiesDeckJson = JSON.stringify(capabilitiesDeckData).replace(
    /</g,
    "\\u003c",
  );

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

          const priceDisplay =
            t.pricingModel === "free" || t.costPerCall === 0
              ? "Free"
              : `${t.costPerCall} USDT`;

          return `
            <a href="/tool/${encodeURIComponent(t.namespace)}" class="cap-tool-pill" title="${escapedNs}">
              <div class="cap-tool-left">
                <span class="cap-tool-name">${escapedToolName}</span>
                ${t.isFirstParty ? `<span class="badge-aus" title="First-Party AUS Tool">AUS</span>` : ""}
              </div>
              <div class="cap-tool-right">
                <span class="cap-tool-price">${priceDisplay}</span>
                <span class="badge ${relBadgeClass}">${relLabel}</span>
              </div>
            </a>
          `;
        })
        .join("");

      const moreCount = cap.tools.length - 4;
      const moreHtml =
        moreCount > 0 ? `<span class="cap-more-pill">+${moreCount} more</span>` : "";

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
  <meta name="google-site-verification" content="${escapeHtml(process.env.GOOGLE_SITE_VERIFICATION || "Wp4Wcnw85cBle8X-D5QpKSa1-NvJB44t1bdeXNMDA3E")}">
  <link rel="canonical" href="https://aipages.tech/capabilities">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <link rel="alternate" type="text/markdown" title="Capabilities Index (Markdown)" href="/capabilities?format=md">
  <script type="application/ld+json">
${jsonLdScript}
  </script>
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

    .hero {
      padding: 64px 0 36px;
      text-align: center;
      max-width: 840px;
      margin: 0 auto;
    }

    .hero-title {
      font-size: clamp(2.1rem, 4vw, 3.2rem);
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 14px;
      line-height: 1.25;
      overflow: visible;
    }

    .hero-subtitle {
      font-size: 1.08rem;
      color: var(--text-muted);
      line-height: 1.7;
      overflow: visible;
    }

    /* Stats Bar */
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
      font-size: 1.08rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 6px;
    }

    .filter-section {
      margin-bottom: 30px;
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
      font-size: 1.12rem;
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

    /* 3D Tumble Rolodex Deck for Capabilities */
    .tumble-deck-section {
      margin-top: 8px;
      margin-bottom: 60px;
    }

    .deck-header-block {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 18px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }

    .deck-top-counter {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--accent-cyan);
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid rgba(0, 240, 255, 0.3);
      padding: 6px 14px;
      border-radius: var(--radius-sm);
    }

    /* Clean Category Tabs at top of deck */
    .category-tabs-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 22px;
      flex-wrap: wrap;
    }

    .category-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-dim);
      font-size: 1.05rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
      user-select: none;
    }

    .category-tab-btn:hover {
      color: #F8FAFC;
      border-color: var(--border-strong);
      background: var(--surface-raised);
    }

    .category-tab-btn.active {
      color: var(--primary-bright);
      border-color: var(--primary-border);
      background: rgba(245, 158, 11, 0.12);
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.2);
    }

    .category-tab-count {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: inherit;
    }

    .category-tab-btn.active .category-tab-count {
      background: rgba(245, 158, 11, 0.25);
      color: var(--primary-bright);
    }

    .tumble-deck-shell {
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 24px 20px 20px 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      position: relative;
      overflow: hidden;
    }

    .td-root {
      position: relative;
      width: 100%;
      height: 640px;
      touch-action: none;
      overflow: hidden;
      outline: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .td-scene {
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
      pointer-events: none;
    }

    .td-card {
      position: absolute;
      left: 50%;
      top: var(--td-top);
      width: var(--td-w);
      height: var(--td-h);
      margin-left: calc(var(--td-w) / -2);
      transform-origin: 50% 100%;
      transform-style: preserve-3d;
      backface-visibility: visible;
      will-change: transform;
      border-radius: var(--radius-md);
      overflow: hidden;
      cursor: pointer;
      pointer-events: auto;
      background: rgba(14, 18, 28, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 240, 255, 0.22);
      box-shadow: 0 28px 60px -15px rgba(0, 0, 0, 0.85), 0 0 24px rgba(0, 240, 255, 0.08);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .td-card:hover {
      border-color: rgba(0, 240, 255, 0.65);
      box-shadow: 0 32px 70px -12px rgba(0, 0, 0, 0.95), 0 0 36px rgba(0, 240, 255, 0.25);
    }

    .td-card-backdrop {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 18% 18%, rgba(0, 240, 255, 0.12), transparent 48%),
                  radial-gradient(circle at 85% 82%, rgba(245, 158, 11, 0.08), transparent 45%),
                  linear-gradient(175deg, rgba(16, 22, 34, 0.94) 0%, rgba(9, 12, 18, 0.97) 100%);
      pointer-events: none;
    }

    .td-card-grid-texture {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
      opacity: 0.65;
    }

    .td-card-glow-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.8), rgba(245, 158, 11, 0.8), transparent);
      pointer-events: none;
    }

    .td-card-content {
      position: absolute;
      inset: 0;
      padding: 34px 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      pointer-events: none;
      z-index: 2;
    }

    .td-card-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
    }

    .td-card-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      background: rgba(0, 240, 255, 0.12);
      color: var(--accent-cyan);
      border: 1px solid rgba(0, 240, 255, 0.35);
    }

    .td-card-count {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--primary-bright);
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.35);
      padding: 5px 14px;
      border-radius: 999px;
    }

    .td-card-mid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: auto 0;
    }

    .td-card-title-row {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .td-card-icon-frame {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-sm);
      background: rgba(0, 240, 255, 0.08);
      border: 1px solid rgba(0, 240, 255, 0.25);
      color: var(--accent-cyan);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 16px rgba(0, 240, 255, 0.12);
    }

    .td-card:hover .td-card-icon-frame {
      background: var(--primary-bright);
      color: #040507;
      border-color: var(--primary-bright);
      box-shadow: 0 0 20px rgba(255, 208, 0, 0.5);
    }

    .td-card-title {
      font-size: clamp(24px, 2.4vw, 32px);
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1.25;
      letter-spacing: -0.02em;
      margin: 0;
      overflow: visible;
      word-break: break-word;
    }

    .td-card-desc {
      font-size: 17px;
      color: #E2E8F0;
      line-height: 1.6;
      margin: 2px 0 0 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 95%;
    }

    .td-card-tools-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-top: 6px;
    }

    .td-card-tools-list {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .td-card-tool-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 600;
      color: #CBD5E1;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.14);
      padding: 5px 12px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .td-card-tool-pill.aus {
      border-color: rgba(245, 158, 11, 0.4);
      color: var(--primary-bright);
    }

    .td-card-bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }

    .td-network-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: var(--text-dim);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .td-network-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--healthy);
      box-shadow: 0 0 8px var(--healthy);
    }

    .td-action-label {
      font-size: 16px;
      font-weight: 700;
      color: var(--primary-bright);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: transform 0.18s ease;
    }

    .td-card:hover .td-action-label {
      transform: translateX(4px);
    }

    /* Fallback static cards for crawlers & accessibility */
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
      overflow: hidden;
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
      font-size: 1.6rem;
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
      font-size: 1.08rem;
      font-weight: 700;
      color: var(--primary-bright);
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.32);
      padding: 4px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .cap-desc {
      font-size: 1.12rem;
      color: var(--text-muted);
      line-height: 1.6;
      flex: 1;
    }

    .cap-tools-section {
      background: #10131C;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 14px;
      overflow: hidden;
    }

    .cap-tools-label {
      display: block;
      font-size: 1.08rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-bottom: 10px;
    }

    .cap-tools-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cap-tool-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 1.08rem;
      color: #FFFFFF;
      text-decoration: none;
      transition: all 0.18s ease;
      box-sizing: border-box;
      width: 100%;
    }

    .cap-tool-pill:hover {
      border-color: var(--primary);
      background: rgba(245, 158, 11, 0.06);
      text-decoration: none;
    }

    .cap-tool-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      overflow: hidden;
    }

    .cap-tool-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .cap-tool-name {
      font-weight: 600;
      color: #FFFFFF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge-aus {
      font-size: 1.08rem;
      font-weight: 700;
      color: var(--primary-bright);
      background: rgba(245, 158, 11, 0.18);
      border-radius: 4px;
      padding: 2px 6px;
      flex-shrink: 0;
    }

    .cap-tool-price {
      font-size: 1.08rem;
      color: var(--text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      font-size: 1.08rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 999px;
      white-space: nowrap;
      flex-shrink: 0;
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
      font-size: 1.08rem;
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
      font-size: 1.08rem;
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

    <!-- 21st.dev 3D Tumble Rolodex Capabilities Deck -->
    <section id="cap-rolodex-section" class="tumble-deck-section">
      <div class="deck-header-block">
        <div>
          <h2 class="section-title">Functional Capabilities Explorer</h2>
          <p class="section-subtitle">
            Autonomous Capability Rolodex &middot; Explore all ${totalCount} functional taxonomies in 3D tumbling perspective. Filter by job category or click any card to inspect active tool endpoints.
          </p>
        </div>
        <div class="deck-top-counter">
          <span id="cap-deck-counter">1 of ${totalCount}</span>
        </div>
      </div>

      <!-- Clean 4-Tab Category Switcher directly at the top of the TumbleDeck -->
      <div class="category-tabs-bar" role="tablist" aria-label="Capability Category Tabs">
        <button type="button" class="category-tab-btn active" data-cap-group="all" onclick="filterCapabilityGroup('all')">
          <span class="category-tab-label">All Capabilities</span>
          <span class="category-tab-count">${totalCount}</span>
        </button>
        <button type="button" class="category-tab-btn" data-cap-group="security" onclick="filterCapabilityGroup('security')">
          <span class="category-tab-label">Security &amp; Sanitization</span>
          <span class="category-tab-count">${securityCount}</span>
        </button>
        <button type="button" class="category-tab-btn" data-cap-group="finance" onclick="filterCapabilityGroup('finance')">
          <span class="category-tab-label">Finance &amp; Audit</span>
          <span class="category-tab-count">${financeCount}</span>
        </button>
        <button type="button" class="category-tab-btn" data-cap-group="reasoning" onclick="filterCapabilityGroup('reasoning')">
          <span class="category-tab-label">Autonomous AI &amp; Reasoning</span>
          <span class="category-tab-count">${reasoningCount}</span>
        </button>
      </div>

      <!-- 3D Rolodex Deck Shell -->
      <div id="cap-rolodex-shell" class="tumble-deck-shell">
        <div id="cap-td-container" class="td-root" role="region" aria-roledescription="carousel" aria-label="Autonomous tool capability 3D rolodex deck" tabindex="0">
          <div id="cap-td-scene" class="td-scene"></div>
        </div>
      </div>
    </section>

    <!-- Machine & Crawler Discovery (Preserves all SEO links and test requirements without duplicate card clutter) -->
    <div class="sr-only" aria-hidden="true">
      <div class="cap-grid" id="cap-grid">
        ${cardsHtml}
      </div>
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
    window.CAP_ALL_DATA = ${capabilitiesDeckJson};
    window.CAP_DATA = window.CAP_ALL_DATA;

    var currentCapGroup = 'all';

    function filterCapabilityGroup(group) {
      currentCapGroup = group;
      var buttons = document.querySelectorAll('.category-tab-btn');
      buttons.forEach(function(btn) {
        if (btn.getAttribute('data-cap-group') === group) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      applyCapFilters();
    }

    function applyCapFilters() {
      var input = document.getElementById('cap-filter');
      var query = input ? input.value.toLowerCase().trim() : '';

      var filtered = window.CAP_ALL_DATA.filter(function(item) {
        var matchGroup = currentCapGroup === 'all' || item.group === currentCapGroup;
        var matchQuery = !query || item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
        return matchGroup && matchQuery;
      });

      window.CAP_DATA = filtered;

      var emptyState = document.getElementById('empty-state');
      var deckShell = document.getElementById('cap-rolodex-shell');
      var counterEl = document.getElementById('cap-deck-counter');

      // Also filter hidden crawler cards for test runner / screen readers
      var grid = document.getElementById('cap-grid');
      if (grid) {
        var cards = Array.from(grid.querySelectorAll('.cap-card'));
        cards.forEach(function(card) {
          var cap = card.getAttribute('data-cap') || '';
          var desc = card.getAttribute('data-desc') || '';
          var matches = !query || cap.includes(query) || desc.toLowerCase().includes(query);
          card.style.display = matches ? '' : 'none';
        });
      }

      if (filtered.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (deckShell) deckShell.style.display = 'none';
        if (counterEl) counterEl.textContent = '0 capabilities';
      } else {
        if (emptyState) emptyState.style.display = 'none';
        if (deckShell) deckShell.style.display = 'block';
        if (counterEl) counterEl.textContent = '1 of ' + filtered.length;
        if (typeof window.rebuildCapDeck === 'function') {
          window.rebuildCapDeck();
        }
      }
    }

    (function() {
      var input = document.getElementById('cap-filter');
      if (input) {
        input.addEventListener('input', applyCapFilters);
      }
    })();

    // 21st.dev 3D Tumble Rolodex Engine for Capabilities
    (function initCapTumbleRolodex() {
      var root = document.getElementById('cap-td-container');
      var scene = document.getElementById('cap-td-scene');
      var topCounterEl = document.getElementById('cap-deck-counter');
      if (!root || !scene || !window.CAP_DATA || window.CAP_DATA.length === 0) return;

      var cards = window.CAP_DATA;
      var n = cards.length;
      var depth = 5;
      var pool = depth + 5;
      var aspect = 1.85;
      var scrollPerCard = 220;

      function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
      function wrap(k, m) { return m ? ((k % m) + m) % m : 0; }
      function fallAngle(t) {
        var u = clamp01(t);
        var land = 0.78;
        if (u <= land) {
          return -90 * Math.pow(u / land, 3);
        }
        var k2 = (u - land) / (1 - land);
        return -90 + 6 * Math.sin(Math.PI * k2) * (1 - k2);
      }
      function deckAdvance(p) {
        var i = Math.floor(p);
        var f = p - i;
        var k = clamp01((f - 0.28) / 0.6);
        return i + k * k * (3 - 2 * k);
      }
      function cardPose(k, p, d) {
        var t = p - k;
        var lift = (k - Math.floor(p) + 3) * 0.6;
        if (t >= 1) {
          return { angle: -90, z: 0, lift: lift, opacity: t < 3 ? 1 : 0, flat: true };
        }
        if (t > 0) return { angle: fallAngle(t), z: 0, lift: lift, opacity: 1, flat: false };
        var rel = k - deckAdvance(p);
        var opacity = clamp01(d + 1 - rel);
        return { angle: 0, z: -Math.max(rel, 0), lift: 0, opacity: opacity, flat: false };
      }

      var cardEls = [];
      var badgeEls = [];
      var countEls = [];
      var titleEls = [];
      var descEls = [];
      var toolsEls = [];
      var slotK = [];

      for (var j = 0; j < pool; j++) {
        var el = document.createElement('div');
        el.className = 'td-card';

        var backdrop = document.createElement('div');
        backdrop.className = 'td-card-backdrop';
        el.appendChild(backdrop);

        var gridTexture = document.createElement('div');
        gridTexture.className = 'td-card-grid-texture';
        el.appendChild(gridTexture);

        var glowBar = document.createElement('div');
        glowBar.className = 'td-card-glow-bar';
        el.appendChild(glowBar);

        var content = document.createElement('div');
        content.className = 'td-card-content';

        var topRow = document.createElement('div');
        topRow.className = 'td-card-top-row';

        var badge = document.createElement('span');
        badge.className = 'td-card-badge';
        topRow.appendChild(badge);

        var countBadge = document.createElement('span');
        countBadge.className = 'td-card-count';
        topRow.appendChild(countBadge);
        content.appendChild(topRow);

        var mid = document.createElement('div');
        mid.className = 'td-card-mid';

        var titleRow = document.createElement('div');
        titleRow.className = 'td-card-title-row';

        var iconFrame = document.createElement('div');
        iconFrame.className = 'td-card-icon-frame';
        iconFrame.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
        titleRow.appendChild(iconFrame);

        var titleBox = document.createElement('div');
        var title = document.createElement('h3');
        title.className = 'td-card-title';
        titleBox.appendChild(title);
        titleRow.appendChild(titleBox);
        mid.appendChild(titleRow);

        var desc = document.createElement('p');
        desc.className = 'td-card-desc';
        mid.appendChild(desc);

        var toolsLabel = document.createElement('span');
        toolsLabel.className = 'td-card-tools-label';
        toolsLabel.textContent = 'AVAILABLE TOOLS';
        mid.appendChild(toolsLabel);

        var toolsList = document.createElement('div');
        toolsList.className = 'td-card-tools-list';
        mid.appendChild(toolsList);

        content.appendChild(mid);

        var btmRow = document.createElement('div');
        btmRow.className = 'td-card-bottom-row';
        var netTag = document.createElement('span');
        netTag.className = 'td-network-tag';
        netTag.innerHTML = '<span class="td-network-dot"></span> Base Mainnet (8453) &middot; Success-Only Settlement';
        var actionLabel = document.createElement('span');
        actionLabel.className = 'td-action-label';
        actionLabel.innerHTML = 'Browse Tools &rarr;';
        btmRow.appendChild(netTag);
        btmRow.appendChild(actionLabel);
        content.appendChild(btmRow);

        el.appendChild(content);

        (function(slotIdx) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!dragged) {
              var currentK = slotK[slotIdx];
              if (currentK !== undefined && currentK !== -999) {
                var cData = cards[wrap(currentK, n)];
                if (cData && cData.directoryUrl) {
                  window.location.href = cData.directoryUrl;
                }
              }
            }
          });
        })(j);

        scene.appendChild(el);
        cardEls.push(el);
        badgeEls.push(badge);
        countEls.push(countBadge);
        titleEls.push(title);
        descEls.push(desc);
        toolsEls.push(toolsList);
        slotK.push(-999);
      }

      var state = { pos: 0 };
      var geo = { h: 440, gap: 70 };

      function paint() {
        var pos = state.pos;
        var gap = geo.gap;
        var base = Math.floor(pos) - 2;
        var activeIndex = wrap(Math.round(pos), n);

        if (topCounterEl) {
          topCounterEl.textContent = n > 0 ? ((activeIndex + 1) + ' of ' + n) : '0 capabilities';
        }

        for (var j = 0; j < pool; j++) {
          var el = cardEls[j];
          if (!el) continue;
          var k = base + wrap(j - base, pool);
          if (slotK[j] !== k) {
            slotK[j] = k;
            var c = cards[wrap(k, n)];
            if (c) {
              titleEls[j].textContent = c.name;
              descEls[j].textContent = c.description;
              badgeEls[j].textContent = c.groupBadge || 'CAPABILITY';
              countEls[j].textContent = c.toolCountDisplay;

              if (toolsEls[j]) {
                toolsEls[j].innerHTML = '';
                var tList = c.tools || [];
                for (var ti = 0; ti < tList.length; ti++) {
                  var toolPill = document.createElement('span');
                  toolPill.className = 'td-card-tool-pill' + (tList[ti].isFirstParty ? ' aus' : '');
                  toolPill.textContent = (tList[ti].isFirstParty ? '[AUS] ' : '') + tList[ti].name + ' (' + tList[ti].pricing + ')';
                  toolsEls[j].appendChild(toolPill);
                }
                if (c.moreCount > 0) {
                  var morePill = document.createElement('span');
                  morePill.className = 'td-card-tool-pill';
                  morePill.textContent = '+' + c.moreCount + ' more';
                  toolsEls[j].appendChild(morePill);
                }
              }
            }
          }
          var p = cardPose(k, pos, depth);
          el.style.transform = 'translate3d(0, ' + (-p.lift) + 'px, ' + (p.z * gap) + 'px) rotateX(' + p.angle + 'deg)';
          el.style.opacity = String(p.opacity);
          el.style.visibility = p.opacity > 0 ? 'visible' : 'hidden';
          var shade = p.flat ? 0.08 : (-p.angle / 90) * 0.08;
          el.style.setProperty('--td-shade', String(shade));
        }
      }

      function fit() {
        var W0 = root.clientWidth;
        var H0 = root.clientHeight;
        var wFrac = W0 < 480 ? 0.94 : (W0 < 960 ? 0.88 : 0.82);
        var targetW = Math.max(280, Math.min(W0 * wFrac, 920));
        var h = Math.max(340, Math.min(targetW / aspect, H0 * 0.84, 520));
        var w = targetW;
        var top = Math.max(16, (H0 - h) / 2 - 32);
        geo.h = h;
        geo.gap = 0.22 * h;
        scene.style.perspective = (4.5 * h) + 'px';
        scene.style.perspectiveOrigin = '50% ' + (top - 0.7 * h) + 'px';
        root.style.setProperty('--td-w', w + 'px');
        root.style.setProperty('--td-h', h + 'px');
        root.style.setProperty('--td-top', top + 'px');
        paint();
      }

      fit();
      window.addEventListener('resize', fit);

      window.rebuildCapDeck = function() {
        cards = window.CAP_DATA;
        n = cards.length;
        state.pos = 0;
        target = 0;
        for (var si = 0; si < pool; si++) {
          slotK[si] = -999;
        }
        paint();
      };

      var target = 0;
      var isRunning = false;
      var idleTimer = null;
      var dragged = false;

      function follow() {
        var dt = 1 / 60;
        state.pos += (target - state.pos) * (1 - Math.exp(-dt * 9));
        if (Math.abs(target - state.pos) < 2e-3) {
          state.pos = target;
          isRunning = false;
        } else {
          requestAnimationFrame(follow);
        }
        paint();
      }

      function pushPos(to) {
        target = to;
        if (!isRunning) {
          isRunning = true;
          requestAnimationFrame(follow);
        }
      }

      function settle(bias) {
        var finalPos = bias > 0 ? Math.floor(target + 0.7) : (bias < 0 ? Math.ceil(target - 0.7) : Math.round(target));
        pushPos(finalPos);
      }

      function onWheel(e) {
        e.preventDefault();
        var scale = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? root.clientHeight : 1);
        var d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * scale;
        pushPos(target + d / scrollPerCard);
        clearTimeout(idleTimer);
        idleTimer = setTimeout(function() {
          settle(Math.sign(d));
        }, 140);
      }

      var drag = null;
      function onPointerDown(e) {
        if (e.button !== 0) return;
        drag = { id: e.pointerId, y: e.clientY, travel: 0, last: 0 };
        dragged = false;
        clearTimeout(idleTimer);
      }
      function onPointerMove(e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dy = e.clientY - drag.y;
        var step = dy - drag.last;
        drag.last = dy;
        drag.travel += Math.abs(step);
        if (drag.travel > 6) dragged = true;
        pushPos(target - step / scrollPerCard);
      }
      function onPointerUp(e) {
        if (!drag || e.pointerId !== drag.id) return;
        var v = drag.last;
        drag = null;
        settle(Math.sign(-v));
      }

      root.addEventListener('wheel', onWheel, { passive: false });
      root.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);

      root.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          pushPos(Math.round(target) + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          pushPos(Math.round(target) - 1);
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
export function generateCapabilitiesMarkdown(
  capabilities: CapabilitySummary[],
  totalToolsCount: number,
  baseUrl: string = "https://aipages.tech",
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const lines: string[] = [
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
    lines.push(
      `- **[${cap.name}](${normalizedBase}${cap.directoryUrl})** (${cap.toolCount} ${cap.toolCount === 1 ? "tool" : "tools"}): ${cap.description} Tools: ${toolNames}`,
    );
  }

  lines.push("");
  return lines.join("\n");
}
