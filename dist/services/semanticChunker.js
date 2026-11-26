/**
 * AUS Semantic Chunker Service
 * Engine: semantic-chunker
 *
 * Token-budgeted semantic text and markdown chunking engine for AI agents and RAG pipelines.
 * Preserves sentence boundaries, heading hierarchy, and context windows with configurable overlap.
 */
/**
 * Rough token estimation: ~4 characters per token for English text.
 */
function estimateTokens(text) {
    if (!text)
        return 0;
    return Math.ceil(text.length / 4);
}
/**
 * Split text into semantic sentence fragments.
 */
function splitIntoSentences(text) {
    // Split on sentence terminators while preserving punctuation
    const sentenceRegex = /[^.!?\n]+(?:[.!?]+|\n+|$)/g;
    const matches = text.match(sentenceRegex);
    if (!matches || matches.length === 0) {
        return [text];
    }
    return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}
export async function chunkSemanticText(req) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rawText = (req?.text || "").trim();
    if (!rawText) {
        return {
            success: false,
            utility: "semantic-chunker",
            request_id: requestId,
            total_chunks: 0,
            total_tokens: 0,
            total_chars: 0,
            max_tokens_per_chunk: req?.max_tokens || 500,
            overlap_tokens: req?.overlap_tokens || 50,
            chunks: [],
            execution_time_ms: Date.now() - startTime,
            chunked_at: new Date().toISOString(),
            error: "Missing required 'text' parameter in payload.",
        };
    }
    const maxTokens = Math.max(50, Math.min(req?.max_tokens || 500, 4000));
    const overlapTokens = Math.max(0, Math.min(req?.overlap_tokens || 50, Math.floor(maxTokens / 2)));
    const preserveSentences = req?.preserve_sentences !== false;
    const customMeta = req?.metadata || {};
    const chunks = [];
    let currentChunkSentences = [];
    let currentChunkLength = 0;
    let chunkIndex = 0;
    let currentStartChar = 0;
    const units = preserveSentences ? splitIntoSentences(rawText) : rawText.split(/\s+/);
    for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const unitLength = unit.length;
        const prospectiveLength = currentChunkLength + (currentChunkLength > 0 ? 1 : 0) + unitLength;
        const prospectiveTokens = Math.ceil(prospectiveLength / 4);
        if (prospectiveTokens > maxTokens && currentChunkSentences.length > 0) {
            // Finalize current chunk
            const chunkText = currentChunkSentences.join(preserveSentences ? " " : " ");
            const chunkTokens = estimateTokens(chunkText);
            const endChar = currentStartChar + chunkText.length;
            chunks.push({
                index: chunkIndex++,
                text: chunkText,
                token_count: chunkTokens,
                char_count: chunkText.length,
                start_char: currentStartChar,
                end_char: endChar,
                metadata: {
                    ...customMeta,
                    chunk_index: chunkIndex - 1,
                },
            });
            // Calculate overlap: keep the last N units whose total tokens <= overlapTokens
            let overlapCount = 0;
            let overlapTokensAccum = 0;
            for (let j = currentChunkSentences.length - 1; j >= 0; j--) {
                const itemTokens = estimateTokens(currentChunkSentences[j]);
                if (overlapTokensAccum + itemTokens > overlapTokens)
                    break;
                overlapTokensAccum += itemTokens;
                overlapCount++;
            }
            const keptUnits = currentChunkSentences.slice(currentChunkSentences.length - overlapCount);
            currentChunkSentences = [...keptUnits, unit];
            currentChunkLength = currentChunkSentences.join(" ").length;
            currentStartChar = endChar - keptUnits.join(" ").length;
        }
        else {
            currentChunkSentences.push(unit);
            currentChunkLength = prospectiveLength;
        }
    }
    // Final remaining chunk
    if (currentChunkSentences.length > 0) {
        const chunkText = currentChunkSentences.join(" ");
        const chunkTokens = estimateTokens(chunkText);
        chunks.push({
            index: chunkIndex++,
            text: chunkText,
            token_count: chunkTokens,
            char_count: chunkText.length,
            start_char: currentStartChar,
            end_char: currentStartChar + chunkText.length,
            metadata: {
                ...customMeta,
                chunk_index: chunkIndex - 1,
            },
        });
    }
    const totalTokens = chunks.reduce((acc, c) => acc + c.token_count, 0);
    return {
        success: true,
        utility: "semantic-chunker",
        request_id: requestId,
        total_chunks: chunks.length,
        total_tokens: totalTokens,
        total_chars: rawText.length,
        max_tokens_per_chunk: maxTokens,
        overlap_tokens: overlapTokens,
        chunks,
        execution_time_ms: Date.now() - startTime,
        chunked_at: new Date().toISOString(),
    };
}
//# sourceMappingURL=semanticChunker.js.map