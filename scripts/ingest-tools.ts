/**
 * Ingest 10 popular open-source AI agent frameworks into the AIPages tool store.
 *
 * Run:  npm run ingest-tools
 *
 * Each tool is embedded via Gemini (gemini-embedding-001 or gemini-embedding-2)
 * via the @google/genai REST API, or the dev fallback pseudo-embedding.
 * and upserted into the ToolStore by namespace (unique key).
 */
import { createStore } from "../src/db.js";
import { embed } from "../src/embedding.js";
import type { Tool } from "../src/types.js";

const SCRAPED_TOOLS = [
  {
    name: "CrewAI",
    description:
      "Open-source Python framework for orchestrating role-playing, autonomous multi-agent systems. Crews enable collaborative agent teams with defined roles, goals, tools, and tasks; Flows provide event-driven workflow control with state, branching, and routing. Standalone (no LangChain dependency). Supports MCP, A2A, memory, checkpointing, and async execution.",
    capabilities: [
      "Multi-agent role-based orchestration",
      "Event-driven workflow automation (Flows)",
      "Model Context Protocol (MCP) client support",
      "Agent-to-Agent (A2A) collaboration protocol",
      "Memory management and knowledge retention",
      "Checkpointing and workflow replay",
      "Async/await native execution",
      "100+ open-source tool integrations out of the box",
      "Ollama integration for local model runtimes",
      "Structured outputs and human-in-the-loop",
    ],
    repository_url: "https://github.com/crewAIInc/crewAI",
    category: "multi-agent-orchestration",
  },
  {
    name: "Microsoft Agent Framework (AutoGen)",
    description:
      "Open-source SDK from Microsoft that unifies AutoGen's multi-agent orchestration with Semantic Kernel's enterprise readiness. Supports Python, C#/.NET, and Go. Provides graph-based workflows, middleware, hosted agents on Foundry, OpenTelemetry observability, and declarative YAML agents.",
    capabilities: [
      "Multi-agent conversational and group chat patterns",
      "Graph-based workflow orchestration (sequential, concurrent, handoff, Magentic)",
      "Multi-provider LLM support (Azure OpenAI, OpenAI, others)",
      "MCP client integration for tool servers",
      "Middleware system for request/response processing",
      "Checkpointing, streaming, and human-in-the-loop",
      "OpenTelemetry distributed tracing",
      "Declarative YAML agent definitions",
      "Foundry-hosted agent deployment",
      "Cross-language support: Python, C#/.NET, Go",
    ],
    repository_url: "https://github.com/microsoft/agent-framework",
    category: "multi-agent-orchestration",
  },
  {
    name: "LangChain",
    description:
      "Agent engineering platform providing modular primitives for building LLM-powered applications. Core value is breadth: swap model providers with one line, compose chains and agents from modular components, prototype to production without switching frameworks. Includes Deep Agents for planning and subagent delegation.",
    capabilities: [
      "Model provider abstraction (one-line swaps)",
      "Chain and agent composition from modular components",
      "Tool calling and function integration",
      "Deep Agents: planning, subagents, file system access",
      "LangGraph integration for stateful workflows",
      "LangSmith observability, evals, and debugging",
      "Memory and vector store integrations",
      "Streaming and structured output support",
      "Extensive third-party integration ecosystem",
      "LangGraph Cloud deployment",
    ],
    repository_url: "https://github.com/langchain-ai/langchain",
    category: "agent-framework",
  },
  {
    name: "LangGraph",
    description:
      "Graph-based framework for building stateful, multi-actor LLM applications on top of LangChain. Models agent execution as a graph of event handlers where each step emits and receives typed events, enabling nested and parallel agent pipelines. Embeds into Python scripts, notebooks, and REST APIs via Starlette/FastAPI.",
    capabilities: [
      "Stateful multi-actor agent graphs",
      "Event-driven execution model with typed events",
      "Nested and parallel agent pipelines",
      "Conditional branching and routing",
      "Human-in-the-loop interruption and approval",
      "Checkpointing and state persistence",
      "Streaming of agent steps and outputs",
      "FastAPI/Starlette middleware integration",
      "Prebuilt nodes for tools, LLMs, and memory",
      "LangGraph Platform for deployment",
    ],
    repository_url: "https://github.com/langchain-ai/langgraph",
    category: "agent-framework",
  },
  {
    name: "Firecrawl",
    description:
      "Open-source context API for searching, scraping, and interacting with the web at scale. Covers 96% of the web including JS-heavy pages. Returns clean markdown, HTML, screenshots, or structured JSON. Includes search, scrape, crawl, map, batch scrape, and an AI agent for autonomous data gathering. 150K+ GitHub stars.",
    capabilities: [
      "Web search with full page content from results",
      "URL-to-markdown, HTML, screenshot, or JSON scraping",
      "AI-powered agent for autonomous data gathering",
      "Full-site crawling with depth and path control",
      "URL discovery and mapping",
      "Batch scraping of thousands of URLs",
      "JavaScript rendering for SPAs and dynamic content",
      "Media parsing (PDF, DOCX, and more)",
      "Page interaction: click, scroll, write, wait, press",
      "Official MCP server for Cursor, Claude, Windsurf",
    ],
    repository_url: "https://github.com/firecrawl/firecrawl",
    category: "web-scraping",
  },
  {
    name: "Browserbase",
    description:
      "Browser infrastructure platform that makes the web programmable for AI agents. Provides managed Chromium sessions with persistent cookies/localStorage, session recordings for debugging, and Playwright/Puppeteer-compatible APIs. Drops in as a browser provider for agent-browser and other tools.",
    capabilities: [
      "Managed headless Chromium browser sessions",
      "Persistent session state (cookies, localStorage)",
      "Session recordings for agent debugging",
      "Playwright and Puppeteer compatible APIs",
      "Stagehand AI SDK native integration",
      "Proxy management for IP rotation",
      "Browserbase MCP server for agent tool integration",
      "Agent-browser engine provider",
      "Scalable cloud browser infrastructure",
      "Real-browser web automation for agents",
    ],
    repository_url: "https://github.com/browserbase/browserbase",
    category: "browser-automation",
  },
  {
    name: "browser-use",
    description:
      "Open-source Python library that makes websites accessible for AI agents. Provides a high-level Agent abstraction that controls a browser to complete tasks like searching, clicking, form-filling, and extraction. Works with OpenAI, Anthropic, and Browser Use's own optimized model. Converts web UI into structured browser states agents can reason over.",
    capabilities: [
      "AI-powered browser control (click, type, navigate, scroll)",
      "Structured browser state representation for LLMs",
      "Multi-model support: OpenAI, Anthropic, custom",
      "Custom tools, system prompts, and structured output",
      "Rerunnable scripts that adapt to UI changes",
      "Fine-grained browser control and element detection",
      "Async agent execution with history tracing",
      "Respects anti-bot protections and handles dynamic content",
      "Browser use optimized model (bu-2-0-mini-preview)",
      "Open-source, MIT licensed",
    ],
    repository_url: "https://github.com/browser-use/browser-use",
    category: "browser-automation",
  },
  {
    name: "Vercel agent-browser",
    description:
      "Fast native Rust CLI for browser automation designed for AI agents. Issues simple CLI commands (click, fill, navigate, screenshot) that agents can call programmatically. Supports session isolation, state restore/save, CDP 연결, proxy, extensions, and many browser configuration options. Integrates with Browserbase as an engine provider.",
    capabilities: [
      "CLI-driven browser automation for AI agents",
      "Fast native Rust implementation",
      "Isolated browser sessions with state save/restore",
      "Chrome DevTools Protocol (CDP) connection",
      "Screenshot capture with annotation and quality control",
      "Proxy, headers, and custom browser argument support",
      "Extension loading and init script injection",
      "Browserbase engine integration",
      "WebMCP support for local Chrome",
      "Content boundaries for LLM safety",
    ],
    repository_url: "https://github.com/vercel-labs/agent-browser",
    category: "browser-automation",
  },
  {
    name: "any-agent (Open Agent Tools)",
    description:
      "Flexible Python framework for building AI agents compatible with multiple LLM providers. Provider-agnostic implementation enables maximum portability across OpenAI, Anthropic, and other backends. Part of Open Agent Tools, a collection of open-source utilities for AI agent development, trading systems, and developer tooling.",
    capabilities: [
      "Provider-agnostic LLM integration",
      "Multi-turn conversational agent loops",
      "Tool calling and function execution",
      "Token tracking and prompt templating",
      "Agent aliases and command history",
      "CLI chat interface for interactive development",
      "Custom tool registration",
      "Open-source, MIT licensed",
      "Works with any OpenAI-compatible endpoint",
      "Part of broader Open Agent Tools ecosystem",
    ],
    repository_url: "https://github.com/Open-Agent-Tools/any-agent",
    category: "agent-framework",
  },
  {
    name: "Deep Agents (LangChain)",
    description:
      "Batteries-included agent framework from LangChain built on top of LangGraph. Deep Agents can plan complex tasks, spawn subagents for delegation, and use a file system for context management. Designed for multi-step reasoning tasks like research, code analysis, and document synthesis where simple single-pass agents fall short.",
    capabilities: [
      "Multi-step task planning and decomposition",
      "Subagent delegation for parallel work",
      "Built-in file system for context and scratchpad",
      "Context management and truncation strategies",
      "Built on LangGraph for stateful execution",
      "Integrates with LangChain tool ecosystem",
      "Research, code analysis, and document synthesis workflows",
      "Structured output support",
      "Model provider flexibility via LangChain",
      "Prototype to production within LangChain ecosystem",
    ],
    repository_url: "https://github.com/langchain-ai/deepagents",
    category: "agent-framework",
  },
];

