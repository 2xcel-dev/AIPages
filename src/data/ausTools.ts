/**
 * Authoritative First-Party Agent Utility Services (AUS) Fleet Definitions.
 *
 * All services are hosted on the canonical gateway: https://aipages.tech
 * Monetized via x402 payment protocol on Base Mainnet.
 * All health statuses are explicitly "unknown" (unverified) until probed by
 * the background health worker, guaranteeing reliability resolves to "unchecked".
 */
import type { Tool } from "../types.js";

export const AUS_DEVELOPER_ADDRESS = "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C";
export const AUS_BASE_URL = "https://aipages.tech";
export const AUS_STANDARD_RATE_LIMIT = "100 requests per 60 seconds per IP";
export const AUS_AUTH_SPEC =
  "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)";
export const AUS_PROTOCOL_DETAILS =
  "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching";

export const CANONICAL_AUS_TOOLS: Omit<Tool, "embedding" | "updatedAt">[] = [
  {
    namespace: "net.2xcel.aus.schema-sanitizer",
    name: "schema_sanitizer",
    description:
      "Agent Utility Service (AUS) Schema Sanitizer: Enterprise-grade input sanitization, XSS/HTML tag stripping, key normalization, and sensitive field masking for structured JSON data.",
    schema: {
      type: "object",
      properties: {
        data: { type: "object", description: "JSON payload to inspect, sanitize, and normalize" },
        rules: {
          type: "object",
          description: "Sanitization options",
          properties: {
            stripHtml: { type: "boolean", default: true, description: "Strip HTML/XSS tags from strings" },
            maskFields: { type: "array", items: { type: "string" }, description: "Keys to redact or mask" },
          },
        },
      },
      required: ["data"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/schema-sanitizer`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["schema-sanitization", "data-cleaning", "json-normalization"],
    pricing: {
      model: "paid",
      costPerCall: 0.1,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.financial-audit",
    name: "financial_audit",
    description:
      "Agent Utility Service (AUS) Financial Audit: Batch transaction ledger reconciliation, volume computation, risk scoring, and anomaly detection for autonomous agent cashflows.",
    schema: {
      type: "object",
      properties: {
        transactions: {
          type: "array",
          description: "Batch of transaction records to reconcile",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              amount: { type: "number" },
              type: { type: "string", enum: ["credit", "debit"] },
              category: { type: "string" },
              risk_score: { type: "number" },
            },
            required: ["id", "amount"],
          },
        },
        threshold: {
          type: "number",
          description: "Flagging threshold ceiling for transaction volume / risk (default: 10000)",
        },
      },
      required: ["transactions"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/financial-audit`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["financial-audit", "ledger-verification", "compliance"],
    pricing: {
      model: "paid",
      costPerCall: 0.2,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.verification-oracle",
    name: "verification_oracle",
    description:
      "Agent Utility Service (AUS) Verification Oracle: Deterministic SHA-256 state attestation, integrity hashing, and cryptographic signature/hash matching.",
    schema: {
      type: "object",
      properties: {
        data: { type: "string", description: "String or object payload to cryptographically attest" },
        expected_hash: { type: "string", description: "Optional expected hex hash to compare against" },
        algorithm: { type: "string", default: "sha256", description: "Cryptographic hash algorithm (default: sha256)" },
      },
      required: ["data"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/verification-oracle`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["verification-oracle", "fact-check", "state-proof"],
    pricing: {
      model: "paid",
      costPerCall: 0.05,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.geospatial-verifier",
    name: "geospatial_verifier",
    description:
      "Agent Utility Service (AUS) Geospatial Verifier: Haversine distance calculation, geofencing boundary verification, and coordinates proximity validation.",
    schema: {
      type: "object",
      properties: {
        origin: {
          type: "object",
          properties: { lat: { type: "number" }, lng: { type: "number" } },
          required: ["lat", "lng"],
          description: "Origin coordinates (lat, lng)",
        },
        destination: {
          type: "object",
          properties: { lat: { type: "number" }, lng: { type: "number" } },
          required: ["lat", "lng"],
          description: "Destination coordinates (lat, lng)",
        },
        max_radius_km: {
          type: "number",
          description: "Optional geofence boundary radius threshold in kilometers",
        },
      },
      required: ["origin", "destination"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/geospatial-verifier`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["geospatial", "coordinate-validation", "boundary-check"],
    pricing: {
      model: "paid",
      costPerCall: 0.08,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.sandbox-execution",
    name: "sandbox_execution",
    description:
      "Agent Utility Service (AUS) Sandbox Execution: Secure, isolated Node.js vm execution sandbox with configurable execution timeouts, strict context isolation, and CPU protection.",
    schema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          maxLength: 5000,
          description: "JavaScript source code to execute inside isolated VM context",
        },
        context_data: { type: "object", description: "Input variables and parameters mapped to sandbox input" },
        timeout_ms: {
          type: "integer",
          maximum: 5000,
          default: 1000,
          description: "Execution timeout ceiling in milliseconds (1000-3000ms enforced)",
        },
      },
      required: ["code"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/sandbox-execution`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["sandbox-execution", "code-eval", "secure-runtime"],
    pricing: {
      model: "paid",
      costPerCall: 0.25,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.claude-reason",
    name: "claude_reason",
    description:
      "Agent Utility Service (AUS) Claude Reason Engine: Deep analytical reasoning, chain-of-thought verification, and multi-step inference powered by Claude Opus 5.",
    schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Analytical prompt or problem query for reasoning engine" },
        system_instruction: { type: "string", description: "System persona or constraints for the inference session" },
      },
      required: ["prompt"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/claude-reason`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["claude-reason", "deep-inference", "logical-analysis"],
    pricing: {
      model: "paid",
      costPerCall: 0.12,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.media-transcoder",
    name: "media_transcoder",
    description:
      "Agent Utility Service (AUS) Media Transcoder: MIME format analysis, byte size verification, payload hashing, and base64/URI media inspection.",
    schema: {
      type: "object",
      properties: {
        data_uri: { type: "string", description: "Data URI string (data:image/...;base64,...)" },
        base64_data: { type: "string", description: "Raw base64 encoded media buffer" },
        mime_type: { type: "string", description: "Expected or fallback MIME type (default: application/octet-stream)" },
        target_format: { type: "string", description: "Target conversion or transcoded format (e.g., webp, png)" },
      },
      required: [],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/media-transcoder`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["media-transcoder", "format-conversion", "asset-optimization"],
    pricing: {
      model: "paid",
      costPerCall: 0.15,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.agentic-audit",
    name: "agentic_audit",
    description:
      "Agent Utility Service (AUS) Agentic Audit: Autonomous agent workflow trace auditing, execution step health scoring, circular action loop detection, and budget limit enforcement.",
    schema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Unique identifier of the autonomous agent being audited" },
        steps: {
          type: "array",
          description: "Array of workflow execution steps",
          items: {
            type: "object",
            properties: {
              step: { type: "integer" },
              action: { type: "string" },
              status: { type: "string" },
              cost: { type: "number" },
              latency_ms: { type: "number" },
            },
            required: ["step", "action"],
          },
        },
        budget_limit: { type: "number", description: "Optional budget ceiling to check cumulative execution cost against" },
      },
      required: ["steps"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/agentic-audit`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["agentic-audit", "behavior-trace", "agent-eval"],
    pricing: {
      model: "paid",
      costPerCall: 0.25,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.parse-markdown",
    name: "parse_markdown",
    description:
      "Agent Utility Service (AUS) Web Extraction: Accepts any URL, strips out ads, cookie banners, and DOM bloat, and returns clean, token-optimized Markdown.",
    schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Target webpage URL to scrape and parse into clean Markdown",
        },
      },
      required: ["url"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/parse-markdown`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["web-scraping", "markdown-extraction", "content-cleaning", "token-optimization"],
    pricing: {
      model: "paid",
      costPerCall: 0.0015,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.serp-intent",
    name: "serp_intent",
    description:
      "Agent Utility Service (AUS) Structured Search Intent API: Classifies search intent (informational, commercial, navigational, transactional), aggregates entity graphs, and normalizes SERP payloads.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query or natural-language topic to evaluate" },
        locale: { type: "string", default: "en-US", description: "Target geographic and language locale" },
        depth: { type: "string", enum: ["brief", "standard", "deep"], default: "standard", description: "Intent extraction analysis depth" },
      },
      required: ["query"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/serp-intent`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["search-engine", "intent-extraction", "json-payload", "entity-aggregation"],
    pricing: {
      model: "paid",
      costPerCall: 0.002,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.rugcheck",
    name: "rugcheck",
    description:
      "Agent Utility Service (AUS) EVM Smart Contract Risk Auditor: Scans EVM contract bytecode and interfaces for honeypots, hidden mint privileges, malicious proxies, and liquidity locks on Base.",
    schema: {
      type: "object",
      properties: {
        contractAddress: { type: "string", description: "EVM contract hex address to audit (e.g. 0x...)" },
        chainId: { type: "integer", default: 8453, description: "EVM chain ID (default: 8453 for Base Mainnet)" },
        checkBytecodeOnly: { type: "boolean", default: false, description: "Skip RPC heuristics and inspect raw bytecode only" },
      },
      required: ["contractAddress"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/rugcheck`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["smart-contract", "security-audit", "base-network", "risk-scoring"],
    pricing: {
      model: "paid",
      costPerCall: 0.003,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.gas-optimizer",
    name: "gas_optimizer",
    description:
      "Agent Utility Service (AUS) Predictive Base Gas Routing: Telemetry analytics, congestion monitoring, and EIP-1559 priority fee prediction for autonomous agent transactions on Base.",
    schema: {
      type: "object",
      properties: {
        urgency: {
          type: "string",
          enum: ["immediate", "standard", "economy"],
          default: "standard",
          description: "Target execution speed and block latency requirement",
        },
        estimatedGasUnits: {
          type: "integer",
          default: 21000,
          description: "Estimated execution gas units for target transaction",
        },
        includeL1DataFee: {
          type: "boolean",
          default: true,
          description: "Include L1 rollup blob fee in total cost calculation",
        },
      },
      required: [],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/gas-optimizer`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["gas-routing", "base-network", "congestion-analysis", "fee-optimization"],
    pricing: {
      model: "paid",
      costPerCall: 0.001,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.sandbox-runner",
    name: "sandbox_runner",
    description:
      "Agent Utility Service (AUS) Secure Micro-VM Code Execution: Isolated multi-runtime micro-VM sandbox supporting Python, TypeScript, and JavaScript with memory bounds, timeouts, and zero-trust sandboxing.",
    schema: {
      type: "object",
      properties: {
        runtime: {
          type: "string",
          enum: ["python", "typescript", "javascript"],
          default: "typescript",
          description: "Target runtime environment",
        },
        code: {
          type: "string",
          description: "Source code to execute inside micro-VM container",
        },
        entrypoint: {
          type: "string",
          description: "Optional function or entry script name",
        },
        timeoutMs: {
          type: "integer",
          default: 2000,
          maximum: 5000,
          description: "Maximum execution time in milliseconds (ceiling 5000ms)",
        },
        memoryLimitMb: {
          type: "integer",
          default: 128,
          description: "Memory allocation ceiling in megabytes",
        },
        allowNetwork: {
          type: "boolean",
          default: false,
          description: "Enable restricted egress network access",
        },
      },
      required: ["code"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/sandbox-runner`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["code-execution", "python-runtime", "typescript", "secure-sandbox"],
    pricing: {
      model: "paid",
      costPerCall: 0.004,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.github-summarizer",
    name: "github_summarizer",
    description:
      "Agent Utility Service (AUS) Repo Health & Diff Analyzer: Analyzes GitHub PR diff patches, repository structural changes, maintenance health scores, and executive summaries for code review agents.",
    schema: {
      type: "object",
      properties: {
        repoUrl: {
          type: "string",
          description: "Target GitHub repository URL (https://github.com/org/repo)",
        },
        diffOrPatch: {
          type: "string",
          description: "Raw git diff or PR unified patch string to analyze",
        },
        pullRequestNumber: {
          type: "integer",
          description: "Optional PR number for automated fetching",
        },
        includeHealthMetrics: {
          type: "boolean",
          default: true,
          description: "Calculate maintenance and CI health scores",
        },
      },
      required: ["repoUrl"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/github-summarizer`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["github-api", "diff-analysis", "codebase-health", "executive-summary"],
    pricing: {
      model: "paid",
      costPerCall: 0.0025,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
  {
    namespace: "net.2xcel.aus.lead-enrich",
    name: "lead_enrich",
    description:
      "Agent Utility Service (AUS) Firmographic Lead Profiler: Extracts company size, revenue tier, tech stack telemetry, headquarters location, and decision-maker profiles from domains.",
    schema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "Target company corporate domain or website URL",
        },
        companyName: {
          type: "string",
          description: "Optional explicit company name",
        },
        includeTechStack: {
          type: "boolean",
          default: true,
          description: "Extract detected infrastructure and application software technologies",
        },
        includeKeyContacts: {
          type: "boolean",
          default: true,
          description: "Include verified executive department leads and LinkedIn profiles",
        },
      },
      required: ["domain"],
    },
    connectionType: "http",
    endpointUrl: `${AUS_BASE_URL}/tool/lead-enrich`,
    healthStatus: "unknown",
    lastChecked: undefined,
    failureReason: null,
    status: "active",
    isFirstParty: true,
    capabilities: ["lead-enrichment", "firmographics", "crm-automation", "contact-intelligence"],
    pricing: {
      model: "paid",
      costPerCall: 0.0035,
    },
    authentication: AUS_AUTH_SPEC,
    rateLimit: AUS_STANDARD_RATE_LIMIT,
    protocolDetails: AUS_PROTOCOL_DETAILS,
    developer: {
      address: AUS_DEVELOPER_ADDRESS,
      listingFeePaid: true,
      listingFeeAmount: 0,
      isFirstParty: true,
      name: "2XceL AUS Fleet",
    },
  },
];
