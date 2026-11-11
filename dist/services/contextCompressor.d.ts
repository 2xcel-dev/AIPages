/**
 * AUS Context Compressor Service
 *
 * High-performance semantic token compressor and budget optimizer.
 * Compresses oversized context payloads (massive JSON responses, long web crawls,
 * error logs, or documentation) down to a strict token budget without losing
 * critical entities, code symbols, key-value pairs, or operational facts.
 */
export interface ContextCompressorRequest {
    content: string | Record<string, unknown>;
    budget_tokens?: number;
    format?: "facts" | "markdown" | "json" | "summary";
    preserve_entities?: boolean;
}
export interface ContextCompressorResult {
    success: boolean;
    utility: "context-compressor";
    request_id: string;
    compressed_at: string;
    metrics: {
        original_characters: number;
        original_estimated_tokens: number;
        compressed_characters: number;
        compressed_estimated_tokens: number;
        compression_ratio_pct: number;
        target_budget_tokens: number;
    };
    compressed_content: string | Record<string, unknown>;
    extracted_entities?: string[];
    error?: string;
}
/**
 * Execute context compression against a specified token budget.
 */
export declare function compressContext(req: ContextCompressorRequest): ContextCompressorResult;
//# sourceMappingURL=contextCompressor.d.ts.map