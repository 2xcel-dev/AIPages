export interface BrowserStealthRequest {
    url: string;
    renderJs?: boolean;
    extractMode?: "markdown" | "html" | "json";
    timeoutMs?: number;
}
export interface BrowserStealthResult {
    success: boolean;
    utility: "browser-stealth";
    request_id: string;
    url: string;
    title: string;
    content: string;
    token_count: number;
    anti_bot_bypassed: boolean;
    http_status: number;
    execution_time_ms: number;
    extracted_at: string;
    error?: string;
}
export declare function executeBrowserStealth(req: BrowserStealthRequest): Promise<BrowserStealthResult>;
//# sourceMappingURL=browserStealth.d.ts.map