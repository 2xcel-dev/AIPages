/**
 * Strict validation check for seeded catalog and first-party Agent Utility Services (AUS) tool records.
 *
 * Ensures all required discovery and operational fields are verified before records
 * can be seeded or published, while guaranteeing that unverified health states
 * strictly resolve to "unchecked" (Anti-Falsification Rule).
 */
import { deriveReliability, type Tool, type ConnectionType, type HealthStatus, type ReliabilityIndicator } from "../types.js";

export const NAMESPACE_REGEX = /^[a-z0-9]+(\.[a-z0-9_-]+)+$/;
export const FIRST_PARTY_NAMESPACE_REGEX = /^net\.2xcel\.aus\.[a-z0-9_-]+$/;
export const CANONICAL_AUS_HOST = "aus.2xcel.net";
export const VALID_CONNECTION_TYPES: readonly ConnectionType[] = ["http", "sse", "stdio", "websocket"] as const;
export const VALID_PRICING_MODELS = ["free", "freemium", "paid"] as const;
export const VALID_HEALTH_STATUSES: readonly HealthStatus[] = ["active", "inactive", "unknown"] as const;

export interface ToolValidationOptions {
  isFirstParty?: boolean;
  strictPricing?: boolean;
  requireEndpoint?: boolean;
}

export interface ToolValidationResult {
  valid: boolean;
  namespace?: string;
  errors: string[];
  warnings: string[];
}

export interface CatalogValidationReport {
  valid: boolean;
  totalChecked: number;
  validCount: number;
  invalidCount: number;
  failures: { namespace: string; errors: string[] }[];
}

/**
 * Validate a tool record against core directory standards and first-party guardrails.
 */
