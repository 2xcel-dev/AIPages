import { deriveReliability } from "../types.js";
import { escapeHtml } from "./utils.js";
import { renderWebMcpRuntimeScript } from "./agentDiscovery.js";
import { SHARED_DESIGN_SYSTEM_CSS, formatHumanToolTitle, getFlowArtworkForTool, renderSharedNavbar, renderSharedFooter, } from "./sharedLayout.js";
function formatTimestamp(date) {
    if (!date)
        return "None recorded";
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime()))
            return "None recorded";
        return d.toUTCString();
    }
    catch {
        return "None recorded";
    }
}
function formatRelativeTime(date) {
    if (!date)
        return "";
    try {
        const d = date instanceof Date ? date : new Date(date);
        const ms = Date.now() - d.getTime();
        if (isNaN(ms))
            return "";
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
        return "";
    }
}
export async function findToolBySlug(store, slug) {
    if (!slug)
        return null;
    // 1. Direct namespace lookup
    let tool = await store.getByNamespace(slug);
    if (tool)
        return tool;
    // 2. URI decoded lookup
    const decoded = decodeURIComponent(slug);
    if (decoded !== slug) {
        tool = await store.getByNamespace(decoded);
        if (tool)
            return tool;
    }
    // 3. Fallback search through all tools
    const allTools = await store.list();
    const lowerSlug = slug.toLowerCase();
    // Match exact name
    const byName = allTools.find((t) => t.name.toLowerCase() === lowerSlug);
    if (byName)
        return byName;
    // Match last namespace segment (e.g. "schema-sanitizer" from "net.2xcel.aus.schema-sanitizer")
    const bySuffix = allTools.find((t) => {
        const parts = t.namespace.split(".");
        return parts[parts.length - 1]?.toLowerCase() === lowerSlug;
    });
    if (bySuffix)
        return bySuffix;
    // Match normalized slug
    const normalizedSlug = lowerSlug.replace(/[^a-z0-9]+/g, "-");
    const byNormalized = allTools.find((t) => {
        const normName = t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const normNs = t.namespace.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return normName === normalizedSlug || normNs === normalizedSlug;
    });
    if (byNormalized)
        return byNormalized;
    return null;
}
export async function findRelatedTools(store, tool, limit = 3) {
    if (!tool.capabilities || tool.capabilities.length === 0) {
        return [];
    }
    const currentCaps = new Set(tool.capabilities.map((c) => c.toLowerCase().trim()));
    const allTools = await store.list();
    const candidates = allTools.filter((t) => t.namespace !== tool.namespace &&
        (!t.status || t.status === "active") &&
        t.capabilities &&
        t.capabilities.length > 0);
    const scored = candidates
        .map((candidate) => {
        const candidateCaps = (candidate.capabilities ?? []).map((c) => c.toLowerCase().trim());
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
export function generateSamplePayload(schema) {
    if (!schema || typeof schema !== "object") {
        return { input: "sample_value" };
    }
    if (schema.properties && typeof schema.properties === "object") {
        const result = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            if (!prop || typeof prop !== "object") {
                result[key] = "sample_value";
                continue;
            }
            if (prop.default !== undefined) {
                result[key] = prop.default;
            }
            else if (prop.example !== undefined) {
                result[key] = prop.example;
            }
            else if (Array.isArray(prop.enum) && prop.enum.length > 0) {
                result[key] = prop.enum[0];
            }
            else if (prop.type === "string") {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes("url")) {
                    result[key] = "https://example.com/data";
                }
                else if (lowerKey.includes("query")) {
                    result[key] = "sample query";
                }
                else if (lowerKey.includes("prompt")) {
                    result[key] = "Analyze this input for patterns";
                }
                else if (lowerKey.includes("code")) {
                    result[key] = "console.log('hello');";
                }
                else if (lowerKey.includes("address")) {
                    result[key] = "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C";
                }
                else if (lowerKey.includes("hash")) {
                    result[key] = "0x<transaction_hash>";
                }
                else if (lowerKey.includes("id")) {
                    result[key] = "req_12345";
                }
                else {
                    result[key] = `sample_${key}`;
                }
            }
            else if (prop.type === "number" || prop.type === "integer") {
                result[key] = 1;
            }
            else if (prop.type === "boolean") {
                result[key] = true;
            }
            else if (prop.type === "array") {
                if (prop.items && typeof prop.items === "object") {
                    if (prop.items.properties) {
                        result[key] = [generateSamplePayload(prop.items)];
                    }
                    else if (prop.items.type === "string") {
                        result[key] = ["sample_value"];
                    }
                    else if (prop.items.type === "number" || prop.items.type === "integer") {
                        result[key] = [1];
                    }
                    else {
                        result[key] = [];
                    }
                }
                else {
                    result[key] = [];
                }
            }
            else if (prop.type === "object") {
                if (prop.properties) {
                    result[key] = generateSamplePayload(prop);
                }
                else {
                    result[key] = { sample_key: "sample_value" };
                }
            }
            else {
                result[key] = "sample_value";
            }
        }
        return Object.keys(result).length > 0 ? result : { input: "sample_value" };
    }
    return { input: "sample_value" };
}
export function generateRequestExample(tool) {
    const method = "POST";
    const endpoint = tool.endpointUrl || `https://aipages.tech/tool/${tool.namespace}`;
    let host = "aipages.tech";
    let path = `/tool/${tool.namespace}`;
    try {
        const parsed = new URL(endpoint);
        host = parsed.host;
        path = parsed.pathname + parsed.search;
    }
    catch {
        // fallback
    }
    const isX402 = Boolean(tool.isFirstParty ||
        tool.pricing?.model === "paid" ||
        (tool.authentication && /x402|x-payment-receipt/i.test(tool.authentication)));
    const costDisplay = tool.pricing?.model === "free"
        ? "Free ($0.00)"
        : `$${tool.pricing?.costPerCall ?? 0.25} USDC`;
    const recipientAddress = tool.developer?.address || "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C";
    const headers = {
        "Content-Type": "application/json",
    };
    let authDescription = "No authentication required (Public free endpoint)";
    if (isX402) {
        headers["x-payment-receipt"] = "<BASE_USDC_PAYMENT_RECEIPT>";
        authDescription = `x402 Payment Protocol - Requires ${costDisplay} on Base Mainnet (Chain ID 8453) to recipient ${recipientAddress}. Include your settled Base ERC-20 payment receipt in the 'x-payment-receipt' header (or 'X-Payment' tx hash).`;
    }
    else if (tool.authentication) {
        if (/bearer|token|apikey|key/i.test(tool.authentication)) {
            headers["Authorization"] = "Bearer <API_KEY>";
        }
        authDescription = tool.authentication;
    }
    const sampleBody = generateSamplePayload(tool.schema);
    const bodyJson = JSON.stringify(sampleBody, null, 2);
    // Generate cURL
    const headerLines = Object.entries(headers)
        .map(([k, v]) => `  -H "${k}: ${v}" \\`)
        .join("\n");
    const curl = `curl -X ${method} "${endpoint}" \\\n${headerLines}\n  -d '${bodyJson}'`;
    // Generate raw HTTP
    const rawHeaders = Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
    const rawHttp = `${method} ${path} HTTP/1.1\nHost: ${host}\n${rawHeaders}\n\n${bodyJson}`;
    // Generate JavaScript fetch code
    const fetchHeadersObj = JSON.stringify(headers, null, 4)
        .split("\n")
        .map((line, idx) => (idx === 0 ? line : `  ${line}`))
        .join("\n");
    const fetchBodyStr = bodyJson
        .split("\n")
        .map((line, idx) => (idx === 0 ? line : `    ${line}`))
        .join("\n");
    const fetchCode = `// Invoke ${tool.name} with autonomous agent authorization
const response = await fetch("${endpoint}", {
  method: "${method}",
  headers: ${fetchHeadersObj},
  body: JSON.stringify(${fetchBodyStr})
});

if (!response.ok) {
  if (response.status === 402) {
    console.error("402 Payment Required: Settled Base USDC payment receipt required.");
  }
  throw new Error(\`HTTP error! status: \${response.status}\`);
}

const data = await response.json();
console.log("Tool execution result:", data);`;
    // Generate AI Agent Client Configurations (Cursor, Claude Desktop, Cline)
    const toolServerName = (tool.name || "tool").replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
    const mcpServerEntry = {
        command: "npx",
        args: ["-y", "@aipages/mcp-gateway", tool.namespace],
        env: {
            AIPAGES_BASE_URL: "https://aipages.tech",
            ...(isX402 ? { BASE_USDC_PAYMENT_KEY: "<YOUR_BASE_WALLET_KEY_OR_PAYMENT_RECEIPT>" } : {}),
        },
    };
    const cursorConfig = JSON.stringify({
        mcpServers: {
            [`aus-${toolServerName}`]: mcpServerEntry,
        },
    }, null, 2);
    const claudeConfig = JSON.stringify({
        mcpServers: {
            [`aus-${toolServerName}`]: mcpServerEntry,
        },
    }, null, 2);
    const clineConfig = JSON.stringify({
        mcpServers: {
            [`aus-${toolServerName}`]: {
                ...mcpServerEntry,
                disabled: false,
                autoApprove: [],
            },
        },
    }, null, 2);
    return {
        endpoint,
        method,
        headers,
        body: sampleBody,
        bodyJson,
        curl,
        fetchCode,
        rawHttp,
        cursorConfig,
        claudeConfig,
        clineConfig,
        authDescription,
        isX402,
        costDisplay,
        recipientAddress,
    };
}
/**
 * Generate Schema.org JSON-LD structured data for a tool detail page.
 * Uses existing listing fields (name, description, url, capabilities, pricing,
 * authentication, and reliability context).
 * Adheres strictly to the anti-falsification rule (never invents claims; unchecked health remains unchecked)
 * and never exposes private keys or credentials.
 */
export function generateToolJsonLd(tool) {
    const health = deriveReliability(tool);
    const isFirstParty = Boolean(tool.isFirstParty ??
        tool.developer?.isFirstParty ??
        tool.namespace?.startsWith("net.2xcel.aus"));
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: tool.name,
        identifier: tool.namespace,
        description: tool.description || "",
        applicationCategory: "AutonomousAgentTool",
        operatingSystem: "Any",
        url: `https://aipages.tech/tool/${encodeURIComponent(tool.namespace)}`,
    };
    if (tool.endpointUrl) {
        jsonLd.installUrl = tool.endpointUrl;
    }
    if (tool.capabilities && Array.isArray(tool.capabilities) && tool.capabilities.length > 0) {
        jsonLd.keywords = tool.capabilities.join(", ");
        jsonLd.featureList = tool.capabilities;
    }
    // Developer / Provider info
    const providerName = tool.developer?.name || (isFirstParty ? "2xcel" : undefined);
    if (providerName) {
        jsonLd.provider = {
            "@type": "Organization",
            name: providerName,
            ...(tool.developer?.address ? { identifier: tool.developer.address } : {}),
        };
    }
    // Pricing / Offers
    if (tool.pricing) {
        const isFree = tool.pricing.model === "free" || tool.pricing.costPerCall === 0;
        const priceVal = tool.pricing.costPerCall !== undefined && tool.pricing.costPerCall !== null
            ? String(tool.pricing.costPerCall)
            : (isFree ? "0" : undefined);
        jsonLd.offers = {
            "@type": "Offer",
            price: priceVal ?? "0",
            priceCurrency: "USDC",
            description: `${tool.pricing.model || (isFree ? "free" : "paid")} pricing (${priceVal ?? "0"} USDC per call)`,
        };
    }
    else {
        jsonLd.offers = {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            description: "Free",
        };
    }
    // Additional technical properties (Authentication, Connection, Rate Limit, Reliability)
    const additionalProperties = [];
    if (tool.connectionType) {
        additionalProperties.push({
            "@type": "PropertyValue",
            name: "connectionType",
            value: tool.connectionType,
        });
    }
    if (tool.authentication) {
        let safeAuth = typeof tool.authentication === "string" ? tool.authentication : JSON.stringify(tool.authentication);
        safeAuth = safeAuth.replace(/0x[a-fA-F0-9]{64}/g, "[REDACTED]");
        additionalProperties.push({
            "@type": "PropertyValue",
            name: "authentication",
            value: safeAuth,
        });
    }
    else {
        additionalProperties.push({
            "@type": "PropertyValue",
            name: "authentication",
            value: "none",
        });
    }
    if (tool.rateLimit) {
        additionalProperties.push({
            "@type": "PropertyValue",
            name: "rateLimit",
            value: typeof tool.rateLimit === "string" ? tool.rateLimit : JSON.stringify(tool.rateLimit),
        });
    }
    // Reliability Context - strictly adheres to anti-falsification
    additionalProperties.push({
        "@type": "PropertyValue",
        name: "reliabilityStatus",
        value: health.reliability,
    });
    additionalProperties.push({
        "@type": "PropertyValue",
        name: "healthStatus",
        value: health.healthStatus,
    });
    if (health.lastCheckedIso) {
        additionalProperties.push({
            "@type": "PropertyValue",
            name: "lastChecked",
            value: health.lastCheckedIso,
        });
    }
    if (health.failureReason) {
        additionalProperties.push({
            "@type": "PropertyValue",
            name: "failureReason",
            value: health.failureReason,
        });
    }
    if (additionalProperties.length > 0) {
        jsonLd.additionalProperty = additionalProperties;
    }
    return jsonLd;
}
export function renderToolPage(tool, relatedTools = []) {
    const health = deriveReliability(tool);
    const jsonLd = generateToolJsonLd(tool);
    const jsonLdScript = JSON.stringify(jsonLd, null, 2).replace(/</g, "\\u003c");
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
    const requestExample = generateRequestExample(tool);
    const isFirstParty = Boolean(tool.isFirstParty ??
        tool.developer?.isFirstParty ??
        tool.namespace?.startsWith("net.2xcel.aus"));
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
    }
    else if (isDegraded) {
        statusClass = "status-degraded";
        statusTitle = "Degraded (Stale Probe)";
        statusBadgeHtml = `<span class="badge badge-degraded"><span class="pulse-dot"></span> Degraded (Stale)</span>`;
        statusSummary = "Endpoint was reachable on last probe, but no check has occurred in over 24 hours.";
    }
    else if (isFailing) {
        statusClass = "status-failing";
        statusTitle = "Failing (Endpoint Unreachable)";
        statusBadgeHtml = `<span class="badge badge-failing"><span class="pulse-dot"></span> Failing</span>`;
        statusSummary = "Endpoint failed to respond or returned an error status code during the most recent check.";
    }
    else {
        statusClass = "status-unchecked";
        statusTitle = "Not Yet Checked";
        statusBadgeHtml = `<span class="badge badge-unchecked"><span class="pulse-dot"></span> Not Yet Checked</span>`;
        statusSummary = "No automated liveness probe has been recorded for this endpoint yet.";
    }
    const lastCheckedDate = tool.lastChecked ?? tool.lastCheckedAt ?? (health.lastCheckedIso ? new Date(health.lastCheckedIso) : null);
    const lastCheckedFormatted = formatTimestamp(lastCheckedDate);
    const relativeTime = formatRelativeTime(lastCheckedDate);
    const lastCheckedDisplay = relativeTime ? `${lastCheckedFormatted} (${relativeTime})` : lastCheckedFormatted;
    const canonicalToolUrl = `https://aipages.tech/tool/${encodeURIComponent(tool.namespace)}`;
    const markdownToolUrl = `/tool/${encodeURIComponent(tool.namespace)}.md`;
    const aeoGraphSchema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "HowTo",
                name: `How to integrate and invoke ${tool.name} (${tool.namespace}) in autonomous AI agents`,
                description: `Step-by-step instructions to connect ${tool.name} via Model Context Protocol (MCP) in Cursor or Claude Desktop, or invoke directly over HTTP with Base Mainnet x402 settlement.`,
                step: [
                    {
                        "@type": "HowToStep",
                        position: 1,
                        name: "Configure MCP Server or HTTP Endpoint",
                        text: `Add the ${tool.namespace} MCP server entry to .cursor/mcp.json or claude_desktop_config.json, or target POST ${requestExample.endpoint}.`,
                    },
                    {
                        "@type": "HowToStep",
                        position: 2,
                        name: "Validate Request Payload Against JSON Schema",
                        text: `Format your JSON request body matching the required properties: ${(tool.schema?.required || []).join(", ") || "see JSON Schema"}.`,
                    },
                    {
                        "@type": "HowToStep",
                        position: 3,
                        name: "Execute in 0-Friction Sandbox or Settle via Base x402",
                        text: requestExample.isX402
                            ? `Include header 'x-playground-test: true' for free sandbox testing, or attach a settled Base Mainnet (Chain ID 8453) USDC transaction hash in 'x-payment-receipt' (${requestExample.costDisplay}).`
                            : "Send a POST request with Content-Type: application/json (free public endpoint, no payment required).",
                    },
                ],
            },
            {
                "@type": "FAQPage",
                mainEntity: [
                    {
                        "@type": "Question",
                        name: `What does ${tool.name} (${tool.namespace}) do?`,
                        acceptedAnswer: {
                            "@type": "Answer",
                            text: `${tool.description || tool.name} Capabilities: ${(tool.capabilities || []).join(", ") || "general agent utility"}.`,
                        },
                    },
                    {
                        "@type": "Question",
                        name: `How much does ${tool.name} cost to execute and what payment protocol does it use?`,
                        acceptedAnswer: {
                            "@type": "Answer",
                            text: requestExample.authDescription,
                        },
                    },
                    {
                        "@type": "Question",
                        name: `Can I test ${tool.name} without paying on-chain fees first?`,
                        acceptedAnswer: {
                            "@type": "Answer",
                            text: `Yes. Send POST /tool/${tool.namespace} with header 'x-playground-test: true' and 'x-agent-id: browser-playground' to execute a 0-friction test, or fetch GET /tool/${tool.namespace}.md for the clean Markdown specification.`,
                        },
                    },
                ],
            },
        ],
    };
    const aeoGraphScript = JSON.stringify(aeoGraphSchema, null, 2).replace(/</g, "\\u003c");
    const humanTitle = escapeHtml(formatHumanToolTitle(tool.name));
    const flowArtwork = getFlowArtworkForTool(tool.name) || getFlowArtworkForTool(tool.namespace);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedName} - AIPages Agent Tool Registry</title>
  <meta name="description" content="${escapedDescription}">
  <link rel="canonical" href="${canonicalToolUrl}">
  <link rel="alternate" type="text/markdown" title="${escapedName} Markdown Specification" href="${markdownToolUrl}">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <script type="application/ld+json">
