/**
 * Strict validation check for seeded catalog and first-party Agent Utility Services (AUS) tool records.
 *
 * Ensures all required discovery and operational fields are verified before records
 * can be seeded or published, while guaranteeing that unverified health states
 * strictly resolve to "unchecked" (Anti-Falsification Rule).
 */
import { type Tool, type ConnectionType, type HealthStatus } from "../types.js";
export declare const NAMESPACE_REGEX: RegExp;
export declare const FIRST_PARTY_NAMESPACE_REGEX: RegExp;
export declare const CANONICAL_AUS_HOST = "aipages.tech";
export declare const VALID_CONNECTION_TYPES: readonly ConnectionType[];
export declare const VALID_PRICING_MODELS: readonly ["free", "freemium", "paid"];
export declare const VALID_HEALTH_STATUSES: readonly HealthStatus[];
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
    failures: {
        namespace: string;
        errors: string[];
    }[];
}
/**
 * Validate a tool record against core directory standards and first-party guardrails.
 */
export declare function validateToolRecord(raw: unknown, options?: ToolValidationOptions): ToolValidationResult;
/**
 * Validate specifically as a first-party tool record.
 */
export declare function validateFirstPartyToolRecord(raw: unknown, options?: Omit<ToolValidationOptions, "isFirstParty">): ToolValidationResult;
/**
 * Assert that all tools in an array pass first-party validation.
 * Throws a descriptive error if any tool fails validation.
 */
export declare function assertValidFirstPartyTools(tools: Tool[]): void;
/**
 * Validate an entire catalog of tools and produce a structured summary report.
 */
export declare function validateCatalog(tools: Tool[]): CatalogValidationReport;
//# sourceMappingURL=toolValidator.d.ts.map