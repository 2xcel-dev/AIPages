/**
 * AUS Semantic Chunker Service
 * Engine: semantic-chunker
 *
 * Token-budgeted semantic text and markdown chunking engine for AI agents and RAG pipelines.
 * Preserves sentence boundaries, heading hierarchy, and context windows with configurable overlap.
 */
export interface SemanticChunkerRequest {
    text: string;
    max_tokens?: number;
    overlap_tokens?: number;
    preserve_sentences?: boolean;
    metadata?: Record<string, unknown>;
}
export interface ChunkItem {
    index: number;
    text: string;
    token_count: number;
    char_count: number;
    start_char: number;
    end_char: number;
    metadata: Record<string, unknown>;
}
export interface SemanticChunkerResult {
    success: boolean;
    utility: "semantic-chunker";
    request_id: string;
    total_chunks: number;
    total_tokens: number;
    total_chars: number;
    max_tokens_per_chunk: number;
    overlap_tokens: number;
    chunks: ChunkItem[];
    execution_time_ms: number;
    chunked_at: string;
    error?: string;
}
export declare function chunkSemanticText(req: SemanticChunkerRequest): Promise<SemanticChunkerResult>;
//# sourceMappingURL=semanticChunker.d.ts.map