/**
 * AUS Context Compressor Service
 *
 * High-performance semantic token compressor and budget optimizer.
 * Compresses oversized context payloads (massive JSON responses, long web crawls,
 * error logs, or documentation) down to a strict token budget without losing
 * critical entities, code symbols, key-value pairs, or operational facts.
 */
/**
 * Fast GPT/LLM token estimation (standard heuristic: ~4 characters per token for English).
 */
function estimateTokens(text) {
    if (!text)
        return 0;
    return Math.ceil(text.length / 4);
}
/**
 * Extract critical named entities, URLs, identifiers, and numbers.
 */
function extractSalientEntities(text) {
    const entities = new Set();
    // URLs
    const urlMatches = text.match(/https?:\/\/[^\s"',;>)]+/gi) || [];
    urlMatches.slice(0, 8).forEach((u) => entities.add(u));
    // Code identifiers, CamelCase, namespaces
    const codeMatches = text.match(/\b[A-Za-z_][A-Za-z0-9_]{3,30}\b/g) || [];
    codeMatches
        .filter((w) => /[A-Z]/.test(w) || w.includes("_"))
        .slice(0, 15)
        .forEach((c) => entities.add(c));
    // Monetary, percentage, and key numeric quantities
    const numMatches = text.match(/(\$\d+[\d,.]*|\b\d+[\d,.]*(?:%|ms|kb|mb|gb|usdc|eth|btc)\b)/gi) || [];
    numMatches.slice(0, 10).forEach((n) => entities.add(n));
    return Array.from(entities);
}
/**
 * Execute context compression against a specified token budget.
 */
export function compressContext(req) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const budgetTokens = Math.max(100, Math.min(req.budget_tokens ?? 1500, 32000));
    const targetChars = budgetTokens * 4;
    const outputFormat = req.format ?? "facts";
    const preserveEntities = req.preserve_entities !== false;
    let rawString = "";
    let isJsonInput = false;
    if (typeof req.content === "object" && req.content !== null) {
        isJsonInput = true;
        rawString = JSON.stringify(req.content, null, 2);
    }
    else if (typeof req.content === "string") {
        rawString = req.content;
    }
    else {
        return {
            success: false,
            utility: "context-compressor",
            request_id: requestId,
            compressed_at: new Date().toISOString(),
            metrics: {
                original_characters: 0,
                original_estimated_tokens: 0,
                compressed_characters: 0,
                compressed_estimated_tokens: 0,
                compression_ratio_pct: 0,
                target_budget_tokens: budgetTokens,
            },
            compressed_content: "",
            error: "Invalid input: 'content' must be a valid text string or JSON object.",
        };
    }
    const origChars = rawString.length;
    const origTokens = estimateTokens(rawString);
    // If already within budget, normalize and return directly
    if (origChars <= targetChars) {
        return {
            success: true,
            utility: "context-compressor",
            request_id: requestId,
            compressed_at: new Date().toISOString(),
            metrics: {
                original_characters: origChars,
                original_estimated_tokens: origTokens,
                compressed_characters: origChars,
                compressed_estimated_tokens: origTokens,
                compression_ratio_pct: 0,
                target_budget_tokens: budgetTokens,
            },
            compressed_content: req.content,
            extracted_entities: preserveEntities ? extractSalientEntities(rawString) : [],
        };
    }
    const salientEntities = preserveEntities ? extractSalientEntities(rawString) : [];
    let resultOutput = "";
    if (isJsonInput && outputFormat === "json") {
        // Compress structured JSON by pruning nulls, deep nested empty blocks, and long redundant strings
        try {
            const parsed = typeof req.content === "object" ? req.content : JSON.parse(rawString);
            const pruneObject = (obj, maxDepth = 4) => {
                if (maxDepth <= 0 || !obj)
                    return "...";
                if (Array.isArray(obj)) {
                    // Cap array elements to top 5 representative items
                    return obj.slice(0, 5).map((item) => pruneObject(item, maxDepth - 1));
                }
                if (typeof obj === "object") {
                    const pruned = {};
                    for (const [k, v] of Object.entries(obj)) {
                        if (v === null || v === undefined || v === "")
                            continue;
                        if (typeof v === "string" && v.length > 250) {
                            pruned[k] = v.substring(0, 240) + "...[truncated]";
                        }
                        else {
                            pruned[k] = pruneObject(v, maxDepth - 1);
                        }
                    }
                    return pruned;
                }
                return obj;
            };
            resultOutput = pruneObject(parsed);
        }
        catch {
            resultOutput = rawString.substring(0, targetChars) + "\n...[truncated to budget]";
        }
    }
    else {
        // Sentence-level factual extraction & ranking
        const sentences = rawString
            .split(/(?<=[.?!])\s+|\n{2,}/)
            .map((s) => s.trim())
            .filter((s) => s.length > 15);
        // Score sentences by information density (numbers, capital words, keywords, entity presence)
        const scoredSentences = sentences.map((sentence, index) => {
            let score = 0;
            if (index === 0 || index === sentences.length - 1)
                score += 3; // First and last sentences often lead/conclude
            if (/\d+/.test(sentence))
                score += 2;
            if (/https?:\/\//.test(sentence))
                score += 3;
            if (/[:=->]/.test(sentence))
                score += 1.5; // Definitions or code
            for (const ent of salientEntities) {
                if (sentence.includes(ent))
                    score += 1;
            }
            return { sentence, score, originalIndex: index };
        });
        // Select top scoring sentences until budget is reached
        scoredSentences.sort((a, b) => b.score - a.score);
        const selected = [];
        let accumulatedChars = 0;
        for (const item of scoredSentences) {
            if (accumulatedChars + item.sentence.length > targetChars)
                continue;
            selected.push(item);
            accumulatedChars += item.sentence.length;
            if (accumulatedChars >= targetChars * 0.95)
                break;
        }
        // Restore chronological narrative order
        selected.sort((a, b) => a.originalIndex - b.originalIndex);
        if (outputFormat === "facts") {
            resultOutput = selected.map((s) => `• ${s.sentence}`).join("\n");
        }
        else {
            resultOutput = selected.map((s) => s.sentence).join(" ");
        }
    }
    const finalString = typeof resultOutput === "string" ? resultOutput : JSON.stringify(resultOutput);
    const compressedChars = finalString.length;
    const compressedTokens = estimateTokens(finalString);
    const compressionRatio = Number((((origChars - compressedChars) / origChars) * 100).toFixed(1));
    return {
        success: true,
        utility: "context-compressor",
        request_id: requestId,
        compressed_at: new Date().toISOString(),
        metrics: {
            original_characters: origChars,
            original_estimated_tokens: origTokens,
            compressed_characters: compressedChars,
            compressed_estimated_tokens: compressedTokens,
            compression_ratio_pct: Math.max(0, compressionRatio),
            target_budget_tokens: budgetTokens,
        },
        compressed_content: resultOutput,
        extracted_entities: salientEntities,
    };
}
//# sourceMappingURL=contextCompressor.js.map