import { escapeHtml } from "../utils.js";
export function renderQuickInstallWidget(tool, example, isTop4) {
    const escapedName = escapeHtml(tool.name);
    const toolServerName = escapeHtml(example.toolServerName);
    const claudeCodeCmd = escapeHtml(example.claudeCodeCmd);
    return `
    <!-- Above-The-Fold Sticky "Copy MCP Config" Quick Install Widget -->
    <section class="mcp-quick-install-widget ${isTop4 ? "primary-mcp-spotlight" : ""}" id="mcp-quick-install" aria-label="1-Click MCP Integration">
      <div class="mcp-widget-header">
        <div class="mcp-widget-title-group">
          <div class="mcp-widget-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            <span>${isTop4 ? "Core AUS &bull; 1-Click MCP Connect" : "1-Click MCP Connect"}</span>
          </div>
          <span class="mcp-widget-subtitle">Integrate <strong>${escapedName}</strong> into Claude Code or Cursor in seconds</span>
        </div>
        <div class="mcp-client-tabs" role="tablist" aria-label="Select Agent Client">
          <button type="button" class="mcp-tab-pill active" id="pill-tab-claudecode" role="tab" aria-selected="true" onclick="switchQuickInstallTab('claudecode')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            <span>Claude Code (CLI)</span>
          </button>
          <button type="button" class="mcp-tab-pill" id="pill-tab-cursor" role="tab" aria-selected="false" onclick="switchQuickInstallTab('cursor')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span>Cursor (.cursor/mcp.json)</span>
          </button>
          <button type="button" class="mcp-tab-pill" id="pill-tab-claude" role="tab" aria-selected="false" onclick="switchQuickInstallTab('claude')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 12a10 10 0 0 0 9.9 10V12z"/></svg>
            <span>Claude Desktop</span>
          </button>
        </div>
      </div>

      <div class="mcp-snippet-display">
        <div class="mcp-code-preview" id="mcp-code-preview-box">
          <span class="mcp-prefix-icon" id="mcp-prefix-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          </span>
          <pre class="mcp-code-text"><code id="mcp-active-snippet-text">${claudeCodeCmd}</code></pre>
        </div>
        <button type="button" class="btn btn-mcp-copy" id="btn-quick-mcp-copy" onclick="copyQuickMcpSnippet(this)" aria-label="Copy MCP Configuration">
          <svg class="copy-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span class="btn-text">Copy Command</span>
        </button>
      </div>

      <div class="mcp-widget-footer">
        <div class="mcp-instruction-hint" id="mcp-instruction-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span id="mcp-hint-text">Run in terminal to register <code>aus-${toolServerName}</code> into Claude Code CLI instantly.</span>
        </div>
        <div class="mcp-widget-links">
          <button type="button" class="link-subtle" onclick="openAgentModal(activeQuickTab === 'cursor' ? 'cursor' : (activeQuickTab === 'claudecode' ? 'claudecode' : 'claude'))">Detailed Guide</button>
          <span class="dot-sep">&bull;</span>
          <a href="#test-console" class="link-subtle">Test in Playground</a>
        </div>
      </div>
    </section>`;
}
export function renderStickyMcpDock(tool, example) {
    const escapedName = escapeHtml(tool.name);
    return `
    <!-- Sticky MCP Floating Dock (Surfaces on Scroll) -->
    <aside class="mcp-sticky-dock" id="mcp-sticky-dock" aria-label="Quick Copy MCP Config Dock">
      <div class="mcp-dock-content">
        <div class="mcp-dock-info">
          <span class="mcp-dock-pulse"></span>
          <div class="mcp-dock-text">
            <span class="mcp-dock-title">${escapedName}</span>
            <span class="mcp-dock-tag">MCP Gateway</span>
          </div>
        </div>
        <div class="mcp-dock-actions">
          <button type="button" class="btn btn-sm btn-dock-client" id="dock-btn-claudecode" onclick="copyDockSnippet('claudecode', this)" title="Copy Claude Code CLI command">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            <span class="btn-text">Copy Claude Code</span>
          </button>
          <button type="button" class="btn btn-sm btn-dock-client btn-dock-cursor" id="dock-btn-cursor" onclick="copyDockSnippet('cursor', this)" title="Copy Cursor .cursor/mcp.json config">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span class="btn-text">Copy Cursor</span>
          </button>
          <button type="button" class="btn btn-sm btn-dock-close" onclick="dismissStickyDock()" aria-label="Dismiss sticky dock" title="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    </aside>`;
}
//# sourceMappingURL=installDock.js.map