${jsonLdScript}
  </script>
  <script type="application/ld+json" id="aeo-howto-faq-schema">
${aeoGraphScript}
  </script>
  <style>
    ${SHARED_DESIGN_SYSTEM_CSS}

    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 28px 24px;
    }

    .tool-hero-banner {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(10, 12, 18, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 22px;
      padding: 36px;
      margin: 28px 0 32px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 28px;
      align-items: center;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
    }

    .tool-hero-art {
      width: 240px;
      height: 240px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(245, 158, 11, 0.35);
      background: #050507;
      flex-shrink: 0;
    }

    .tool-hero-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media (max-width: 860px) {
      .tool-hero-banner {
        grid-template-columns: 1fr;
        padding: 24px;
      }
      .tool-hero-art {
        width: 100%;
        height: 200px;
      }
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

    /* Integration & Request Example Section */
    .integration-card {
      border-top: 3px solid var(--primary);
    }
    .auth-notice-box {
      background: var(--card-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .auth-notice-box.auth-x402 {
      border-left: 4px solid var(--primary);
    }
    .auth-notice-box.auth-free {
      border-left: 4px solid var(--healthy);
    }
    .auth-notice-header {
      font-size: 0.88rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .auth-notice-desc {
      font-size: 0.84rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .auth-notice-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .auth-notice-meta code {
      background: var(--code-bg);
      color: var(--primary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .badge-paid {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .badge-free {
      background: var(--healthy-bg);
      color: var(--healthy);
      border: 1px solid var(--healthy-border);
    }
    .code-tabs-wrapper {
      margin-top: 12px;
    }
    .code-tabs-nav {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .code-tab-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .code-tab-btn:hover {
      border-color: var(--border-light);
      color: #fff;
    }
    .code-tab-btn.active {
      background: rgba(56, 189, 248, 0.12);
      border-color: var(--primary);
      color: var(--primary);
    }
    .btn-copy, .btn-proxy-copy {
      background: var(--card-surface);
      border: 1px solid var(--border-light);
      color: var(--primary);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-copy:hover, .btn-proxy-copy:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: var(--primary);
      color: #fff;
    }
    .btn-copy.btn-copied, .btn-proxy-copy.btn-copied {
      background: rgba(16, 185, 129, 0.2) !important;
      border-color: var(--healthy) !important;
      color: var(--healthy) !important;
    }

    /* Interactive Test Playground */
    .playground-card {
      border: 1px solid rgba(56, 189, 248, 0.25);
      background: radial-gradient(circle at top right, rgba(14, 165, 233, 0.05), transparent 40%), var(--card-bg);
    }
    .playground-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 14px;
    }
    @media (max-width: 900px) {
      .playground-grid {
        grid-template-columns: 1fr;
      }
    }
    .playground-panel {
      background: var(--card-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .playground-panel-header {
      background: rgba(15, 23, 42, 0.7);
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      font-weight: 600;
      color: #fff;
    }
    .playground-panel-header .panel-badge {
      font-size: 0.72rem;
      background: rgba(56, 189, 248, 0.2);
      color: var(--primary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
    }
    .playground-editor-wrapper {
      padding: 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .playground-textarea {
      width: 100%;
      min-height: 220px;
      background: #070a12;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      padding: 12px;
      resize: vertical;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .playground-textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    .playground-auth-group {
      padding: 0 12px 12px;
    }
    .playground-input-label {
      display: block;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .playground-input {
      width: 100%;
      background: #070a12;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.82rem;
      padding: 8px 10px;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .playground-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    .playground-free-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      margin: 0 12px 12px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      color: #34d399;
    }
    .playground-actions {
      padding: 0 12px 14px;
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .btn-execute {
      background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
      color: #030712;
      font-weight: 700;
      font-size: 0.86rem;
      border: none;
      border-radius: var(--radius-sm);
      padding: 8px 18px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
      box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
    }
    .btn-execute:hover {
      background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
    }
    .btn-execute:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.78rem;
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-ghost:hover {
      border-color: var(--border-light);
      color: #fff;
    }
    .playground-status-pill {
      font-size: 0.78rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .playground-status-pill.status-200 {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .playground-status-pill.status-402 {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .playground-status-pill.status-err {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .playground-status-pill.status-loading {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .playground-timing {
      font-size: 0.76rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--text-dim);
      background: rgba(255, 255, 255, 0.04);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .playground-response-wrapper {
      padding: 12px;
      flex: 1;
      display: flex;
    }
    .playground-response-wrapper pre {
      margin: 0;
      width: 100%;
      height: 100%;
      min-height: 260px;
      max-height: 480px;
      box-sizing: border-box;
      background: #070a12;
      border: 1px solid var(--border);
    }

    /* Hero 1-Click Agent Action Buttons */
    .hero-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      align-items: center;
      flex-wrap: wrap;
    }
    .btn-agent {
      font-weight: 600;
      font-size: 0.85rem;
      border-radius: var(--radius-sm);
      padding: 9px 15px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      transition: all 0.15s ease;
      text-decoration: none;
      outline: none;
    }
    .btn-agent:hover {
      transform: translateY(-1px);
    }
    .btn-agent:active {
      transform: translateY(0);
    }

    .btn-claude {
      background: linear-gradient(135deg, #b45309 0%, #d97706 100%);
      color: #ffffff;
      border: 1px solid rgba(245, 158, 11, 0.4);
      box-shadow: 0 2px 8px rgba(217, 119, 6, 0.25);
    }
    .btn-claude:hover {
      background: linear-gradient(135deg, #92400e 0%, #b45309 100%);
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);
    }

    .btn-cursor {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #ffffff;
      border: 1px solid rgba(99, 102, 241, 0.4);
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
    }
    .btn-cursor:hover {
      background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }

    .btn-cline {
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      color: #ffffff;
      border: 1px solid rgba(20, 184, 166, 0.4);
      box-shadow: 0 2px 8px rgba(20, 184, 166, 0.25);
    }
    .btn-cline:hover {
      background: linear-gradient(135deg, #115e59 0%, #0f766e 100%);
      box-shadow: 0 4px 14px rgba(20, 184, 166, 0.4);
    }

    .btn-test-now {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
      font-weight: 600;
      font-size: 0.85rem;
      border-radius: var(--radius-sm);
      padding: 9px 15px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-test-now:hover {
      background: rgba(56, 189, 248, 0.22);
      border-color: #38bdf8;
      color: #ffffff;
      transform: translateY(-1px);
    }

    /* Playground Mode Selector & Presets */
    .mode-toggle-group {
      display: inline-flex;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 3px;
      gap: 2px;
    }
    .mode-toggle-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .mode-toggle-btn.active {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.35);
    }
    .mode-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }
    .sandbox-dot {
      background: #34d399;
      box-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
    }
    .prod-dot {
      background: #a855f7;
      box-shadow: 0 0 6px rgba(168, 85, 247, 0.6);
    }
    .playground-presets {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px 12px;
      flex-wrap: wrap;
    }
    .presets-label {
      font-size: 0.76rem;
      color: var(--text-dim);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .preset-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.76rem;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .preset-pill:hover {
      background: rgba(56, 189, 248, 0.1);
      border-color: var(--primary);
      color: #fff;
    }

    /* Cursor Modal */
    .cursor-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(6px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .cursor-modal-card {
      background: #0b1120;
      border: 1px solid rgba(99, 102, 241, 0.4);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.2);
      border-radius: var(--radius);
      width: 100%;
      max-width: 620px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .cursor-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.85);
    }
    .cursor-icon-box {
      width: 36px;
      height: 36px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #818cf8;
    }
    .btn-close-modal {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }
    .btn-close-modal:hover {
      color: #fff;
    }
    .cursor-modal-body {
      padding: 20px;
      overflow-y: auto;
      max-height: 70vh;
    }

    /* Agent Integration Modal & Tabs */
    .agent-modal-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.7);
      padding: 0 16px;
      gap: 6px;
    }
    .agent-modal-tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 10px 14px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .agent-modal-tab-btn:hover {
      color: #fff;
    }
    .agent-modal-tab-btn.tab-claude.active {
      color: #f59e0b;
      border-bottom-color: #f59e0b;
    }
    .agent-modal-tab-btn.tab-cursor.active {
      color: #818cf8;
      border-bottom-color: #818cf8;
    }
    .agent-modal-tab-btn.tab-cline.active {
      color: #2dd4bf;
      border-bottom-color: #2dd4bf;
    }
    .client-path-tag {
      font-size: 0.76rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      padding: 4px 8px;
      border-radius: 4px;
      color: #e2e8f0;
      display: inline-block;
      margin-top: 4px;
    }
    .agent-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      border: 1px solid #38bdf8;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      color: #fff;
      font-size: 0.86rem;
      font-weight: 600;
      padding: 12px 20px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10000;
    }
  </style>
</head>
<body>
  ${renderSharedNavbar("tool", false)}

  <main class="container">
    <div class="hero tool-hero-banner" style="${flowArtwork ? "" : "grid-template-columns: 1fr;"}">
      <div>
        <div class="hero-top">
          <h1 class="tool-title">${humanTitle !== escapedName ? `${humanTitle} <span style="font-size: 1.05rem; font-family: var(--font-mono); color: #A1A1AA; font-weight: 500;">(${escapedName})</span>` : escapedName}</h1>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            ${isFirstParty ? `<span class="badge badge-first-party"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> First-Party AUS Tool</span>` : ""}
            ${statusBadgeHtml}
          </div>
        </div>
        <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <span class="namespace-tag">${escapedNamespace}</span>
          ${pricingModel === "free" ? `<span class="badge badge-healthy" style="font-family: var(--font-mono);">0.00 USDT</span>` : `<span class="badge badge-first-party" style="font-family: var(--font-mono);">${costPerCall} USDT ($${costPerCall} USDC)</span>`}
        </div>
        <p class="tool-description">${escapedDescription}</p>
        <div class="hero-actions">
          <button type="button" class="btn btn-agent btn-claude" onclick="copyClientConfig('claude', this)" title="1-Click copy Claude Desktop MCP config">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 12a10 10 0 0 0 9.9 10V12z"/></svg>
            <span class="btn-text">Add to Claude</span>
          </button>
          <button type="button" class="btn btn-agent btn-cursor" onclick="copyClientConfig('cursor', this)" title="1-Click copy Cursor .cursor/mcp.json config">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span class="btn-text">Add to Cursor</span>
          </button>
          <button type="button" class="btn btn-agent btn-cline" onclick="copyClientConfig('cline', this)" title="1-Click copy Cline cline_mcp_settings.json config">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6m0-6-6 6"/></svg>
            <span class="btn-text">Add to Cline</span>
          </button>
          <button type="button" class="btn btn-sm btn-ghost" onclick="openCursorModal()" title="View MCP Setup Instructions" style="font-size: 0.8rem; padding: 8px 12px; color: var(--text-muted); border: 1px dashed var(--border-light); cursor: pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>Setup Guide</span>
          </button>
          <button type="button" class="btn btn-sm btn-ghost" onclick="copyBadgeSnippet('${escapeHtml(tool.namespace)}', this)" title="Copy GitHub README Verification Badge" style="font-size: 0.8rem; padding: 8px 12px; color: var(--text-muted); border: 1px dashed var(--border-light); cursor: pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>README Badge</span>
          </button>
          <a href="#test-console" class="btn btn-test-now" style="cursor: pointer;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Try Live Playground (Free) &darr;</span>
          </a>
        </div>
      </div>
      ${flowArtwork ? `<div class="tool-hero-art"><img src="${flowArtwork}" alt="${humanTitle} promotional visual" loading="eager" /></div>` : ""}
    </div>

    <!-- Interactive Live Test Console (SURFACED FRONT-AND-CENTER) -->
    <section class="card full-width playground-card" id="test-console" aria-label="Interactive Test Console">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h2 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Interactive Test Console
          </h2>
          <span class="badge badge-healthy" style="font-size: 0.72rem; padding: 2px 8px;">
            <span class="pulse-dot"></span> Test Live Before Paying (0-Friction)
          </span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <div class="mode-toggle-group" role="radiogroup" aria-label="Playground Mode">
            <button type="button" class="mode-toggle-btn active" id="btn-mode-sandbox" onclick="setPlaygroundMode('sandbox')">
              <span class="mode-dot sandbox-dot"></span> 0-Friction Test Mode
            </button>
            <button type="button" class="mode-toggle-btn" id="btn-mode-production" onclick="setPlaygroundMode('production')">
              <span class="mode-dot prod-dot"></span> Base x402 Settlement
            </button>
          </div>
          <button type="button" class="btn-ghost" onclick="resetPlaygroundPayload()">Reset Sample</button>
          <button type="button" class="btn-ghost" onclick="formatPlaygroundPayload()">Format JSON</button>
        </div>
      </div>

      <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 12px;">
        Test this tool directly from your browser with zero friction before deploying or paying. Dispatches live request to <code>POST /tool/${escapedNamespace}</code>.
      </p>

      <div class="playground-presets">
        <span class="presets-label">Preset Payloads:</span>
        <button type="button" class="preset-pill" onclick="loadPresetPayload('hackernews')">Hacker News (Markdown)</button>
        <button type="button" class="preset-pill" onclick="loadPresetPayload('example')">Example Domain</button>
        <button type="button" class="preset-pill" onclick="loadPresetPayload('jsonmode')">JSON Mode (SPA)</button>
      </div>

      <div class="playground-grid">
        <!-- Request Editor Column -->
        <form id="playground-form" class="playground-panel" method="POST" action="/tool/${escapedNamespace}?test=true" toolname="execute_tool_${tool.name.replace(/[^a-zA-Z0-9_-]/g, "_")}" tooldescription="Execute or test ${escapedName} (${escapedNamespace}) with a JSON payload in 0-Friction Sandbox Mode or Base USDC x402 mode." onsubmit="event.preventDefault(); executePlaygroundTool('${escapedNamespace}');" data-mcp-action="invoke-tool" data-mcp-namespace="${escapedNamespace}" data-mcp-method="POST" data-mcp-endpoint="/tool/${escapedNamespace}">
          <div class="playground-panel-header">
            <label for="playground-payload" style="cursor: pointer;">Request Payload (JSON)</label>
            <span class="panel-badge">POST</span>
          </div>
          <div class="playground-editor-wrapper">
            <textarea id="playground-payload" name="payload" class="playground-textarea" aria-label="Request Payload (JSON)" toolparamdescription="JSON object matching the tool input schema" spellcheck="false" rows="10">${escapeHtml(requestExample.bodyJson)}</textarea>
          </div>

          ${requestExample.isX402
        ? `
          <div class="playground-auth-group" id="playground-auth-group">
            <label for="playground-payment-header" class="playground-input-label">
              x-payment-receipt Header <span style="color: var(--text-dim); font-size: 0.72rem;">(Base USDC tx receipt)</span>
            </label>
            <input type="text" id="playground-payment-header" name="x-payment-receipt" class="playground-input" toolparamdescription="Optional Base Mainnet 0x transaction receipt hash for HTTP 402 production settlement" placeholder="0x... or Leave blank to inspect 402 Settlement Directive" />
            <div id="playground-mode-hint" style="font-size: 0.76rem; color: #34d399; margin-top: 6px; display: flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span><strong>0-Friction Test Mode:</strong> Live engine executes with zero required transaction fee.</span>
            </div>
          </div>
          `
        : `
          <div class="playground-free-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Public Endpoint: Zero authentication required for test execution.</span>
          </div>
          `}

          <div class="playground-actions">
            <button type="submit" id="btn-execute-playground" class="btn-execute" data-mcp-trigger="invoke-tool" onclick="event.preventDefault(); executePlaygroundTool('${escapedNamespace}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span class="btn-label">Run 0-Friction Test</span>
            </button>
            <span id="playground-status-pill" class="playground-status-pill" style="display: none;"></span>
          </div>
        </form>

        <!-- Response Column -->
        <div class="playground-panel">
          <div class="playground-panel-header">
            <span>Response Output</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span id="playground-time" class="playground-timing" style="display: none;">0ms</span>
              <button type="button" class="btn-ghost" onclick="copyPlaygroundResponse(this)">Copy Response</button>
            </div>
          </div>
          <div class="playground-response-wrapper">
            <pre><code id="playground-response">// Response payload will appear here after execution...
// Click 'Run 0-Friction Test' on the left to dispatch request.</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Integration & Request Example Section -->
    <section class="card full-width integration-card" aria-label="Integration & Request Examples" id="integration-examples">
      <div class="card-header">
        <h2 class="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          Integration &amp; Request Example
        </h2>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge ${requestExample.isX402 ? "badge-paid" : "badge-free"}">
            ${requestExample.isX402 ? "x402 Payment Required" : "Free Endpoint"}
          </span>
          <button type="button" class="btn btn-sm btn-copy" onclick="copyActiveExample(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copy-label">Copy cURL</span>
          </button>
        </div>
      </div>

      <div class="auth-notice-box ${requestExample.isX402 ? "auth-x402" : "auth-free"}">
        <div class="auth-notice-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <strong>Authentication &amp; Payment Protocol:</strong>
        </div>
        <div class="auth-notice-desc">
          ${escapeHtml(requestExample.authDescription)}
        </div>
        ${requestExample.isX402
        ? `
        <div class="auth-notice-meta">
          <span><strong>Cost:</strong> ${escapeHtml(requestExample.costDisplay)}</span>
          <span><strong>Network:</strong> Base Mainnet (Chain ID 8453)</span>
          <span><strong>Header:</strong> <code>x-payment-receipt: &lt;BASE_USDC_PAYMENT_RECEIPT&gt;</code></span>
          ${requestExample.recipientAddress ? `<span><strong>Recipient:</strong> <code>${escapeHtml(requestExample.recipientAddress)}</code></span>` : ""}
        </div>
        `
        : `
        <div class="auth-notice-meta">
          <span><strong>Cost:</strong> Free</span>
          <span><strong>Access:</strong> Public</span>
        </div>
        `}
      </div>

      <div class="code-tabs-wrapper">
        <div class="code-tabs-nav" role="tablist">
          <button type="button" class="code-tab-btn active" role="tab" aria-selected="true" data-tab="curl" onclick="switchExampleTab('curl')">cURL</button>
          <button type="button" class="code-tab-btn" role="tab" aria-selected="false" data-tab="cursor" onclick="switchExampleTab('cursor')">Cursor (.cursor/mcp.json)</button>
          <button type="button" class="code-tab-btn" role="tab" aria-selected="false" data-tab="claude" onclick="switchExampleTab('claude')">Claude Desktop</button>
          <button type="button" class="code-tab-btn" role="tab" aria-selected="false" data-tab="cline" onclick="switchExampleTab('cline')">Cline</button>
          <button type="button" class="code-tab-btn" role="tab" aria-selected="false" data-tab="javascript" onclick="switchExampleTab('javascript')">JavaScript (fetch)</button>
          <button type="button" class="code-tab-btn" role="tab" aria-selected="false" data-tab="http" onclick="switchExampleTab('http')">Raw HTTP</button>
        </div>
        <div class="code-tab-panel active" id="panel-curl">
          <pre><code id="snippet-curl">${escapeHtml(requestExample.curl)}</code></pre>
        </div>
        <div class="code-tab-panel" id="panel-cursor" style="display: none;">
          <pre><code id="snippet-cursor">${escapeHtml(requestExample.cursorConfig || "")}</code></pre>
        </div>
        <div class="code-tab-panel" id="panel-claude" style="display: none;">
          <pre><code id="snippet-claude">${escapeHtml(requestExample.claudeConfig || "")}</code></pre>
        </div>
        <div class="code-tab-panel" id="panel-cline" style="display: none;">
          <pre><code id="snippet-cline">${escapeHtml(requestExample.clineConfig || "")}</code></pre>
        </div>
        <div class="code-tab-panel" id="panel-javascript" style="display: none;">
          <pre><code id="snippet-javascript">${escapeHtml(requestExample.fetchCode)}</code></pre>
        </div>
        <div class="code-tab-panel" id="panel-http" style="display: none;">
          <pre><code id="snippet-http">${escapeHtml(requestExample.rawHttp)}</code></pre>
        </div>
      </div>

      <!-- Viral GitHub Verification Shield for Repository README -->
      <div style="margin-top: 16px; padding: 12px 16px; background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-light); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <img src="/badge/${encodeURIComponent(tool.namespace)}.svg" alt="AIPages Verification Shield" style="height: 20px;" loading="lazy" />
          <span style="font-size: 0.85rem; color: var(--text-muted);">Embed this verification shield in your repository README to show verified on-chain status.</span>
        </div>
        <button type="button" class="btn btn-sm btn-ghost" onclick="copyBadgeSnippet('${escapeHtml(tool.namespace)}', this)" style="padding: 6px 12px; font-size: 0.78rem; cursor: pointer;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span class="btn-text">Copy Markdown Badge</span>
        </button>
      </div>
    </section>

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
              ${escapedEndpoint
        ? `<a href="${escapedEndpoint}" target="_blank" rel="noopener noreferrer">${escapedEndpoint}</a>`
        : `<span style="color: var(--text-dim); font-style: italic;">No remote endpoint (stdio/local)</span>`}
            </span>
          </div>
        </div>

        ${isFailing && health.failureReason
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
        : ""}

        ${isUnchecked
        ? `
        <div style="background: var(--card-surface); border: 1px dashed var(--border); padding: 12px 14px; border-radius: var(--radius-sm); margin-top: 14px; font-size: 0.85rem; color: var(--text-muted);">
          <strong>Health Monitoring:</strong> This tool has not yet been probed by the automated outreach worker. Probes evaluate HTTP endpoint reachability with bounded timeouts.
        </div>
        `
        : ""}

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
          ${isFirstParty
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
        : ""}
          ${tool.capabilities && tool.capabilities.length > 0
        ? `
          <div class="meta-row">
            <span class="meta-label">Capabilities</span>
            <span class="meta-value">${tool.capabilities.map((c) => `<code>${escapeHtml(c)}</code>`).join(" ")}</span>
          </div>
          `
        : ""}
          <div class="meta-row">
            <span class="meta-label">Connection</span>
            <span class="meta-value"><code>${connectionType.toUpperCase()}</code></span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Pricing Model</span>
            <span class="meta-value">
              ${pricingModel === "free"
        ? `<span style="color: var(--healthy); font-weight: 600;">Free</span>`
        : `<span style="color: var(--primary); font-weight: 600;">Paid ($${costPerCall} USDC)</span>`}
            </span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Platform Take-Rate</span>
            <span class="meta-value">
              ${pricingModel === "free"
        ? `<span style="color: var(--text-muted);">$0 (Free tool)</span>`
        : `<span style="color: var(--text-muted);">$0.25 USDC (On success only)</span>`}
            </span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Payment Network</span>
            <span class="meta-value">Base Mainnet (Chain ID 8453)</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Developer</span>
            <span class="meta-value">
              ${devAddress
        ? `<a href="https://basescan.org/address/${devAddress}" target="_blank" rel="noopener noreferrer"><code>${devAddress.slice(0, 6)}...${devAddress.slice(-4)}</code></a>`
        : `<span style="color: var(--text-dim);">Unregistered</span>`}
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">Direct Execution Proxy</div>
            <button type="button" class="btn btn-sm btn-proxy-copy" onclick="copyProxySnippet(this)" style="padding: 3px 8px; font-size: 0.75rem;">
              <span class="proxy-copy-label">Copy</span>
            </button>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px;">
            Invoke dynamically with autonomous agent wallet authorization:
            <a href="#integration-examples" style="color: var(--primary); margin-left: 6px;">View Full cURL &amp; Payload &darr;</a>
          </div>
          <pre style="margin: 0;"><code id="proxy-snippet">POST /tool/${escapedNamespace}
Host: aipages.tech
X-Payment: &lt;base-usdc-tx-hash&gt;
x-payment-receipt: &lt;BASE_USDC_PAYMENT_RECEIPT&gt;
Content-Type: application/json</code></pre>
        </div>
      </section>
    </div>

    <!-- Schema Section -->
    ${schemaJson
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
        : ""}

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
      ${relatedTools && relatedTools.length > 0
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
      `}
    </section>
  </main>

  <!-- 1-Click Agent Config Modal (Cursor, Claude Desktop, Cline) -->
  <div id="cursor-modal" class="cursor-modal-backdrop" style="display: none;" onclick="handleModalBackdropClick(event)">
    <div class="cursor-modal-card" role="dialog" aria-modal="true" aria-labelledby="agent-modal-title">
      <div class="cursor-modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="cursor-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <h3 id="agent-modal-title" style="margin: 0; font-size: 1.1rem; color: #fff; font-weight: 700;">Connect ${escapedName} to Your Agent</h3>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Ready-to-use Agent MCP Configuration with Base USDC Settlement</div>
          </div>
        </div>
        <button type="button" class="btn-close-modal" onclick="closeAgentModal()" aria-label="Close modal">&times;</button>
      </div>

      <div class="agent-modal-tabs">
        <button type="button" class="agent-modal-tab-btn tab-cursor active" id="agent-modal-tab-cursor" onclick="switchAgentModalTab('cursor')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>Cursor (.cursor/mcp.json)</span>
        </button>
        <button type="button" class="agent-modal-tab-btn tab-claude" id="agent-modal-tab-claude" onclick="switchAgentModalTab('claude')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 12a10 10 0 0 0 9.9 10V12z"/></svg>
          <span>Claude Desktop</span>
        </button>
        <button type="button" class="agent-modal-tab-btn tab-cline" id="agent-modal-tab-cline" onclick="switchAgentModalTab('cline')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6m0-6-6 6"/></svg>
          <span>Cline</span>
        </button>
      </div>

      <div class="cursor-modal-body">
        <!-- Cursor Tab Panel -->
        <div id="agent-modal-panel-cursor">
          <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 8px;">
            Paste this configuration into your project root at <code>.cursor/mcp.json</code> to give your Cursor agent autonomous access to <strong>${escapedName}</strong> with on-chain settlement:
          </p>
          <div style="position: relative;">
            <pre style="margin: 0; background: #070a12; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; font-family: ui-monospace, monospace; font-size: 0.84rem; overflow-x: auto;"><code id="cursor-modal-snippet">${escapeHtml(requestExample.cursorConfig || "")}</code></pre>
            <button type="button" class="btn btn-sm btn-copy" onclick="copyAgentModalSnippet('cursor', this)" style="position: absolute; top: 10px; right: 10px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span class="copy-label">Copy Config</span>
            </button>
          </div>
          <div style="margin-top: 14px; font-size: 0.82rem; color: var(--text-dim); display: flex; flex-direction: column; gap: 6px;">
            <div><strong style="color: #e2e8f0;">Step 1:</strong> In your workspace root, create or edit <code>.cursor/mcp.json</code>.</div>
            <div><strong style="color: #e2e8f0;">Step 2:</strong> Paste the JSON configuration block above.</div>
            <div><strong style="color: #e2e8f0;">Step 3:</strong> Save the file. Cursor will automatically detect the tool for stealth scraping and Base USDC settlement.</div>
          </div>
        </div>

        <!-- Claude Desktop Tab Panel -->
        <div id="agent-modal-panel-claude" style="display: none;">
          <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 8px;">
            Add this MCP configuration block to your Claude Desktop config file:
            <span class="client-path-tag">macOS: ~/Library/Application Support/Claude/claude_desktop_config.json</span>
            <span class="client-path-tag">Windows: %APPDATA%\\Claude\\claude_desktop_config.json</span>
          </p>
          <div style="position: relative;">
            <pre style="margin: 0; background: #070a12; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; font-family: ui-monospace, monospace; font-size: 0.84rem; overflow-x: auto;"><code id="claude-modal-snippet">${escapeHtml(requestExample.claudeConfig || "")}</code></pre>
            <button type="button" class="btn btn-sm btn-copy" onclick="copyAgentModalSnippet('claude', this)" style="position: absolute; top: 10px; right: 10px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span class="copy-label">Copy Config</span>
            </button>
          </div>
          <div style="margin-top: 14px; font-size: 0.82rem; color: var(--text-dim); display: flex; flex-direction: column; gap: 6px;">
            <div><strong style="color: #e2e8f0;">Step 1:</strong> Open Claude Desktop &gt; Settings &gt; Developer &gt; Edit Config.</div>
            <div><strong style="color: #e2e8f0;">Step 2:</strong> Paste the <code>mcpServers</code> configuration block above into <code>claude_desktop_config.json</code>.</div>
            <div><strong style="color: #e2e8f0;">Step 3:</strong> Restart Claude Desktop. The hammer icon confirms active agent connectivity.</div>
          </div>
        </div>

        <!-- Cline Tab Panel -->
        <div id="agent-modal-panel-cline" style="display: none;">
          <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 8px;">
            Add this MCP configuration block to your Cline MCP settings:
            <span class="client-path-tag">cline_mcp_settings.json</span>
          </p>
          <div style="position: relative;">
            <pre style="margin: 0; background: #070a12; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; font-family: ui-monospace, monospace; font-size: 0.84rem; overflow-x: auto;"><code id="cline-modal-snippet">${escapeHtml(requestExample.clineConfig || "")}</code></pre>
            <button type="button" class="btn btn-sm btn-copy" onclick="copyAgentModalSnippet('cline', this)" style="position: absolute; top: 10px; right: 10px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span class="copy-label">Copy Config</span>
            </button>
          </div>
          <div style="margin-top: 14px; font-size: 0.82rem; color: var(--text-dim); display: flex; flex-direction: column; gap: 6px;">
            <div><strong style="color: #e2e8f0;">Step 1:</strong> Open VS Code or Cursor Cline extension tab.</div>
            <div><strong style="color: #e2e8f0;">Step 2:</strong> Click the MCP Server icon and select "Configure MCP Servers" (or edit <code>cline_mcp_settings.json</code>).</div>
            <div><strong style="color: #e2e8f0;">Step 3:</strong> Paste the JSON block. Cline connects with auto-approval and payment receipt ready.</div>
          </div>
        </div>
      </div>
      <div style="padding: 12px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; background: rgba(15, 23, 42, 0.5);">
        <button type="button" class="btn btn-sm btn-ghost" onclick="closeAgentModal()">Close</button>
        <button type="button" class="btn btn-sm btn-cursor" id="btn-modal-primary-copy" onclick="copyActiveAgentModalSnippet(this)">
          <span class="copy-label">Copy to Clipboard</span>
        </button>
      </div>
    </div>
  </div>

  ${renderSharedFooter()}

  <script>
    var activeExampleTab = 'curl';
    var activeAgentModalTab = 'cursor';

    var clientConfigs = {
      cursor: ${JSON.stringify(requestExample.cursorConfig || "")},
      claude: ${JSON.stringify(requestExample.claudeConfig || "")},
      cline: ${JSON.stringify(requestExample.clineConfig || "")}
    };
    var clientDestinations = {
      cursor: '.cursor/mcp.json',
      claude: 'claude_desktop_config.json',
      cline: 'cline_mcp_settings.json'
    };
    var clientNames = {
      cursor: 'Cursor',
      claude: 'Claude Desktop',
      cline: 'Cline'
    };

    function switchExampleTab(tab) {
      activeExampleTab = tab;
      document.querySelectorAll('.code-tab-btn').forEach(function(b) {
        var isTarget = b.getAttribute('data-tab') === tab;
        b.classList.toggle('active', isTarget);
        b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      });
      ['curl', 'cursor', 'claude', 'cline', 'javascript', 'http'].forEach(function(t) {
        var panel = document.getElementById('panel-' + t);
        if (panel) panel.style.display = (t === tab) ? 'block' : 'none';
      });
      var copyLabel = document.querySelector('.btn-copy .copy-label');
      if (copyLabel) {
        if (tab === 'curl') copyLabel.textContent = 'Copy cURL';
        else if (tab === 'cursor') copyLabel.textContent = 'Copy Cursor Config';
        else if (tab === 'claude') copyLabel.textContent = 'Copy Claude Config';
        else if (tab === 'cline') copyLabel.textContent = 'Copy Cline Config';
        else if (tab === 'javascript') copyLabel.textContent = 'Copy JavaScript';
        else copyLabel.textContent = 'Copy HTTP';
      }
    }

    function fallbackCopy(text, cb) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        if (cb) cb();
      } catch (e) {
        console.error('Copy failed:', e);
      }
      document.body.removeChild(ta);
    }

    function showAgentToast(msg) {
      var existing = document.getElementById('agent-live-toast');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      var toast = document.createElement('div');
      toast.id = 'agent-live-toast';
      toast.className = 'agent-toast';
      toast.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>' + msg + '</span>';
      document.body.appendChild(toast);

      setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.35s ease';
        setTimeout(function() {
          if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
        }, 350);
      }, 3000);
    }

    function copyClientConfig(client, btn) {
      var config = clientConfigs[client];
      if (!config) return;
      var span = btn.querySelector('.btn-text') || btn.querySelector('span:last-child') || btn;
      var origText = span.textContent;
      var clientName = clientNames[client] || client;
      var dest = clientDestinations[client] || 'config';

      var updateUi = function() {
        span.textContent = 'Copied!';
        btn.classList.add('btn-copied');
        showAgentToast('Copied ' + clientName + ' config! Paste into ' + dest);
        setTimeout(function() {
          span.textContent = origText;
          btn.classList.remove('btn-copied');
        }, 2200);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(config).then(updateUi).catch(function() {
          fallbackCopy(config, updateUi);
        });
      } else {
        fallbackCopy(config, updateUi);
      }
    }

    function copyBadgeSnippet(slug, btn) {
      var snippet = '[![AIPages Verified](https://aipages.tech/badge/' + encodeURIComponent(slug) + '.svg)](https://aipages.tech/tools/' + encodeURIComponent(slug) + ')';
      var span = btn.querySelector('.btn-text') || btn.querySelector('span:last-child') || btn;
      var origText = span.textContent;
      var updateUi = function() {
        span.textContent = 'Copied!';
        btn.classList.add('btn-copied');
        showAgentToast('README badge copied to clipboard!');
        setTimeout(function() {
          span.textContent = origText;
          btn.classList.remove('btn-copied');
        }, 2200);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet).then(updateUi).catch(function() {
          fallbackCopy(snippet, updateUi);
        });
      } else {
        fallbackCopy(snippet, updateUi);
      }
    }

    function copyActiveExample(btn) {
      var codeEl = document.getElementById('snippet-' + activeExampleTab);
      if (!codeEl) return;
      var text = codeEl.innerText || codeEl.textContent;
      var label = btn.querySelector('.copy-label') || btn;
      var orig = label.textContent;

      var updateUi = function() {
        label.textContent = 'Copied!';
        btn.classList.add('btn-copied');
        setTimeout(function() {
          label.textContent = orig;
          btn.classList.remove('btn-copied');
        }, 2000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(updateUi).catch(function() {
          fallbackCopy(text, updateUi);
        });
      } else {
        fallbackCopy(text, updateUi);
      }
    }

    function copyProxySnippet(btn) {
      var codeEl = document.getElementById('proxy-snippet');
      if (!codeEl) return;
      var text = codeEl.innerText || codeEl.textContent;
      var label = btn.querySelector('.proxy-copy-label') || btn;
      var orig = label.textContent;

      var updateUi = function() {
        label.textContent = 'Copied!';
        btn.classList.add('btn-copied');
        setTimeout(function() {
          label.textContent = orig;
          btn.classList.remove('btn-copied');
        }, 2000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(updateUi).catch(function() {
          fallbackCopy(text, updateUi);
        });
      } else {
        fallbackCopy(text, updateUi);
      }
    }

    /* Agent Modal Handlers */
    function openAgentModal(client) {
      var modal = document.getElementById('cursor-modal');
      if (modal) modal.style.display = 'flex';
      if (client) switchAgentModalTab(client);
    }

    function openCursorModal() {
      openAgentModal('cursor');
    }

    function closeAgentModal() {
      var modal = document.getElementById('cursor-modal');
      if (modal) modal.style.display = 'none';
    }

    function closeCursorModal() {
      closeAgentModal();
    }

    function handleModalBackdropClick(e) {
      if (e.target && e.target.id === 'cursor-modal') {
        closeAgentModal();
      }
    }

    function switchAgentModalTab(client) {
      activeAgentModalTab = client;
      ['claude', 'cursor', 'cline'].forEach(function(c) {
        var tabBtn = document.getElementById('agent-modal-tab-' + c);
        var panel = document.getElementById('agent-modal-panel-' + c);
        var isActive = (c === client);
        if (tabBtn) tabBtn.classList.toggle('active', isActive);
        if (panel) panel.style.display = isActive ? 'block' : 'none';
      });
    }

    function copyAgentModalSnippet(client, btn) {
      var config = clientConfigs[client] || (document.getElementById(client + '-modal-snippet') ? document.getElementById(client + '-modal-snippet').innerText : '');
      if (!config) return;
      var label = btn.querySelector('.copy-label') || btn;
      var orig = label.textContent;

      var updateUi = function() {
        label.textContent = 'Copied to Clipboard!';
        btn.classList.add('btn-copied');
        showAgentToast('Copied ' + (clientNames[client] || client) + ' MCP config!');
        setTimeout(function() {
          label.textContent = orig;
          btn.classList.remove('btn-copied');
        }, 2000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(config).then(updateUi).catch(function() {
          fallbackCopy(config, updateUi);
        });
      } else {
        fallbackCopy(config, updateUi);
      }
    }

    function copyBadgeSnippet(slug, btn) {
      var snippet = '[![AIPages Verified](https://aipages.tech/badge/' + encodeURIComponent(slug) + '.svg)](https://aipages.tech/tools/' + encodeURIComponent(slug) + ')';
      var span = btn.querySelector('.btn-text') || btn.querySelector('span:last-child') || btn;
      var origText = span.textContent;
      var updateUi = function() {
        span.textContent = 'Copied!';
        btn.classList.add('btn-copied');
        showAgentToast('README badge copied to clipboard!');
        setTimeout(function() {
          span.textContent = origText;
          btn.classList.remove('btn-copied');
        }, 2200);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet).then(updateUi).catch(function() {
          fallbackCopy(snippet, updateUi);
        });
      } else {
        fallbackCopy(snippet, updateUi);
      }
    }

    function copyCursorModalSnippet(btn) {
      copyAgentModalSnippet(activeAgentModalTab || 'cursor', btn);
    }

    function copyActiveAgentModalSnippet(btn) {
      copyAgentModalSnippet(activeAgentModalTab || 'cursor', btn);
    }

    /* Playground State & Presets */
    var initialSamplePayload = ${JSON.stringify(requestExample.bodyJson)};
    var currentPlaygroundMode = 'sandbox';

    function setPlaygroundMode(mode) {
      currentPlaygroundMode = mode;
      var btnSandbox = document.getElementById('btn-mode-sandbox');
      var btnProd = document.getElementById('btn-mode-production');
      var hintEl = document.getElementById('playground-mode-hint');
      var execBtn = document.getElementById('btn-execute-playground');
      var execLabel = execBtn ? execBtn.querySelector('.btn-label') : null;

      if (btnSandbox) btnSandbox.classList.toggle('active', mode === 'sandbox');
      if (btnProd) btnProd.classList.toggle('active', mode === 'production');

      if (mode === 'sandbox') {
        if (execLabel) execLabel.textContent = 'Run 0-Friction Test';
        if (hintEl) {
          hintEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> <span><strong>0-Friction Test Mode:</strong> Live engine executes with zero required transaction fee.</span>';
          hintEl.style.color = '#34d399';
        }
      } else {
        if (execLabel) execLabel.textContent = 'Execute Tool (x402)';
        if (hintEl) {
          hintEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg> <span><strong>Base x402 Settlement Mode:</strong> Microtransactions settle in Base USDT via HTTP 402.</span>';
          hintEl.style.color = '#F59E0B';
        }
      }
    }

    function loadPresetPayload(preset) {
      var el = document.getElementById('playground-payload');
      if (!el) return;
      if (preset === 'hackernews') {
        el.value = JSON.stringify({
          url: "https://news.ycombinator.com",
          renderJs: true,
          extractMode: "markdown",
          timeoutMs: 5000
        }, null, 2);
      } else if (preset === 'example') {
        el.value = JSON.stringify({
          url: "https://example.com/data",
          renderJs: true,
          extractMode: "markdown",
          timeoutMs: 5000
        }, null, 2);
      } else if (preset === 'jsonmode') {
        el.value = JSON.stringify({
          url: "https://store.example.com/products",
          renderJs: true,
          extractMode: "json",
          timeoutMs: 8000
        }, null, 2);
      }
    }

    function resetPlaygroundPayload() {
      var el = document.getElementById('playground-payload');
      if (el) el.value = initialSamplePayload;
    }

    function formatPlaygroundPayload() {
      var el = document.getElementById('playground-payload');
      if (!el) return;
      try {
        var parsed = JSON.parse(el.value);
        el.value = JSON.stringify(parsed, null, 2);
      } catch (err) {
        alert('Invalid JSON: ' + (err.message || 'Syntax error'));
      }
    }

    async function executePlaygroundTool(namespace) {
      var btn = document.getElementById('btn-execute-playground');
      var pill = document.getElementById('playground-status-pill');
      var timingEl = document.getElementById('playground-time');
      var respEl = document.getElementById('playground-response');
      var payloadEl = document.getElementById('playground-payload');
      var paymentHeaderEl = document.getElementById('playground-payment-header');

      var rawBody = payloadEl ? payloadEl.value.trim() : '{}';
      var bodyData;
      try {
        bodyData = rawBody ? JSON.parse(rawBody) : {};
      } catch (err) {
        if (respEl) respEl.textContent = '// JSON Parse Error in Request Payload:\\n' + (err.message || 'Syntax error');
        return;
      }

      if (btn) {
        btn.disabled = true;
        var label = btn.querySelector('.btn-label');
        if (label) {
          label.textContent = currentPlaygroundMode === 'sandbox' ? 'Executing 0-Friction Test...' : 'Executing (x402)...';
        }
      }

      if (pill) {
        pill.style.display = 'inline-flex';
        pill.className = 'playground-status-pill status-loading';
        pill.textContent = 'Dispatching...';
      }

      var headers = {
        'Content-Type': 'application/json'
      };

      if (currentPlaygroundMode === 'sandbox') {
        headers['x-playground-test'] = 'true';
        headers['x-agent-id'] = 'browser-playground';
      } else {
        headers['x-agent-id'] = 'browser-agent';
        if (paymentHeaderEl && paymentHeaderEl.value.trim()) {
          headers['x-payment-receipt'] = paymentHeaderEl.value.trim();
          headers['X-Payment'] = paymentHeaderEl.value.trim();
        }
      }

      var startTime = performance.now();

      try {
        var response = await fetch('/tool/' + encodeURIComponent(namespace), {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(bodyData)
        });

        var duration = Math.round(performance.now() - startTime);
        if (timingEl) {
          timingEl.style.display = 'inline-block';
          timingEl.textContent = duration + 'ms';
        }

        var statusText = response.status + ' ' + (response.statusText || '');
        if (pill) {
          if (response.status >= 200 && response.status < 300) {
            pill.textContent = currentPlaygroundMode === 'sandbox' ? '200 OK (0-Friction Test Passed)' : '200 OK (Settled)';
            pill.className = 'playground-status-pill status-200';
          } else if (response.status === 402) {
            pill.textContent = '402 Payment Required';
            pill.className = 'playground-status-pill status-402';
          } else {
            pill.textContent = statusText;
            pill.className = 'playground-status-pill status-err';
          }
        }

        var contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          var data = await response.json();
          if (respEl) respEl.textContent = JSON.stringify(data, null, 2);
        } else {
          var text = await response.text();
          if (respEl) respEl.textContent = text;
        }
      } catch (err) {
        var durationErr = Math.round(performance.now() - startTime);
        if (timingEl) {
          timingEl.style.display = 'inline-block';
          timingEl.textContent = durationErr + 'ms';
        }
        if (pill) {
          pill.textContent = 'Network Error';
          pill.className = 'playground-status-pill status-err';
        }
        if (respEl) {
          respEl.textContent = '// Failed to dispatch request:\\n' + (err.message || 'Network error');
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          var labelReset = btn.querySelector('.btn-label');
          if (labelReset) {
            labelReset.textContent = currentPlaygroundMode === 'sandbox' ? 'Run 0-Friction Test' : 'Execute Tool (x402)';
          }
        }
      }
    }

    function copyPlaygroundResponse(btn) {
      var codeEl = document.getElementById('playground-response');
      if (!codeEl) return;
      var text = codeEl.innerText || codeEl.textContent;
      var orig = btn.textContent;
      var updateUi = function() {
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = orig; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(updateUi).catch(function() { fallbackCopy(text, updateUi); });
      } else {
        fallbackCopy(text, updateUi);
      }
    }
  </script>
  ${renderWebMcpRuntimeScript({ pageType: "tool", tool })}
</body>
</html>`;
}
export function renderNotFoundPage(slug) {
    const escapedSlug = escapeHtml(slug);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Not Found - AIPages</title>
  <style>
    body {
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #060608;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #0A0C12;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      padding: 40px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    }
    h1 {
      font-family: "Space Grotesk", sans-serif;
      font-size: 1.85rem;
      margin-bottom: 12px;
      color: #F59E0B;
    }
    p {
      color: #A1A1AA;
      margin-bottom: 24px;
      font-size: 0.96rem;
    }
    code {
      background: #050507;
      color: #F59E0B;
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
      font-family: "JetBrains Mono", monospace;
      word-break: break-all;
    }
    .btn {
      display: inline-block;
      background: #F59E0B;
      color: #060608;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 999px;
      text-decoration: none;
      transition: background 0.18s ease;
    }
    .btn:hover {
      background: #FFD000;
      color: #060608;
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
//# sourceMappingURL=toolPage.js.map