export function validateToolRecord(
  raw: unknown,
  options: ToolValidationOptions = {},
): ToolValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== "object") {
    return {
      valid: false,
      errors: ["Tool record must be a non-null object"],
      warnings,
    };
  }

  const tool = raw as Partial<Tool>;
  const namespace = typeof tool.namespace === "string" ? tool.namespace.trim() : "";
  const isFirstParty =
    options.isFirstParty ??
    tool.isFirstParty ??
    tool.developer?.isFirstParty ??
    namespace.startsWith("net.2xcel.aus");

  // 1. Namespace Validation
  if (!namespace) {
    errors.push("Missing required field: namespace");
  } else if (!NAMESPACE_REGEX.test(namespace)) {
    errors.push(`Invalid namespace format "${namespace}". Must match reverse-domain pattern: ${NAMESPACE_REGEX.source}`);
  }

  if (isFirstParty) {
    if (!FIRST_PARTY_NAMESPACE_REGEX.test(namespace)) {
      errors.push(
        `First-party AUS tool namespace "${namespace}" must start with "net.2xcel.aus." and contain valid lower-case identifiers (expected pattern: ${FIRST_PARTY_NAMESPACE_REGEX.source})`,
      );
    }
  }

  // 2. Name Validation
  if (!tool.name || typeof tool.name !== "string" || !tool.name.trim()) {
    errors.push("Missing or empty required field: name");
  } else if (!/^[a-zA-Z0-9_-]+$/.test(tool.name)) {
    errors.push(`Tool name "${tool.name}" contains invalid characters. Use alphanumeric, hyphens, or underscores.`);
  }

  // 3. Description Validation
  if (!tool.description || typeof tool.description !== "string" || tool.description.trim().length < 10) {
    errors.push("Tool description must be a string of at least 10 characters");
  }

  // 4. Connection Type
  if (!tool.connectionType || !VALID_CONNECTION_TYPES.includes(tool.connectionType)) {
    errors.push(
      `Invalid connectionType "${tool.connectionType}". Must be one of: ${VALID_CONNECTION_TYPES.join(", ")}`,
    );
  }

  // 5. Endpoint URL
  const requireEndpoint = options.requireEndpoint ?? (isFirstParty || tool.connectionType === "http" || tool.connectionType === "sse");
  if (requireEndpoint && !tool.endpointUrl) {
    errors.push(`Endpoint URL is required for ${isFirstParty ? "first-party" : tool.connectionType} tool`);
  }

  if (tool.endpointUrl) {
    try {
      const parsedUrl = new URL(tool.endpointUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        errors.push(`Endpoint URL must use HTTP or HTTPS protocol, received "${parsedUrl.protocol}"`);
      }
      if (isFirstParty) {
        if (parsedUrl.protocol !== "https:") {
          errors.push(`First-party AUS endpoint must use HTTPS, received "${tool.endpointUrl}"`);
        }
        if (parsedUrl.hostname !== CANONICAL_AUS_HOST) {
          errors.push(
            `First-party AUS endpoint must reside on canonical host "${CANONICAL_AUS_HOST}", received "${parsedUrl.hostname}"`,
          );
        }
        if (!parsedUrl.pathname.startsWith("/tools/")) {
          errors.push(`First-party AUS endpoint path must start with "/tools/", received "${parsedUrl.pathname}"`);
        }
      }
    } catch {
      errors.push(`Endpoint URL is not a valid absolute URL: "${tool.endpointUrl}"`);
    }
  }

  // 6. Capabilities Validation
  if (isFirstParty || tool.capabilities !== undefined) {
    if (!Array.isArray(tool.capabilities) || tool.capabilities.length === 0) {
      errors.push(
        isFirstParty
          ? "First-party tools must define a non-empty 'capabilities' array of at least 1 capability tag"
          : "Field 'capabilities' must be a non-empty array of strings if provided",
      );
    } else {
      const invalidCaps = tool.capabilities.filter(
        (c) => typeof c !== "string" || !c.trim() || !/^[a-z0-9_-]+$/.test(c.trim()),
      );
      if (invalidCaps.length > 0) {
        errors.push(
          `Invalid capability tags found: ${JSON.stringify(invalidCaps)}. Tags must be non-empty lowercase alphanumeric strings with hyphens/underscores.`,
        );
      }
    }
  }

  // 7. Pricing Validation
  if (!tool.pricing || typeof tool.pricing !== "object") {
    if (isFirstParty) {
      errors.push("First-party tools must specify a valid pricing object");
    }
  } else {
    const { model, costPerCall } = tool.pricing;
    if (!VALID_PRICING_MODELS.includes(model)) {
      errors.push(`Invalid pricing.model "${model}". Must be one of: ${VALID_PRICING_MODELS.join(", ")}`);
    }
    if (typeof costPerCall !== "number" || isNaN(costPerCall) || costPerCall < 0) {
      errors.push(`pricing.costPerCall must be a non-negative number, received "${costPerCall}"`);
    } else {
      if (model === "paid" && costPerCall <= 0) {
        errors.push(`Paid pricing model requires costPerCall > 0, received ${costPerCall}`);
      }
      if (model === "free" && costPerCall !== 0) {
        errors.push(`Free pricing model requires costPerCall === 0, received ${costPerCall}`);
      }
    }
  }

  // 8. Authentication Specification (Mandatory for first-party and paid tools)
  if (isFirstParty || (tool.pricing?.model === "paid" && tool.connectionType === "http")) {
    if (!tool.authentication || typeof tool.authentication !== "string" || !tool.authentication.trim()) {
      errors.push(
        `Authentication specification is required for ${isFirstParty ? "first-party AUS" : "paid"} tool`,
      );
    } else if (isFirstParty) {
      const authLower = tool.authentication.toLowerCase();
      if (!authLower.includes("x402") && !authLower.includes("x-payment-receipt")) {
        warnings.push(
          `First-party AUS tool authentication should explicitly describe x402 payment header (received "${tool.authentication}")`,
        );
      }
    }
  }

  // 9. Rate Limit Specification (Mandatory for first-party tools)
  if (isFirstParty) {
    if (!tool.rateLimit || typeof tool.rateLimit !== "string" || !tool.rateLimit.trim()) {
      errors.push("Rate limit specification (rateLimit) is required for first-party AUS tools");
    }
  }

  // 10. Reliability & Anti-Falsification Rule
  // Health status must be one of the recognized enum values
  if (tool.healthStatus && !VALID_HEALTH_STATUSES.includes(tool.healthStatus)) {
    errors.push(
      `Invalid healthStatus "${tool.healthStatus}". Must be one of: ${VALID_HEALTH_STATUSES.join(", ")}`,
    );
  }

  const lastCheckedDate = tool.lastChecked ?? tool.lastCheckedAt;
  const healthDerived = deriveReliability(tool);

  // Anti-Falsification Rule:
  // If no automated probe has been recorded, reliability MUST be "unchecked".
  // A record CANNOT claim active or high reliability without a lastChecked probe timestamp!
  if (!lastCheckedDate || tool.healthStatus === "unknown") {
    if (healthDerived.reliability !== "unchecked") {
      errors.push(
        `Anti-Falsification violation: tool without recorded probe timestamp must resolve to reliability "unchecked", got "${healthDerived.reliability}"`,
      );
    }
    if (tool.healthStatus === "active") {
      errors.push(
        "Anti-Falsification violation: tool cannot assert healthStatus 'active' without a recorded lastChecked probe timestamp",
      );
    }
  } else {
    // If lastChecked is present, verify date validity
    const timeMs = new Date(lastCheckedDate).getTime();
    if (isNaN(timeMs)) {
      errors.push(`Invalid lastChecked timestamp: "${lastCheckedDate}"`);
    } else if (timeMs > Date.now() + 60000) {
      errors.push(`lastChecked timestamp cannot be in the future: "${lastCheckedDate}"`);
    }

    // If healthStatus is inactive, check that failure reason is noted or formatted
    if (tool.healthStatus === "inactive" && !tool.failureReason) {
      warnings.push("Tool is marked inactive but has no failureReason diagnostic");
    }
  }

  return {
    valid: errors.length === 0,
    namespace: namespace || undefined,
    errors,
    warnings,
  };
}

