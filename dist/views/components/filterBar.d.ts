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
//# sourceMappingURL=filterBar.d.ts.map