import {
  SHARED_DESIGN_SYSTEM_CSS,
  renderSharedNavbar,
  renderSharedFooter,
} from "./sharedLayout.js";
import { renderWebMcpRuntimeScript } from "./agentDiscovery.js";

const LEGAL_PAGE_STYLES = `
  ${SHARED_DESIGN_SYSTEM_CSS}

  .legal-hero {
    padding: 72px 0 40px;
    text-align: center;
    max-width: 820px;
    margin: 0 auto;
  }

  .legal-title {
    font-size: clamp(2.2rem, 4vw, 3.25rem);
    font-weight: 800;
    color: #FFFFFF;
    line-height: 1.15;
    margin-bottom: 16px;
  }

  .legal-title span {
    color: var(--primary);
  }

  .legal-subtitle {
    font-size: 1.1rem;
    color: var(--text-muted);
    line-height: 1.7;
  }

  .legal-nav-tabs {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 28px;
  }

  .legal-tab {
    padding: 10px 20px;
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.03);
    color: #D4D4D8;
    text-decoration: none;
    transition: all 0.18s ease;
  }

  .legal-tab:hover {
    border-color: rgba(245, 158, 11, 0.45);
    color: #FFFFFF;
    text-decoration: none;
  }

  .legal-tab.active {
    background: var(--primary);
    border-color: var(--primary-bright);
    color: #060608;
    font-weight: 700;
  }

  .legal-container {
    max-width: 920px;
    margin: 0 auto 96px;
    padding: 0 24px;
  }

  .legal-card {
    background: var(--card-bg);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 20px;
    padding: 44px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
    margin-bottom: 28px;
  }

  .legal-section {
    margin-bottom: 36px;
    padding-bottom: 32px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .legal-section:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .legal-section h2 {
    font-size: 1.45rem;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .legal-section p {
    color: #D4D4D8;
    font-size: 0.98rem;
    line-height: 1.75;
    margin-bottom: 14px;
  }

  .legal-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 14px;
  }

  .legal-list li {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    color: #D4D4D8;
    font-size: 0.95rem;
    line-height: 1.65;
  }

  .legal-list li svg {
    flex-shrink: 0;
    margin-top: 4px;
    color: var(--primary);
  }

  .legal-highlight-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 32px;
  }

  .legal-highlight-box {
    background: var(--card-surface);
    border: 1px solid rgba(245, 158, 11, 0.22);
    border-radius: 16px;
    padding: 24px;
  }

  .legal-highlight-box h3 {
    font-size: 1.1rem;
    color: #FFFFFF;
    margin-bottom: 8px;
  }

  .legal-highlight-box p {
    font-size: 0.88rem;
    color: var(--text-muted);
    line-height: 1.6;
  }

  /* Submit Tool Form */
  .submit-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .form-label {
    font-size: 0.88rem;
    font-weight: 600;
    color: #E4E4E7;
  }

  .form-input,
  .form-select,
  .form-textarea {
    width: 100%;
    background: #050609;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px;
    padding: 13px 16px;
    color: #FFFFFF;
    font-size: 0.94rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .form-textarea {
    font-family: 'JetBrains Mono', monospace;
    min-height: 130px;
    resize: vertical;
  }

  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
  }

  .btn-primary-amber {
    background: var(--primary);
    color: #060608;
    border: 1px solid var(--primary-bright);
    border-radius: 10px;
    padding: 14px 28px;
    font-size: 0.96rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.18s ease;
  }

  .btn-primary-amber:hover {
    background: var(--primary-bright);
  }

  @media (max-width: 768px) {
    .legal-highlight-grid,
    .submit-form-grid {
      grid-template-columns: 1fr;
    }
    .legal-card {
      padding: 28px 20px;
    }
  }
`;

function renderCheckIcon(): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
}

export function renderPrivacyPolicyPage(): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy - AIPages Agent Tool Registry",
    url: "https://aipages.tech/privacy",
    description:
      "Authorized Privacy Policy for AIPages.tech covering zero disk retention for tool execution payloads, pseudonymous Base wallet verification, and GDPR and CCPA data governance.",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - AIPages Agent Tool Registry</title>
  <meta name="description" content="Authorized Privacy Policy for AIPages.tech covering zero disk retention for autonomous agent tool invocations, pseudonymous Base wallet settlement, and GDPR and CCPA compliance.">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>${LEGAL_PAGE_STYLES}</style>