/**
 * Validate specifically as a first-party tool record.
 */
export function validateFirstPartyToolRecord(
  raw: unknown,
  options: Omit<ToolValidationOptions, "isFirstParty"> = {},
): ToolValidationResult {
  return validateToolRecord(raw, { ...options, isFirstParty: true });
}

/**
 * Assert that all tools in an array pass first-party validation.
 * Throws a descriptive error if any tool fails validation.
 */
export function assertValidFirstPartyTools(tools: Tool[]): void {
  const failures: { namespace: string; errors: string[] }[] = [];

  for (const tool of tools) {
    const res = validateFirstPartyToolRecord(tool);
    if (!res.valid) {
      failures.push({
        namespace: tool.namespace || "unknown",
        errors: res.errors,
      });
    }
  }

  if (failures.length > 0) {
    const details = failures
      .map((f) => `  - [${f.namespace}]:\n    ${f.errors.join("\n    ")}`)
      .join("\n");
    throw new Error(
      `First-party tool validation guardrail failed (${failures.length} invalid tool(s)):\n${details}`,
    );
  }
}

/**
 * Validate an entire catalog of tools and produce a structured summary report.
 */
export function validateCatalog(tools: Tool[]): CatalogValidationReport {
  const failures: { namespace: string; errors: string[] }[] = [];
  let validCount = 0;

  for (const tool of tools) {
    const isFirstParty =
      tool.isFirstParty ??
      tool.developer?.isFirstParty ??
      (tool.namespace && tool.namespace.startsWith("net.2xcel.aus"));
    const res = validateToolRecord(tool, { isFirstParty: Boolean(isFirstParty) });

    if (res.valid) {
      validCount++;
    } else {
      failures.push({
        namespace: tool.namespace || "unnamed_tool",
        errors: res.errors,
      });
    }
  }

  return {
    valid: failures.length === 0,
    totalChecked: tools.length,
    validCount,
    invalidCount: failures.length,
    failures,
  };
}
