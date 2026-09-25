/**
 * Generate a Gemini embedding for `text`.
 *
 * @param text       Text to embed.
 * @param taskType   Optional Gemini `taskType` (e.g. "RETRIEVAL_DOCUMENT").
 *                  When omitted the API uses its default.
 * @returns         Float32 vector of length `EMBEDDING_DIMENSIONS`.
 */
export declare function embed(text: string, taskType?: string): Promise<number[]>;
/** Effective embedding dimension (matches MongoDB Atlas vector index). */
export declare const EMBEDDING_DIMENSIONS: number;
//# sourceMappingURL=embedding.d.ts.map