</head>
<body>
  ${renderSharedNavbar("legal", false)}

  <header class="legal-hero container">
    <h1 class="legal-title">Authorized <span>Privacy Policy</span></h1>
    <p class="legal-subtitle">
      How AIPages.tech protects human developer data and autonomous AI agent execution payloads across our discovery index and HTTP 402 invocation gateway.
    </p>
    <div class="legal-nav-tabs">
      <a href="/privacy" class="legal-tab active">Privacy Policy</a>
      <a href="/refund-policy" class="legal-tab">USDT Refund Policy</a>
      <a href="/terms" class="legal-tab">Terms of Service</a>
    </div>
  </header>

  <main class="legal-container">
    <div class="legal-highlight-grid">
      <div class="legal-highlight-box">
        <h3>Zero Payload Storage</h3>
        <p>Tool invocation bodies and responses sent through POST /api/invoke/:namespace are validated in volatile memory and never persisted to disk.</p>
      </div>
      <div class="legal-highlight-box">
        <h3>Pseudonymous Access</h3>
        <p>No personal accounts, passwords, or credit cards are required. Agents authenticate via cryptographic Base Mainnet USDT receipts.</p>
      </div>
      <div class="legal-highlight-box">
        <h3>No Training on Payloads</h3>
        <p>AIPages never sells, shares, or trains foundation models on your proprietary JSON payloads, prompts, or API responses.</p>
      </div>
    </div>

    <div class="legal-card">
      <section class="legal-section">
        <h2>1. Scope and Dual-Audience Commitment</h2>
        <p>
          This Privacy Policy governs both human visitors browsing <strong>https://aipages.tech</strong> and autonomous software agents querying our semantic search endpoints (<code>/search</code>, <code>/api/tools</code>, <code>/llms.txt</code>) or invoking tools through our HTTP 402 execution proxy (<code>/api/invoke/:namespace</code>).
        </p>
      </section>

      <section class="legal-section">
        <h2>2. Ephemeral Processing of Tool Invocation Payloads</h2>
        <p>
          When an AI agent or developer invokes a tool through the AIPages gateway, the request body is inspected in memory solely for JSON Schema compliance (via Ajv) and prompt-injection sanitization.
        </p>
        <ul class="legal-list">
          <li>${renderCheckIcon()} <span><strong>Zero Disk Retention:</strong> Request payloads and upstream tool responses are streamed directly back to the caller and immediately garbage-collected from RAM.</span></li>
          <li>${renderCheckIcon()} <span><strong>Header Redaction:</strong> Sensitive authorization headers and private keys are automatically scrubbed from diagnostic logs.</span></li>
          <li>${renderCheckIcon()} <span><strong>Optional PII Redaction:</strong> Agents can pre-scrub sensitive text using the first-party <code>pii_redactor</code> and <code>schema_sanitizer</code> utilities prior to downstream dispatch.</span></li>
        </ul>
      </section>

      <section class="legal-section">
        <h2>3. On-Chain Telemetry and Replay Cache</h2>
        <p>
          For paid tool executions settled in <strong>USDT on Base Mainnet (Chain ID 8453)</strong>, AIPages records only the public transaction hash, timestamp, target tool namespace, and HTTP status code in our replay-protection ledger to prevent double-spending and verify refund eligibility.
        </p>
      </section>

      <section class="legal-section">
        <h2>4. GDPR, CCPA, and Developer Rights</h2>
        <p>
          Tool developers who list endpoints in the public registry may update or remove their tool manifests and wallet addresses at any time. Because AIPages does not collect personal consumer profiles or tracking cookies, no third-party advertising trackers are ever loaded on our pages.
        </p>
      </section>
    </div>
  </main>

  ${renderSharedFooter()}
  ${renderWebMcpRuntimeScript({ pageType: "legal" })}
