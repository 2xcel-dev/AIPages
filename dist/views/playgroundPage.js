import { SHARED_DESIGN_SYSTEM_CSS, renderSharedNavbar, renderSharedFooter, renderGoogleAnalyticsHead, } from "./sharedLayout.js";
import { generateSamplePayload } from "./toolPage.js";
import { escapeHtml } from "./utils.js";
export function renderPlaygroundPage(tools, selectedNamespace) {
    const selectedTool = tools.find((t) => t.namespace === selectedNamespace) ||
        tools.find((t) => t.namespace === "net.2xcel.aus.schema-sanitizer") ||
        tools[0];
    const firstPartyTools = tools.filter((t) => t.isFirstParty || t.namespace.startsWith("net.2xcel.aus."));
    const communityTools = tools.filter((t) => !t.isFirstParty && !t.namespace.startsWith("net.2xcel.aus."));
    // Build tool dictionary for dynamic client-side sample payload swapping
    const toolPayloadMap = {};
    for (const t of tools) {
        const sample = generateSamplePayload(t.schema);
        toolPayloadMap[t.namespace] = {
            payload: JSON.stringify(sample, null, 2),
            endpoint: `/tool/${t.namespace}`,
            isX402: t.pricing?.model === "paid" || t.pricing?.model === "freemium",
            name: t.name,
            description: t.description,
        };
    }
    const initialPayload = selectedTool ? (toolPayloadMap[selectedTool.namespace]?.payload || "{}") : "{}";
    const initialIsX402 = selectedTool ? toolPayloadMap[selectedTool.namespace]?.isX402 : true;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
${renderGoogleAnalyticsHead()}
  <title>Interactive Agent Tool Playground | AIPages</title>
  <meta name="description" content="Test and execute 51+ vector-indexed AI agent tools live in your browser. Zero-friction test sandbox and Base Mainnet x402 micropayments.">
  <link rel="canonical" href="https://aipages.tech/playground">
  <style>
    ${SHARED_DESIGN_SYSTEM_CSS}

    .playground-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 20px 60px;
    }

    .pg-header {
      margin-bottom: 28px;
    }

    .pg-title {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 0 0 10px;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pg-title svg {
      color: var(--primary);
    }

    .pg-subtitle {
      font-size: 1.12rem;
      color: var(--text-muted);
      max-width: 820px;
      margin: 0 0 20px;
      line-height: 1.6;
    }

    .pg-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }

    .pg-tool-selector-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 280px;
    }

    .pg-select-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .pg-select {
      background: var(--surface-raised);
      color: #FFFFFF;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 0.95rem;
      font-family: var(--font-mono, monospace);
      width: 100%;
      max-width: 480px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.15s ease;
    }

    .pg-select:focus {
      border-color: var(--primary);
    }

    .pg-mode-toggle {
      display: inline-flex;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      padding: 3px;
    }

    .pg-mode-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 16px;
      font-size: 0.88rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .pg-mode-btn.active {
      background: var(--surface-overlay);
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }

    .pg-mode-btn.active.sandbox {
      color: #34D399;
    }

    .pg-mode-btn.active.prod {
      color: #FBBF24;
    }

    .pg-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .pg-dot-green { background: #10B981; }
    .pg-dot-amber { background: #F59E0B; }

    /* Split-Pane Execution Grid */
    .pg-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 900px) {
      .pg-grid {
        grid-template-columns: 1fr;
      }
    }

    .pg-card {
      background: var(--surface-base);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .pg-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: var(--surface-raised);
      border-bottom: 1px solid var(--border-subtle);
    }

    .pg-card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pg-card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pg-action-btn {
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      color: var(--text-muted);
      padding: 4px 10px;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pg-action-btn:hover {
      background: var(--surface-overlay);
      color: #FFFFFF;
      border-color: var(--border-strong);
    }

    .pg-editor-body {
      padding: 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .pg-textarea {
      width: 100%;
      height: 380px;
      box-sizing: border-box;
      background: #020305;
      color: #E2E8F0;
      font-family: var(--font-mono, monospace);
      font-size: 0.9rem;
      line-height: 1.5;
      padding: 14px;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      resize: vertical;
      outline: none;
    }

    .pg-textarea:focus {
      border-color: var(--primary);
    }

    .pg-auth-section {
      background: rgba(245, 158, 11, 0.05);
      border: 1px dashed rgba(245, 158, 11, 0.25);
      border-radius: 8px;
      padding: 12px 14px;
    }

    .pg-auth-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #FBBF24;
      display: block;
      margin-bottom: 6px;
    }

    .pg-auth-input {
      width: 100%;
      box-sizing: border-box;
      background: #040507;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 8px 12px;
      font-family: var(--font-mono, monospace);
      font-size: 0.85rem;
      color: #FFFFFF;
      outline: none;
    }

    .pg-auth-input:focus {
      border-color: var(--primary);
    }

    .pg-footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 18px;
      background: var(--surface-raised);
      border-top: 1px solid var(--border-subtle);
    }

    .pg-exec-btn {
      background: var(--primary);
      color: #040507;
      border: none;
      border-radius: 8px;
      padding: 10px 22px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
    }

    .pg-exec-btn:hover {
      background: #FBBF24;
      box-shadow: 0 2px 10px rgba(245, 158, 11, 0.35);
    }

    .pg-exec-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .pg-response-box {
      width: 100%;
      height: 480px;
      box-sizing: border-box;
      background: #020305;
      color: #A7F3D0;
      font-family: var(--font-mono, monospace);
      font-size: 0.88rem;
      line-height: 1.5;
      padding: 16px;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      overflow: auto;
      white-space: pre;
    }

    .pg-status-pill {
      font-size: 0.82rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .pg-status-200 { background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .pg-status-402 { background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .pg-status-err { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .pg-status-idle { background: rgba(148, 163, 184, 0.1); color: #94A3B8; border: 1px solid rgba(148, 163, 184, 0.2); }

    .pg-latency {
      font-size: 0.82rem;
      font-family: var(--font-mono, monospace);
      color: var(--text-dim);
    }

    .pg-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
      align-items: center;
    }

    .pg-preset-label {
      font-size: 0.82rem;
      color: var(--text-dim);
      font-weight: 600;
    }

    .pg-preset-pill {
      background: var(--surface-raised);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pg-preset-pill:hover {
      color: #FFFFFF;
      border-color: var(--primary);
    }
  </style>
</head>
<body>
  ${renderSharedNavbar("playground")}

  <main class="playground-container">
    <div class="pg-header">
      <h1 class="pg-title">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Autonomous Tool Sandbox Playground
      </h1>
      <p class="pg-subtitle">
        Execute and test 51+ registered agent tools live directly from your browser. Try in <strong>0-Friction Test Mode (Free)</strong> with simulated executions or test production settlement via <strong>Base Mainnet x402 (USDC)</strong>.
      </p>

      <div class="pg-presets">
        <span class="pg-preset-label">Quick Presets:</span>
        <button type="button" class="pg-preset-pill" onclick="selectToolByNamespace('net.2xcel.aus.schema-sanitizer')">Schema Sanitizer</button>
        <button type="button" class="pg-preset-pill" onclick="selectToolByNamespace('net.2xcel.aus.semantic-chunker')">Semantic Chunker</button>
        <button type="button" class="pg-preset-pill" onclick="selectToolByNamespace('net.2xcel.aus.browser-stealth')">Browser Stealth</button>
        <button type="button" class="pg-preset-pill" onclick="selectToolByNamespace('net.2xcel.aus.sandbox-execution')">Sandbox Execution</button>
        <button type="button" class="pg-preset-pill" onclick="selectToolByNamespace('net.2xcel.aus.financial-audit')">Financial Audit</button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="pg-toolbar">
      <div class="pg-tool-selector-group">
        <label for="pg-tool-select" class="pg-select-label">Select Tool:</label>
        <select id="pg-tool-select" class="pg-select" onchange="handleToolChange(this.value)">
          <optgroup label="First-Party Agent Utility Services (AUS Fleet)">
            ${firstPartyTools
        .map((t) => `<option value="${escapeHtml(t.namespace)}"${t.namespace === selectedTool?.namespace ? " selected" : ""}>${escapeHtml(t.name)} (${escapeHtml(t.namespace)})</option>`)
        .join("\n")}
          </optgroup>
          ${communityTools.length > 0
        ? `<optgroup label="Vector-Indexed Community Tools">
            ${communityTools
            .map((t) => `<option value="${escapeHtml(t.namespace)}"${t.namespace === selectedTool?.namespace ? " selected" : ""}>${escapeHtml(t.name)} (${escapeHtml(t.namespace)})</option>`)
            .join("\n")}
          </optgroup>`
        : ""}
        </select>
      </div>

      <div class="pg-mode-toggle" role="radiogroup" aria-label="Playground Mode">
        <button type="button" id="btn-mode-sandbox" class="pg-mode-btn active sandbox" onclick="setMode('sandbox')">
          <span class="pg-dot pg-dot-green"></span> 0-Friction Test Mode
        </button>
        <button type="button" id="btn-mode-prod" class="pg-mode-btn prod" onclick="setMode('prod')">
          <span class="pg-dot pg-dot-amber"></span> Base x402 Settlement
        </button>
      </div>
    </div>

    <!-- Execution Split-Pane -->
    <div class="pg-grid">
      <!-- Request Panel -->
      <section class="pg-card" aria-label="Request Payload Editor">
        <div class="pg-card-header">
          <div class="pg-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Request Payload (JSON)
          </div>
          <div class="pg-card-actions">
            <button type="button" class="pg-action-btn" onclick="formatPayload()">Format</button>
            <button type="button" class="pg-action-btn" onclick="resetPayload()">Reset</button>
            <button type="button" class="pg-action-btn" onclick="copyCurlSnippet()">Copy cURL</button>
          </div>
        </div>

        <div class="pg-editor-body">
          <textarea id="pg-payload" class="pg-textarea" spellcheck="false" aria-label="JSON Request Payload">${escapeHtml(initialPayload)}</textarea>

          <div id="pg-auth-box" class="pg-auth-section" style="${initialIsX402 ? "display: block;" : "display: none;"}">
            <label for="pg-receipt-input" class="pg-auth-label">
              x-payment-receipt (Base USDC Tx Hash)
            </label>
            <input type="text" id="pg-receipt-input" class="pg-auth-input" placeholder="0x... (leave empty to view 402 challenge directive)" />
          </div>
        </div>

        <div class="pg-footer-bar">
          <span id="pg-endpoint-badge" style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-dim);">
            POST /tool/${escapeHtml(selectedTool?.namespace || "")}
          </span>
          <button type="button" id="btn-execute" class="pg-exec-btn" onclick="executeTool()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span id="btn-execute-text">Run 0-Friction Test</span>
          </button>
        </div>
      </section>

      <!-- Response Panel -->
      <section class="pg-card" aria-label="Response Inspector">
        <div class="pg-card-header">
          <div class="pg-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Live Response Inspector
          </div>
          <div class="pg-card-actions">
            <span id="pg-latency" class="pg-latency">-- ms</span>
            <span id="pg-status" class="pg-status-pill pg-status-idle">Awaiting Execution</span>
            <button type="button" id="btn-copy-response" class="pg-action-btn" onclick="copyResponse()">Copy Output</button>
          </div>
        </div>

        <div class="pg-editor-body">
          <div id="pg-response" class="pg-response-box" aria-live="polite">// Select a tool and click "Run 0-Friction Test" to inspect live response.</div>
        </div>

        <div class="pg-footer-bar">
          <span style="font-size: 0.85rem; color: var(--text-dim);">Settlement: Base Mainnet (Chain ID 8453)</span>
          <span style="font-size: 0.85rem; color: #34D399;">Sandbox Header: x-playground-test: true</span>
        </div>
      </section>
    </div>
  </main>

  ${renderSharedFooter()}

  <script>
    var TOOL_MAP = ${JSON.stringify(toolPayloadMap)};
    var currentMode = 'sandbox';

    function setMode(mode) {
      currentMode = mode;
      var btnSandbox = document.getElementById('btn-mode-sandbox');
      var btnProd = document.getElementById('btn-mode-prod');
      var btnExecText = document.getElementById('btn-execute-text');

      if (mode === 'sandbox') {
        btnSandbox.classList.add('active');
        btnProd.classList.remove('active');
        btnExecText.textContent = 'Run 0-Friction Test';
      } else {
        btnProd.classList.add('active');
        btnSandbox.classList.remove('active');
        btnExecText.textContent = 'Execute (x402 Base)';
      }
    }

    function handleToolChange(namespace) {
      var info = TOOL_MAP[namespace];
      if (!info) return;

      var textarea = document.getElementById('pg-payload');
      if (textarea) textarea.value = info.payload;

      var endpointBadge = document.getElementById('pg-endpoint-badge');
      if (endpointBadge) endpointBadge.textContent = 'POST ' + info.endpoint;

      var authBox = document.getElementById('pg-auth-box');
      if (authBox) {
        authBox.style.display = info.isX402 ? 'block' : 'none';
      }
    }

    function selectToolByNamespace(namespace) {
      var select = document.getElementById('pg-tool-select');
      if (select) {
        select.value = namespace;
        handleToolChange(namespace);
      }
    }

    function resetPayload() {
      var select = document.getElementById('pg-tool-select');
      if (select) handleToolChange(select.value);
    }

    function formatPayload() {
      var textarea = document.getElementById('pg-payload');
      if (!textarea) return;
      try {
        var parsed = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(parsed, null, 2);
      } catch (err) {
        alert('Invalid JSON: ' + (err.message || 'Syntax error'));
      }
    }

    async function executeTool() {
      var select = document.getElementById('pg-tool-select');
      var namespace = select ? select.value : '';
      if (!namespace) return;

      var textarea = document.getElementById('pg-payload');
      var receiptInput = document.getElementById('pg-receipt-input');
      var btn = document.getElementById('btn-execute');
      var btnText = document.getElementById('btn-execute-text');
      var statusPill = document.getElementById('pg-status');
      var latencyEl = document.getElementById('pg-latency');
      var responseBox = document.getElementById('pg-response');

      var rawPayload = textarea ? textarea.value.trim() : '{}';
      var parsedData;
      try {
        parsedData = rawPayload ? JSON.parse(rawPayload) : {};
      } catch (err) {
        if (responseBox) responseBox.textContent = '// JSON Parse Error in Request Payload:\\n' + err.message;
        return;
      }

      var headers = {
        'Content-Type': 'application/json'
      };

      if (currentMode === 'sandbox') {
        headers['x-playground-test'] = 'true';
        headers['x-agent-id'] = 'browser-playground';
      } else {
        headers['x-agent-id'] = 'browser-agent';
        var receipt = receiptInput ? receiptInput.value.trim() : '';
        if (receipt) {
          headers['x-payment-receipt'] = receipt;
          headers['X-Payment'] = receipt;
        }
      }

      if (btn) btn.disabled = true;
      if (btnText) btnText.textContent = 'Executing...';
      var toolSelect = document.getElementById('pg-tool-select');
      var selTool = toolSelect ? toolSelect.value : 'unknown';
      if (window.trackAipagesEvent) {
        window.trackAipagesEvent('sandbox_test_run', { tool: selTool, mode: currentMode });
      }
      if (statusPill) {
        statusPill.className = 'pg-status-pill pg-status-idle';
        statusPill.textContent = 'Dispatching...';
      }

      var startTime = performance.now();

      try {
        var res = await fetch('/tool/' + encodeURIComponent(namespace), {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(parsedData)
        });

        var duration = Math.round(performance.now() - startTime);
        if (latencyEl) latencyEl.textContent = duration + ' ms';

        if (statusPill) {
          if (res.status >= 200 && res.status < 300) {
            statusPill.className = 'pg-status-pill pg-status-200';
            statusPill.textContent = currentMode === 'sandbox' ? '200 OK (0-Friction Test Passed)' : '200 OK (Settled)';
          } else if (res.status === 402) {
            statusPill.className = 'pg-status-pill pg-status-402';
            statusPill.textContent = '402 Payment Required';
          } else {
            statusPill.className = 'pg-status-pill pg-status-err';
            statusPill.textContent = res.status + ' ' + (res.statusText || 'Error');
          }
        }

        var contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          var data = await res.json();
          if (responseBox) responseBox.textContent = JSON.stringify(data, null, 2);
        } else {
          var text = await res.text();
          if (responseBox) responseBox.textContent = text;
        }
      } catch (err) {
        var durationErr = Math.round(performance.now() - startTime);
        if (latencyEl) latencyEl.textContent = durationErr + ' ms';
        if (statusPill) {
          statusPill.className = 'pg-status-pill pg-status-err';
          statusPill.textContent = 'Network Error';
        }
        if (responseBox) responseBox.textContent = '// Failed to dispatch request:\\n' + (err.message || 'Network error');
      } finally {
        if (btn) btn.disabled = false;
        if (btnText) {
          btnText.textContent = currentMode === 'sandbox' ? 'Run 0-Friction Test' : 'Execute (x402 Base)';
        }
      }
    }

    function copyResponse() {
      var box = document.getElementById('pg-response');
      var btn = document.getElementById('btn-copy-response');
      if (!box || !btn) return;
      var text = box.innerText || box.textContent;
      navigator.clipboard.writeText(text).then(function() {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = orig; }, 2000);
      });
    }

    function copyCurlSnippet() {
      var select = document.getElementById('pg-tool-select');
      var namespace = select ? select.value : '';
      var textarea = document.getElementById('pg-payload');
      var payload = textarea ? textarea.value.trim() : '{}';
      var headerFlag = currentMode === 'sandbox' ? '-H "x-playground-test: true" ' : '';

      var curl = 'curl -X POST "https://aipages.tech/tool/' + namespace + '" \\\n' +
        '  -H "Content-Type: application/json" \\\n' +
        '  ' + headerFlag + '-H "x-agent-id: autonomous-agent" \\\n' +
        '  -d \'' + payload.replace(/'/g, "'\\\\''") + '\'';

      navigator.clipboard.writeText(curl).then(function() {
        alert('cURL command copied to clipboard!');
      });
    }
  </script>
</body>
</html>`;
}
//# sourceMappingURL=playgroundPage.js.map