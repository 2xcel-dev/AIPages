/**
 * Embedding service — Google Gemini embeddings via the @google/genai SDK.
 *
 * Model: gemini-embedding-001 (configurable via GEMINI_EMBEDDING_MODEL env var).
 * Output dimensions: 3072 by default — must match the MongoDB Atlas vector index
 *   definition on the `embedding` field, otherwise $vectorSearch rejects inserts.
 *
 * Uses the official @google/genai SDK (GoogleGenAI + ai.models.embedContent).
 * When GEMINI_API_KEY is set the SDK path is used; when it is absent the module
 * falls back to a deterministic hash-based pseudo-embedding so the whole system
 * can run end-to-end locally without a network call or billing.
 *
 * Callers: src/index.ts (search + dev seed), scripts/seed.ts, scripts/ingest-*.
 */
import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

// ── singleton SDK client (created on first real embedding call) ──────────────

let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: config.geminiApiKey! });
  }
  return _ai;
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Generate a Gemini embedding for `text`.
 *
 * @param text       Text to embed.
 * @param taskType   Optional Gemini `taskType` (e.g. "RETRIEVAL_DOCUMENT").
 *                  When omitted the API uses its default.
 * @returns         Float32 vector of length `EMBEDDING_DIMENSIONS`.
 */
export async function embed(
  text: string,
  taskType?: string,
): Promise<number[]> {
  const apiKey = config.geminiApiKey;
  if (apiKey) {
    const response = await getAI().models.embedContent({
      model: config.geminiEmbeddingModel,
      contents: [{ parts: [{ text }] }],
      config: { taskType },
    });
    // response.embeddings is an array, one entry per input content.
    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error(
        `Gemini embedContent returned an empty embedding for model ${config.geminiEmbeddingModel}`,
      );
    }
    return values;
  }

  // Dev fallback — no API key, no network.
  return pseudoEmbed(text, config.embeddingDimensions);
}

// ── dev fallback ──────────────────────────────────────────────────────────────

/**
 * Deterministic FNV-hash pseudo-embedding. Not semantically meaningful, but
 * stable across restarts — good enough for local dev and integration smoke tests.
 */
function pseudoEmbed(text: string, dims: number): number[] {
  const vec = new Float32Array(dims);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    vec[i % dims] += (hash & 0xffff) / 0xffff - 0.5;
  }
  let norm = 0;
  for (let i = 0; i < dims; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const out: number[] = new Array(dims);
  for (let i = 0; i < dims; i++) out[i] = vec[i] / norm;
  return out;
}

// ── constants ─────────────────────────────────────────────────────────────────

/** Effective embedding dimension (matches MongoDB Atlas vector index). */
export const EMBEDDING_DIMENSIONS = config.embeddingDimensions;