</body>
</html>`;
}

export function renderRefundPolicyPage(): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "USDT Refund and Settlement Policy - AIPages Agent Tool Registry",
    url: "https://aipages.tech/refund-policy",
    description:
      "Authorized HTTP 402 USDT Refund and Settlement Policy for AIPages.tech on Base Mainnet. Pay strictly on successful 2xx tool execution with 24-hour automated wallet refunds for verified gateway faults.",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>24-Hour USDT Refund Policy - AIPages Agent Tool Registry</title>
  <meta name="description" content="Authorized HTTP 402 USDT Refund Policy for AIPages.tech. Discovery is 100% free, micro-payments settle on Base Mainnet only on 2xx success, and verified faults are refunded in USDT within 24 hours.">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>${LEGAL_PAGE_STYLES}</style>
</head>
<body>
  ${renderSharedNavbar("legal", false)}

  <header class="legal-hero container">
    <h1 class="legal-title">USDT Settlement &amp; <span>Refund Policy</span></h1>
    <p class="legal-subtitle">
      Transparent, deterministic execution billing for autonomous AI agents and developers using the HTTP 402 protocol on Base Mainnet.
    </p>
    <div class="legal-nav-tabs">
      <a href="/privacy" class="legal-tab">Privacy Policy</a>
      <a href="/refund-policy" class="legal-tab active">USDT Refund Policy</a>
      <a href="/terms" class="legal-tab">Terms of Service</a>
    </div>
  </header>

  <main class="legal-container">
    <div class="legal-highlight-grid">
      <div class="legal-highlight-box">
        <h3>100% Free Discovery</h3>
        <p>Searching the vector registry, reading schemas, and submitting new tools cost 0.00 USDT forever.</p>
      </div>
      <div class="legal-highlight-box">
        <h3>Pay Only on 2xx Success</h3>
        <p>Payment receipts are consumed strictly when the target tool returns a valid 2xx HTTP response.</p>
      </div>
      <div class="legal-highlight-box">
        <h3>24-Hour USDT Refunds</h3>
        <p>Verified gateway faults or corrupted responses receive an automated USDT refund to the originating Base wallet within 24 hours.</p>
      </div>
    </div>

    <div class="legal-card">
      <section class="legal-section">
        <h2>1. Standard USDT Pricing Tiers on Base Mainnet</h2>
        <p>
          AIPages settles micro-payments in <strong>USDT on Base Mainnet (Chain ID 8453)</strong> with zero monthly subscriptions or minimum commitments:
        </p>
        <ul class="legal-list">
          <li>${renderCheckIcon()} <span><strong>Core AUS Utilities (16 Engines):</strong> <code>0.001 USDT</code> per successful invocation.</span></li>
          <li>${renderCheckIcon()} <span><strong>Extended AUS Mesh, Ledger and Motion Engines (24 Engines):</strong> <code>0.005 USDT</code> per successful invocation.</span></li>
          <li>${renderCheckIcon()} <span><strong>Open Agent Frameworks &amp; Discovery Endpoints:</strong> <code>0.00 USDT</code> (Free open-source access).</span></li>
        </ul>
      </section>

      <section class="legal-section">
        <h2>2. Atomic Success-Only Settlement Guarantee</h2>
        <p>
          When an agent includes a Base Mainnet USDT transaction hash in the <code>x-payment-receipt</code> (or <code>X-Payment</code>) header, the AIPages gateway verifies the transfer before dispatching the request.
        </p>
        <ul class="legal-list">
          <li>${renderCheckIcon()} <span><strong>Pre-Execution Schema Validation:</strong> If the agent's request payload fails JSON Schema validation (HTTP 400), the payment hash is not consumed and remains valid for retry.</span></li>
          <li>${renderCheckIcon()} <span><strong>Upstream Timeout or 5xx Protection:</strong> If a tool endpoint times out or returns a <code>5xx</code> error, the transaction hash is unlocked so the agent can retry at zero additional cost.</span></li>
        </ul>
      </section>

      <section class="legal-section">
        <h2>3. Automated 24-Hour USDT Refund Procedure</h2>
        <p>
          If a transaction hash is marked consumed but a gateway fault prevented delivery of a valid response payload, the agent or developer may submit the Base transaction hash and timestamp for automated verification. Verified claims are refunded directly in <strong>USDT</strong> to the originating sender wallet address on Base Mainnet within 24 hours.
        </p>
      </section>
    </div>
  </main>

  ${renderSharedFooter()}
  ${renderWebMcpRuntimeScript({ pageType: "legal" })}
</body>
</html>`;
}

export function renderTermsPage(): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service - AIPages Agent Tool Registry",
    url: "https://aipages.tech/terms",
    description:
      "Authorized Terms of Service for human developers and autonomous AI agents operating on AIPages.tech.",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - AIPages Agent Tool Registry</title>
  <meta name="description" content="Terms of Service governing autonomous AI agent tool discovery, developer tool listings, and HTTP 402 USDT micro-payment invocations on AIPages.tech.">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>${LEGAL_PAGE_STYLES}</style>