function toTool(raw: (typeof SCRAPED_TOOLS)[0], embedding: number[]): Tool {
  // Use owner/repo path as namespace so each tool is unique
  const repoPath = raw.repository_url
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .split("/")
    .slice(-2)
    .join("__");
  const namespace = `scraped.${repoPath.replace(/[^a-z0-9.-]/gi, "_").toLowerCase()}`;

  return {
    namespace,
    name: raw.name,
    description: raw.description,
    schema: {
      type: "object",
      properties: {
        capabilities: { type: "array", items: { type: "string" }, description: "List of tool capabilities" },
        category: { type: "string", description: "Tool category" },
        repository_url: { type: "string", description: "GitHub or project repository URL" },
      },
      required: ["capabilities", "category"],
    },
    connectionType: "http",
    endpointUrl: raw.repository_url,
    embedding,
    healthStatus: "active",
    updatedAt: new Date(),
  };
}

async function main() {
  console.log("Ingesting 10 scraped AI agent tools into the store…");
  const store = await createStore();

  let count = 0;
  for (const raw of SCRAPED_TOOLS) {
    const embedding = await embed(`${raw.name} ${raw.description} ${raw.capabilities.join(" ")}`);
    const tool = toTool(raw, embedding);
    await store.upsert(tool);
    console.log(`  ✓ ${tool.namespace}`);
    count++;
  }

  const total = await store.count();
  console.log(`\nIngested ${count} tools. Total in store: ${total}`);
  await store.close();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
