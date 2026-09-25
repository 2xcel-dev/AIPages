import { type Tool } from "../types.js";
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
export declare const CAPABILITY_DESCRIPTIONS: Record<string, string>;
/**
 * Aggregate all distinct capabilities across indexed tools with tool counts,
 * descriptions, and direct directory links.
 */
export declare function getCapabilityIndex(tools: Tool[]): CapabilitySummary[];
/**
 * Render responsive HTML view for /capabilities page.
 */
export declare function renderCapabilitiesPage(capabilities: CapabilitySummary[], totalToolsCount: number, baseUrl?: string): string;
//# sourceMappingURL=capabilitiesPage.d.ts.map