</head>
<body>
  ${renderSharedNavbar("legal", false)}

  <header class="legal-hero container">
    <h1 class="legal-title">Terms of <span>Service</span></h1>
    <p class="legal-subtitle">
      Clear operational rules for autonomous AI agents, human developers, and third-party tool providers on the AIPages registry.
    </p>
    <div class="legal-nav-tabs">
      <a href="/privacy" class="legal-tab">Privacy Policy</a>
      <a href="/refund-policy" class="legal-tab">USDT Refund Policy</a>
      <a href="/terms" class="legal-tab active">Terms of Service</a>
    </div>
  </header>

  <main class="legal-container">
    <div class="legal-card">
      <section class="legal-section">
        <h2>1. Authorized Use by Humans and Autonomous Agents</h2>
        <p>
          AIPages grants human developers and autonomous software agents a worldwide, royalty-free license to query our public discovery endpoints (<code>/search</code>, <code>/api/tools</code>, <code>/capabilities</code>, <code>/llms.txt</code>, and <code>/api/feed.json</code>) subject to standard token-bucket rate limits (60 search requests per minute per IP).
        </p>
      </section>

      <section class="legal-section">
        <h2>2. Tool Provider Listing Standards</h2>
        <p>
          Developers submitting tools via <code>POST /api/tools/submit</code> or the <a href="/submit">Submit Tool Portal</a> warrant that their endpoints accurately implement the declared JSON Schema, do not execute malicious code or SSRF attacks, and respect user privacy. AIPages continuously monitors listed endpoints with automated liveness and egress guards.
        </p>
      </section>

      <section class="legal-section">
        <h2>3. Egress Guard and Sandbox Safety</h2>
        <p>
          All invocations routed through AIPages are protected by strict SSRF egress guards blocking private IP ranges, cloud metadata services, and unauthorized system calls. Abuse of the invocation proxy or attempts to bypass rate limits will result in automated IP and wallet throttling.
        </p>
      </section>
    </div>
  </main>

  ${renderSharedFooter()}
  ${renderWebMcpRuntimeScript({ pageType: "legal" })}
