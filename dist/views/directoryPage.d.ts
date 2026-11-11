import { type Tool } from "../types.js";
export declare function classifyToolGroup(tool: Tool): "core" | "mesh" | "framework";
/**
 * Render an individual tool card using the 21st.dev #5115 Pricing Card glass-header architecture
 * while preserving all reliability, freshness, and capability hooks required by the test suite.
 */
export declare function renderToolCard(tool: Tool, baseUrl?: string, activeCapability?: string): string;
export interface DirectoryFilterParams {
    search?: string;
    reliability?: string;
    connectionType?: string;
    pricingModel?: string;
    baseUrl?: string;
    capability?: string;
    availableCapabilities?: string[];
}
export declare function buildFilterUrl(baseUrl: string, params: {
    q?: string;
    reliability?: string;
    connectionType?: string;
    pricingModel?: string;
    capability?: string;
}): string;
export declare function renderDirectoryPage(tools: Tool[], totalCount: number, filters?: DirectoryFilterParams): string;
//# sourceMappingURL=directoryPage.d.ts.map