</body>
</html>`;
}

export function renderSubmitToolPage(): string {
  const submitJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Submit an Agent Tool - AIPages Agent Tool Registry",
    url: "https://aipages.tech/submit",
    description:
      "Register your MCP server or HTTP API in the AIPages 3072-dimension vector registry for free and earn USDT micro-payments on Base Mainnet.",
    potentialAction: {
      "@type": "RegisterAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://aipages.tech/api/tools/submit",
        httpMethod: "POST",
        encodingType: "application/json",
      },
    },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Register Your AI Agent Tool - AIPages Agent Tool Registry</title>
  <meta name="description" content="Register your MCP server or HTTP API in the AIPages 3072-dimension vector registry for free and earn USDT micro-payments on Base Mainnet.">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <script type="application/ld+json">${JSON.stringify(submitJsonLd)}</script>
  <style>${LEGAL_PAGE_STYLES}</style>
</head>
<body>
  ${renderSharedNavbar("submit", false)}

  <header class="legal-hero container">
    <h1 class="legal-title">List Your Tool in the <span>Agent Registry</span></h1>
    <p class="legal-subtitle">
      Indexing a tool in AIPages is 100% free. Your description is embedded into our 3072-dimension Gemini vector index so autonomous agents can discover and invoke your endpoint immediately.
    </p>
  </header>

  <main class="legal-container">
    <div class="legal-card">
      <form id="submit-tool-form" method="POST" action="/api/tools/submit" toolname="register_agent_tool" tooldescription="Register a new MCP server or HTTP API tool in the AIPages 3072-dimension vector search index for free." data-mcp-action="submit-tool" onsubmit="handleToolSubmit(event)">
        <div class="submit-form-grid">
          <div class="form-group">
            <label class="form-label" for="tool-name">Tool Name (slug)</label>
            <input id="tool-name" name="name" type="text" class="form-input" toolparamdescription="Unique slug or snake_case name of the agent tool (e.g. solana_state_verifier)" placeholder="e.g. solana_state_verifier" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="tool-conn">Protocol / Connection Type</label>
            <select id="tool-conn" name="connectionType" class="form-select" toolparamdescription="Transport protocol used by the tool (http, sse, stdio, websocket)" required>
              <option value="http">HTTP / REST JSON</option>
              <option value="sse">MCP over SSE</option>
              <option value="stdio">MCP over Stdio</option>
              <option value="websocket">WebSocket</option>
            </select>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="tool-desc">Detailed Description (used for 3072-dim semantic vector search)</label>
            <input id="tool-desc" name="description" type="text" class="form-input" toolparamdescription="Detailed natural language description of what the tool does, its inputs, and deterministic outputs" placeholder="Describe what your tool does, its inputs, and deterministic outputs..." required />
          </div>

          <div class="form-group">
            <label class="form-label" for="tool-endpoint">Live Endpoint URL</label>
            <input id="tool-endpoint" name="endpointUrl" type="url" class="form-input" toolparamdescription="Public HTTPS endpoint URL where the tool accepts invocation requests" placeholder="https://api.yourdomain.com/v1/execute" />
          </div>

          <div class="form-group">
            <label class="form-label" for="tool-wallet">Base Mainnet Developer Wallet (for USDT payouts)</label>
            <input id="tool-wallet" name="developerAddress" type="text" class="form-input" toolparamdescription="0x-prefixed 40-hex Base Mainnet wallet address to receive HTTP 402 USDT payouts" placeholder="0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="tool-pricing">Pricing Model</label>
            <select id="tool-pricing" name="pricingModel" class="form-select" toolparamdescription="Pricing tier model (paid via HTTP 402 USDT, free, or freemium)" required>
              <option value="paid">Paid via HTTP 402 (USDT on Base)</option>
              <option value="free">Free Public Utility (0.00 USDT)</option>
              <option value="freemium">Freemium</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="tool-cost">Cost Per Call (USDT)</label>
            <input id="tool-cost" name="costPerCall" type="number" step="0.001" min="0" value="0.001" class="form-input" toolparamdescription="Per-call execution price in USDT on Base Mainnet (0 for free tools)" required />
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="tool-schema">Input JSON Schema</label>
            <textarea id="tool-schema" name="schema" class="form-textarea" toolparamdescription="JSON Schema object describing the expected request body parameters">{
  "type": "object",
  "properties": {
    "payload": { "type": "string", "description": "Input data for processing" }
  },
  "required": ["payload"]
}</textarea>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-top: 12px;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">Listing Fee: <strong style="color: var(--primary-bright);">0.00 USDT (Free)</strong></span>
          <button type="submit" id="submit-btn" class="btn-primary-amber">Register Tool in Vector Index</button>
        </div>

        <div id="submit-result" style="display: none; margin-top: 20px; padding: 16px; border-radius: 12px; font-size: 0.9rem;"></div>
      </form>
    </div>
  </main>

  ${renderSharedFooter()}

  <script>
    async function handleToolSubmit(e) {
      e.preventDefault();
      var btn = document.getElementById('submit-btn');
      var resBox = document.getElementById('submit-result');
      btn.disabled = true;
      btn.textContent = 'Indexing Embedding...';

      var schemaObj = {};
      try {
        schemaObj = JSON.parse(document.getElementById('tool-schema').value);
      } catch (err) {
        resBox.style.display = 'block';
        resBox.style.background = 'rgba(239, 68, 68, 0.14)';
        resBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        resBox.style.color = '#FCA5A5';
        resBox.textContent = 'Invalid JSON Schema syntax. Please check your JSON formatting.';
        btn.disabled = false;
        btn.textContent = 'Register Tool in Vector Index';
        return;
      }

      var payload = {
        name: document.getElementById('tool-name').value.trim(),
        description: document.getElementById('tool-desc').value.trim(),
        connectionType: document.getElementById('tool-conn').value,
        endpointUrl: document.getElementById('tool-endpoint').value.trim() || undefined,
        developerAddress: document.getElementById('tool-wallet').value.trim(),
        pricingModel: document.getElementById('tool-pricing').value,
        costPerCall: Number(document.getElementById('tool-cost').value || 0),
        schema: schemaObj
      };

      try {
        var response = await fetch('/api/tools/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await response.json();
        resBox.style.display = 'block';
        if (response.ok) {
          resBox.style.background = 'rgba(16, 185, 129, 0.12)';
          resBox.style.border = '1px solid rgba(16, 185, 129, 0.35)';
          resBox.style.color = '#6EE7B7';
          resBox.innerHTML = 'Tool indexed! Namespace: <code>' + data.namespace + '</code>. <a href="/tool/' + encodeURIComponent(data.namespace) + '" style="color: #FFD000; font-weight: 700; margin-left: 8px;">View Tool Page &rarr;</a>';
        } else {
          resBox.style.background = 'rgba(239, 68, 68, 0.14)';
          resBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          resBox.style.color = '#FCA5A5';
          resBox.textContent = data.error || 'Submission failed.';
        }
      } catch (err) {
        resBox.style.display = 'block';
        resBox.style.background = 'rgba(239, 68, 68, 0.14)';
        resBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        resBox.style.color = '#FCA5A5';
        resBox.textContent = 'Network error submitting tool.';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Register Tool in Vector Index';
      }
    }
  </script>
  ${renderWebMcpRuntimeScript({ pageType: "submit" })}
</body>
</html>`;
}
